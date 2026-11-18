<?php

namespace App\Console\Commands;

use App\Mail\TaskReminderMail;
use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

/**
 * Artisan command to send reminder emails for tasks due within 30 minutes.
 * Runs every minute via the Laravel scheduler.
 * Uses reminder_sent_at to prevent sending duplicate reminders.
 */
class SendTaskReminders extends Command
{
    /**
     * The console command signature used to call it manually:
     * php artisan tasks:send-reminders
     */
    protected $signature = 'tasks:send-reminders';

    /**
     * Description shown in php artisan list
     */
    protected $description = 'Send reminder emails for tasks due within 30 minutes';

    /**
     * Execute the command.
     */
    public function handle(): int
    {
        $now = now();
        $in30 = now()->addMinutes(30);

        // Find all pending tasks that:
        // 1. Belong to a user who kept task reminders enabled
        // 2. Have a due_time set
        // 3. Are due today
        // 4. Due time is within the next 30 minutes
        // 5. Have NOT already received a reminder email
        $tasks = Task::with('user')
            ->where('status', 'pending')
            ->where('due_date', $now->toDateString())
            ->whereNotNull('due_time')
            ->whereNull('reminder_sent_at')
            ->whereHas('user', fn ($query) => $query->where('task_reminders_enabled', true))
            ->get()
            ->filter(function (Task $task) use ($now, $in30) {
                // Parse the due time combined with the due date
                $dueDateTime = Carbon::parse(
                    $task->due_date->toDateString().' '.$task->due_time
                );

                // Only tasks falling within the next 30-minute window
                return $dueDateTime->between($now, $in30);
            });

        foreach ($tasks as $task) {
            // Send the reminder email to the task owner
            Mail::to($task->user->email)->send(new TaskReminderMail($task));

            // Mark as reminded so we don't send again
            $task->update(['reminder_sent_at' => now()]);

            $this->info("Reminder sent for task #{$task->id}: {$task->title}");
        }

        $this->info("Task reminder check complete. {$tasks->count()} reminder(s) sent.");

        return self::SUCCESS;
    }
}
