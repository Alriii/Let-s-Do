<?php

namespace App\Mail;

use App\Models\Task;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Str;

/**
 * Email sent to remind a user of an upcoming task or approaching deadline.
 */
class TaskReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param Task $task The task being reminded
     * @param string $type 'upcoming' (start time) or 'deadline' (end time)
     * @param int $reminderNumber Current reminder index (1, 2, 3...)
     * @param int $totalReminders Total reminders scheduled
     * @param int $minutesRemaining Approximate minutes remaining until target time
     * @param string $targetTime Formatted target time string (e.g. "10:30 AM")
     */
    public function __construct(
        public Task $task,
        public string $type = 'upcoming',
        public int $reminderNumber = 1,
        public int $totalReminders = 1,
        public int $minutesRemaining = 30,
        public string $targetTime = ''
    ) {}

    /**
     * Email subject line.
     */
    public function envelope(): Envelope
    {
        $title = Str::limit(Str::squish($this->task->title), 60);
        $timeStr = $this->minutesRemaining > 0 ? "in ~{$this->minutesRemaining}m" : 'soon';
        $countStr = $this->totalReminders > 1 ? " (#{$this->reminderNumber}/{$this->totalReminders})" : '';

        if ($this->type === 'deadline') {
            $subject = "⚠️ Almost Deadline: \"{$title}\" ends {$timeStr}!{$countStr}";
        } else {
            $subject = "⏰ Reminder: Upcoming task \"{$title}\" starts {$timeStr}!{$countStr}";
        }

        return new Envelope(subject: $subject);
    }

    /**
     * Email body with task details and customized messaging.
     */
    public function content(): Content
    {
        $greetingName = e($this->task->user->first_name ?: 'there');
        $title = e($this->task->title);
        $category = e($this->task->category);
        $priority = e($this->task->priority);
        $notes = $this->task->notes ? e($this->task->notes) : null;

        $targetDisplay = $this->targetTime ?: ($this->task->due_time ? date('h:i A', strtotime($this->task->due_time)) : 'today');

        $isDeadline = $this->type === 'deadline';
        $accentColor = $isDeadline ? '#e11d48' : '#4ba86e';
        $badgeBg = $isDeadline ? '#ffe4e6' : '#eaf6ee';
        $badgeText = $isDeadline ? '#9f1239' : '#1e6b37';

        $headline = $isDeadline
            ? '⚠️ Task Deadline Approaching'
            : '⏰ Upcoming Task Reminder';

        $actionVerb = $isDeadline ? 'ends' : 'starts';

        $leadText = $isDeadline
            ? "Your task deadline is almost here. It ends at <strong>{$targetDisplay}</strong> (in ~<strong>{$this->minutesRemaining} minutes</strong>)."
            : "Your next task is coming up! It is scheduled to start at <strong>{$targetDisplay}</strong> (in ~<strong>{$this->minutesRemaining} minutes</strong>).";

        $counterNote = $this->totalReminders > 1
            ? "<p style='margin: 8px 0 0; font-size: 13px; color: #64748b;'>Reminder <strong>{$this->reminderNumber} of {$this->totalReminders}</strong> scheduled before this task {$actionVerb}.</p>"
            : '';

        $notesBlock = $notes
            ? "<div style='margin-top: 12px; padding: 10px 14px; background: #ffffff; border-radius: 6px; font-size: 13px; color: #475569; border-left: 3px solid {$accentColor};'><strong>Notes:</strong> {$notes}</div>"
            : '';

        return new Content(
            htmlString: "
                <div style='font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;'>
                    <div style='display: flex; align-items: center; gap: 8px; margin-bottom: 20px;'>
                        <span style='font-size: 20px; font-weight: 800; color: #1e293b; letter-spacing: -0.02em;'>Let's Do!</span>
                    </div>

                    <div style='background: {$badgeBg}; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;'>
                        <h2 style='margin: 0; color: {$badgeText}; font-size: 17px; font-weight: 700;'>{$headline}</h2>
                    </div>

                    <p style='color: #1e293b; font-size: 15px; margin: 0 0 12px;'>Hey {$greetingName},</p>
                    <p style='color: #475569; font-size: 14px; line-height: 1.5; margin: 0 0 16px;'>{$leadText}</p>

                    <div style='background: #f8fafc; border: 1px solid #e2e8f0; padding: 18px; border-radius: 10px; margin: 16px 0;'>
                        <p style='margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #0f172a;'>{$title}</p>
                        <p style='margin: 0; font-size: 13px; color: #64748b;'>
                            📁 <strong>{$category}</strong> &nbsp;•&nbsp;
                            🔥 <strong>{$priority} Priority</strong> &nbsp;•&nbsp;
                            🕐 <strong>{$targetDisplay}</strong>
                        </p>
                        {$notesBlock}
                        {$counterNote}
                    </div>

                    <div style='margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center;'>
                        <p style='margin: 0; color: #94a3b8; font-size: 12px;'>
                            Sent by Let's Do! Task Manager &bull; Designed to keep you focused and on schedule.
                        </p>
                    </div>
                </div>
            ",
        );
    }
}
