<?php

namespace App\Console\Commands;

use App\Mail\DailyDigestMail;
use App\Models\Task;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

/**
 * Sends the "Daily Schedule Digest" email at 08:00 to every user who
 * enabled the preference in the Figma Preferences screen.
 */
class SendDailyDigests extends Command
{
    protected $signature = 'tasks:send-daily-digest';

    protected $description = 'Send the morning schedule digest to opted-in users';

    public function handle(): int
    {
        $today = now()->toDateString();
        $tomorrow = now()->addDay()->toDateString();
        $nextWeek = now()->addDays(7)->toDateString();
        $sent = 0;

        User::query()
            ->where('daily_digest_enabled', true)
            ->whereHas('tasks', function ($query) use ($today) {
                $query->where('status', 'pending')->where('due_date', '<=', $today);
            })
            ->with(['tasks' => function ($query) use ($today) {
                $query->where('status', 'pending')
                    ->where('due_date', '<=', $today)
                    ->orderBy('due_date')
                    ->orderBy('due_time');
            }])
            ->chunkById(100, function ($users) use ($today, $tomorrow, $nextWeek, &$sent) {
                foreach ($users as $user) {
                    $todayTasks = $user->tasks
                        ->filter(fn (Task $task) => $task->due_date->toDateString() === $today)
                        ->values();

                    $overdueTasks = $user->tasks
                        ->filter(fn (Task $task) => $task->due_date->toDateString() < $today)
                        ->values();

                    $upcomingCount = $user->tasks()
                        ->where('status', 'pending')
                        ->whereBetween('due_date', [$tomorrow, $nextWeek])
                        ->count();

                    Mail::to($user->email)->send(
                        new DailyDigestMail($user, $todayTasks, $overdueTasks, $upcomingCount)
                    );

                    $sent++;
                }
            });

        $this->info("Daily digest sent to {$sent} user(s).");

        return self::SUCCESS;
    }
}
