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
 * Email sent to remind a user their task is due in 30 minutes.
 */
class TaskReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Pass in the task to include its details in the email.
     */
    public function __construct(public Task $task) {}

    /**
     * Email subject line.
     */
    public function envelope(): Envelope
    {
        $title = Str::limit(Str::squish($this->task->title), 80);

        return new Envelope(
            subject: "⏰ Reminder: \"{$title}\" is due soon!",
        );
    }

    /**
     * Email body with task details.
     * All user-controlled values are escaped before interpolation.
     */
    public function content(): Content
    {
        $fullName = e($this->task->user->name);
        $firstName = e(Str::before($this->task->user->name, ' '));
        $greetingName = $firstName !== '' ? $firstName : $fullName;
        $title = e($this->task->title);
        $category = e($this->task->category);
        $priority = e($this->task->priority);
        $dueTime = $this->task->due_time
            ? e(date('h:i A', strtotime($this->task->due_time)))
            : 'today';

        return new Content(
            htmlString: "
                <div style='font-family: sans-serif; max-width: 500px;'>
                    <h2 style='color: #4F46E5;'>Let's Do! ⏰ Task Reminder</h2>
                    <p>Hey {$greetingName},</p>
                    <p>Your task is due in <strong>30 minutes</strong>:</p>
                    <div style='background:#f3f4f6; padding:16px; border-radius:8px; margin:16px 0;'>
                        <p style='margin:0; font-size:18px; font-weight:bold;'>{$title}</p>
                        <p style='margin:4px 0; color:#6b7280;'>
                            📂 {$category} &nbsp;|&nbsp;
                            🔥 {$priority} Priority &nbsp;|&nbsp;
                            🕐 Due at {$dueTime}
                        </p>
                    </div>
                    <p>Stay on track! Open Let's Do! to manage your task.</p>
                    <p style='color:#9ca3af; font-size:12px;'>You are receiving this because you have a task due soon.</p>
                </div>
            ",
        );
    }
}
