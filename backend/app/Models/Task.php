<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Task Model
 * Represents a task owned by a user in the Let's Do! application.
 */
class Task extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     * Note: 'user_id', 'status', and 'completed_at' are controlled server-side.
     */
    protected $fillable = [
        'user_id',
        'title',
        'category',
        'due_date',
        'due_time',
        'start_time',
        'end_time',
        'priority',
        'notes',
        'status',
        'cancellation_reason',
        'cancellation_note',
        'cancelled_at',
        'completed_at',
        'reminder_sent_at',
        'reminder_enabled',
        'reminder_target',
        'reminder_interval_minutes',
        'reminder_count',
        'reminders_sent',
        'last_reminder_sent_at',
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'due_date' => 'date:Y-m-d',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'reminder_sent_at' => 'datetime',
            'reminder_enabled' => 'boolean',
            'reminder_interval_minutes' => 'integer',
            'reminder_count' => 'integer',
            'reminders_sent' => 'integer',
            'last_reminder_sent_at' => 'datetime',
        ];
    }

    /**
     * Reset the reminder state whenever a task is rescheduled or reminder settings change.
     */
    protected static function booted(): void
    {
        static::updating(function (Task $task): void {
            $rescheduledFields = [
                'due_date',
                'due_time',
                'start_time',
                'end_time',
                'reminder_target',
                'reminder_interval_minutes',
                'reminder_count',
                'reminder_enabled',
            ];

            if ($task->isDirty($rescheduledFields) && ! $task->isDirty('reminders_sent')) {
                $task->reminders_sent = 0;
                $task->last_reminder_sent_at = null;
                $task->reminder_sent_at = null;
            }
        });
    }

    /**
     * Every task belongs to exactly one user.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
