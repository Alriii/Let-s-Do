<?php

namespace App\Console\Commands;

use App\Mail\DailyDigestMail;
use App\Models\Task;
use App\Models\User;
use App\Services\GeminiService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

// command to send daily morning email digest
class SendDailyDigests extends Command
{
    protected $signature = 'tasks:send-daily-digest';

    protected $description = 'Send morning email digest';

    public function handle(GeminiService $gemini): int
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
            ->chunkById(100, function ($users) use ($today, $tomorrow, $nextWeek, $gemini, &$sent) {
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

                    // Generate AI Holiday & Workload advice
                    $aiBriefing = null;
                    try {
                        $aiBriefing = $gemini->generateHolidayBriefing($user);
                    } catch (\Throwable $e) {
                        // Fall back gracefully if AI service has a hiccup
                    }

                    Mail::to($user->email)->send(
                        new DailyDigestMail($user, $todayTasks, $overdueTasks, $upcomingCount, $aiBriefing)
                    );

                    $sent++;
                }
            });

        $this->info("Daily digest sent to {$sent} user(s).");

        return self::SUCCESS;
    }
}
