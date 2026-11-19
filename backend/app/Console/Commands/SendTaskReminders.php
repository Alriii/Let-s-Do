<?php

namespace App\Console\Commands;

use App\Mail\TaskReminderMail;
use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Artisan command to process and dispatch task reminder emails.
 * Runs every minute via the Laravel scheduler.
 * Supports customizable reminder frequencies (e.g. every 5 minutes),
 * target anchors (start time vs end time / deadline), and multiple alerts.
 */
class SendTaskReminders extends Command
{
    protected $signature = 'tasks:send-reminders';

    protected $description = 'Send automated email reminders for upcoming tasks and impending deadlines';

    public function handle(): int
    {
        $now = now();
        $todayStr = $now->toDateString();

        // 1. Fetch pending tasks due today belonging to users who have reminders enabled
        $tasks = Task::with('user')
            ->where('status', 'pending')
            ->where('due_date', $todayStr)
            ->whereHas('user', fn ($query) => $query->where('task_reminders_enabled', true))
            ->get();

        $sentCount = 0;

        foreach ($tasks as $task) {
            $user = $task->user;
            if (! $user || empty($user->email)) {
                continue;
            }

            // Determine which time anchor to use
            $targetAnchor = $task->reminder_target ?: 'start_time';
            $timeString = null;

            if ($targetAnchor === 'end_time') {
                $timeString = $task->end_time ?: $task->due_time ?: $task->start_time;
                $reminderType = 'deadline';
            } else {
                $timeString = $task->start_time ?: $task->due_time ?: $task->end_time;
                $reminderType = 'upcoming';
            }

            if (! $timeString) {
                continue;
            }

            try {
                $targetDateTime = Carbon::parse($task->due_date->toDateString().' '.$timeString);
            } catch (\Throwable $e) {
                continue;
            }

            // Avoid sending reminders for tasks that are already > 5 minutes in the past
            if ($now->greaterThan($targetDateTime->copy()->addMinutes(5))) {
                continue;
            }

            // Cooldown check: do not send more than once in 45 seconds for the same task
            if ($task->last_reminder_sent_at && $task->last_reminder_sent_at->diffInSeconds($now) < 45) {
                continue;
            }

            if ($task->reminder_enabled) {
                // Customized task reminder flow (e.g. 3 reminders every 5 minutes before task)
                $maxReminders = max(1, (int) ($task->reminder_count ?: 3));
                $intervalMinutes = max(1, (int) ($task->reminder_interval_minutes ?: 5));
                $remindersSent = (int) ($task->reminders_sent ?: 0);

                if ($remindersSent >= $maxReminders) {
                    continue;
                }

                // Threshold: The next reminder should be dispatched when the remaining
                // time until target is <= (maxReminders - remindersSent) * intervalMinutes.
                // e.g. for max=3, interval=5:
                // sent=0 => remaining <= 15 mins (trigger reminder 1)
                // sent=1 => remaining <= 10 mins (trigger reminder 2)
                // sent=2 => remaining <= 5 mins (trigger reminder 3)
                $remainingSlots = $maxReminders - $remindersSent;
                $triggerThresholdMinutes = $remainingSlots * $intervalMinutes;
                $triggerTime = $targetDateTime->copy()->subMinutes($triggerThresholdMinutes);

                if ($now->greaterThanOrEqualTo($triggerTime)) {
                    $nextReminderIndex = $remindersSent + 1;
                    $minutesRemaining = max(1, (int) round($now->diffInMinutes($targetDateTime, false)));
                    $formattedTime = date('h:i A', strtotime($timeString));

                    try {
                        Mail::to($user->email)->send(new TaskReminderMail(
                            task: $task,
                            type: $reminderType,
                            reminderNumber: $nextReminderIndex,
                            totalReminders: $maxReminders,
                            minutesRemaining: $minutesRemaining,
                            targetTime: $formattedTime
                        ));

                        $task->update([
                            'reminders_sent' => $nextReminderIndex,
                            'last_reminder_sent_at' => $now,
                            'reminder_sent_at' => $now,
                        ]);

                        $this->info("Dispatched reminder #{$nextReminderIndex}/{$maxReminders} for task #{$task->id} to {$user->email}");
                        $sentCount++;
                    } catch (\Throwable $e) {
                        Log::error("Failed sending reminder email for task #{$task->id}: ".$e->getMessage());
                    }
                }
            } else {
                // Fallback for tasks where reminder_enabled wasn't explicitly toggled,
                // but user has global reminders enabled: single reminder 30 mins before
                if ($task->reminder_sent_at !== null) {
                    continue;
                }

                $in30 = $now->copy()->addMinutes(30);
                if ($targetDateTime->between($now, $in30)) {
                    $minutesRemaining = max(1, (int) round($now->diffInMinutes($targetDateTime, false)));
                    $formattedTime = date('h:i A', strtotime($timeString));

                    try {
                        Mail::to($user->email)->send(new TaskReminderMail(
                            task: $task,
                            type: $reminderType,
                            reminderNumber: 1,
                            totalReminders: 1,
                            minutesRemaining: $minutesRemaining,
                            targetTime: $formattedTime
                        ));

                        $task->update([
                            'reminders_sent' => 1,
                            'last_reminder_sent_at' => $now,
                            'reminder_sent_at' => $now,
                        ]);

                        $this->info("Dispatched default 30m reminder for task #{$task->id} to {$user->email}");
                        $sentCount++;
                    } catch (\Throwable $e) {
                        Log::error("Failed sending default reminder email for task #{$task->id}: ".$e->getMessage());
                    }
                }
            }
        }

        $this->info("Task reminder check complete. {$sentCount} reminder(s) sent.");

        return self::SUCCESS;
    }
}
