<?php

namespace App\Mail;

use App\Models\Task;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;

/**
 * Morning schedule email sent at 08:00 to users who enabled the
 * "Daily Schedule Digest" preference.
 */
class DailyDigestMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  Collection<int, Task>  $todayTasks
     * @param  Collection<int, Task>  $overdueTasks
     */
    public function __construct(
        public User $user,
        public Collection $todayTasks,
        public Collection $overdueTasks,
        public int $upcomingCount,
    ) {}

    /**
     * Email subject line.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "☀️ Your Let's Do! schedule for today",
        );
    }

    /**
     * Email body listing today's tasks, overdue items, and the week ahead.
     */
    public function content(): Content
    {
        $name = e($this->user->first_name ?: 'there');
        $todayRows = $this->renderRows($this->todayTasks);
        $overdueRows = $this->renderRows($this->overdueTasks);

        $overdueSection = $overdueRows !== ''
            ? "<h3 style='color:#d84747; margin-top:24px;'>Overdue</h3>
               <table style='width:100%; border-collapse:collapse;'>{$overdueRows}</table>"
            : '';

        $todaySection = $todayRows !== ''
            ? "<h3 style='color:#277d41; margin-top:24px;'>Today</h3>
               <table style='width:100%; border-collapse:collapse;'>{$todayRows}</table>"
            : "<p style='color:#6b7280;'>Nothing is scheduled for today. Enjoy the breathing room.</p>";

        $upcomingLine = $this->upcomingCount > 0
            ? "<p style='color:#6b7280;'>{$this->upcomingCount} more task(s) are coming up in the next 7 days.</p>"
            : '';

        return new Content(
            htmlString: "
                <div style='font-family: sans-serif; max-width: 560px;'>
                    <h2 style='color:#277d41;'>☀️ Good morning, {$name}!</h2>
                    <p>Here is your schedule for today.</p>
                    {$overdueSection}
                    {$todaySection}
                    {$upcomingLine}
                    <p style='margin-top:24px;'>Open Let's Do! to start your day.</p>
                    <p style='color:#9ca3af; font-size:12px;'>
                        You are receiving this because the Daily Schedule Digest is enabled in your preferences.
                    </p>
                </div>
            ",
        );
    }

    /**
     * Render a collection of tasks as escaped table rows.
     *
     * @param  Collection<int, Task>  $tasks
     */
    protected function renderRows(Collection $tasks): string
    {
        return $tasks->map(function (Task $task): string {
            $title = e($task->title);
            $category = e($task->category);
            $priority = e($task->priority);
            $time = $task->due_time
                ? e(date('h:i A', strtotime($task->due_time)))
                : 'All day';

            return "<tr>
                        <td style='padding:6px 8px; border-bottom:1px solid #eaeeeb;'>{$title}</td>
                        <td style='padding:6px 8px; border-bottom:1px solid #eaeeeb; color:#6b7280;'>{$time}</td>
                        <td style='padding:6px 8px; border-bottom:1px solid #eaeeeb; color:#6b7280;'>{$category}</td>
                        <td style='padding:6px 8px; border-bottom:1px solid #eaeeeb; color:#6b7280;'>{$priority}</td>
                    </tr>";
        })->implode('');
    }
}
