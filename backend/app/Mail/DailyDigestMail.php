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
 * Features personalized Philippine Holiday & productivity advice powered by AI.
 */
class DailyDigestMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  Collection<int, Task>  $todayTasks
     * @param  Collection<int, Task>  $overdueTasks
     * @param  array|null  $aiBriefing
     */
    public function __construct(
        public User $user,
        public Collection $todayTasks,
        public Collection $overdueTasks,
        public int $upcomingCount,
        public ?array $aiBriefing = null,
    ) {}

    /**
     * Email subject line.
     */
    public function envelope(): Envelope
    {
        if ($this->aiBriefing && ! empty($this->aiBriefing['has_holiday'])) {
            $holidayName = e($this->aiBriefing['holiday_name'] ?? 'Holiday');
            return new Envelope(
                subject: "🌴 {$holidayName} Alert & Schedule — Let's Do!",
            );
        }

        return new Envelope(
            subject: "☀️ Your Let's Do! schedule for today",
        );
    }

    /**
     * Email body listing today's tasks, overdue items, AI holiday briefing, and the week ahead.
     */
    public function content(): Content
    {
        $name = e($this->user->first_name ?: 'there');
        $todayRows = $this->renderRows($this->todayTasks);
        $overdueRows = $this->renderRows($this->overdueTasks);

        $aiCard = '';
        if ($this->aiBriefing && ! empty($this->aiBriefing['headline'])) {
            $headline = e($this->aiBriefing['headline']);
            $message = e($this->aiBriefing['message'] ?? '');
            $tag = e($this->aiBriefing['tag'] ?? 'AI SCHEDULE INSIGHT');
            $hasHoliday = ! empty($this->aiBriefing['has_holiday']);

            $bgColor = $hasHoliday ? '#effaf1' : '#f8fafc';
            $borderColor = $hasHoliday ? '#4ba86e' : '#cbd5e1';
            $tagColor = $hasHoliday ? '#1e6b37' : '#475569';

            $aiCard = "
                <div style='background: {$bgColor}; border-left: 4px solid {$borderColor}; border-radius: 8px; padding: 14px 16px; margin: 16px 0 20px;'>
                    <p style='margin: 0; font-size: 11px; font-weight: 800; color: {$tagColor}; text-transform: uppercase; letter-spacing: 0.06em;'>{$tag}</p>
                    <h3 style='margin: 4px 0 6px; font-size: 16px; font-weight: 700; color: #0f172a;'>{$headline}</h3>
                    <p style='margin: 0; font-size: 13.5px; color: #334155; line-height: 1.55;'>{$message}</p>
                </div>
            ";
        }

        $overdueSection = $overdueRows !== ''
            ? "<h3 style='color:#d84747; margin-top:24px; font-size:15px;'>⚠️ Overdue Tasks</h3>
               <table style='width:100%; border-collapse:collapse; margin-bottom:12px;'>{$overdueRows}</table>"
            : '';

        $todaySection = $todayRows !== ''
            ? "<h3 style='color:#277d41; margin-top:20px; font-size:15px;'>📅 Scheduled For Today</h3>
               <table style='width:100%; border-collapse:collapse;'>{$todayRows}</table>"
            : "<p style='color:#6b7280; font-size:13.5px;'>Nothing is scheduled for today. Enjoy the breathing room.</p>";

        $upcomingLine = $this->upcomingCount > 0
            ? "<p style='color:#64748b; font-size:13px; margin-top:16px;'>🗓️ {$this->upcomingCount} more task(s) are coming up in the next 7 days.</p>"
            : '';

        return new Content(
            htmlString: "
                <div style='font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;'>
                    <div style='display: flex; align-items: center; gap: 8px; margin-bottom: 16px;'>
                        <span style='font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;'>Let's Do!</span>
                    </div>

                    <h2 style='color:#0f172a; font-size: 20px; font-weight: 700; margin: 0 0 8px;'>Good morning, {$name}!</h2>
                    <p style='color:#64748b; font-size: 14px; margin: 0 0 16px;'>Here is your personalized schedule briefing for today.</p>

                    {$aiCard}

                    {$overdueSection}
                    {$todaySection}
                    {$upcomingLine}

                    <div style='margin-top: 28px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center;'>
                        <p style='margin: 0; color: #94a3b8; font-size: 12px;'>
                            Sent by Let's Do! Daily Digest &bull; Calibrated for the Philippines.
                        </p>
                    </div>
                </div>
            ",
        );
    }

    /**
     * Render a collection of tasks as escaped table rows.
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
                        <td style='padding:8px 8px; border-bottom:1px solid #f1f5f9; font-size:13.5px; color:#0f172a; font-weight:500;'>{$title}</td>
                        <td style='padding:8px 8px; border-bottom:1px solid #f1f5f9; font-size:12px; color:#64748b;'>{$category}</td>
                        <td style='padding:8px 8px; border-bottom:1px solid #f1f5f9; text-align:right; font-size:12px; font-weight:600; color:#334155;'>{$time}</td>
                    </tr>";
        })->join('');
    }
}
