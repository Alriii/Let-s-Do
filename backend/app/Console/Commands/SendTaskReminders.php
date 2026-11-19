<?php

namespace App\Console\Commands;

use App\Mail\TaskReminderMail;
use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

// command to send task reminders
class SendTaskReminders extends Command
{
    protected $signature = 'tasks:send-reminders';

    protected $description = 'Send email reminders for tasks';

    public function handle(): int
    {
        $now = now();
        $todayStr = $now->toDateString();

        // get pending tasks for today with reminders turned on
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

            // check start or end time anchor
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

            // skip past tasks
            if ($now->greaterThan($targetDateTime->copy()->addMinutes(5))) {
                continue;
            }

            // cooldown 45s
            if ($task->last_reminder_sent_at && $task->last_reminder_sent_at->diffInSeconds($now) < 45) {
                continue;
            }

            if ($task->reminder_enabled) {
                $maxReminders = max(1, (int) ($task->reminder_count ?: 3));
                $intervalMinutes = max(1, (int) ($task->reminder_interval_minutes ?: 5));
                $remindersSent = (int) ($task->reminders_sent ?: 0);

                if ($remindersSent >= $maxReminders) {
                    continue;
                }

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
