<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// task model
class Task extends Model
{
    use HasFactory;

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

    // reset reminder count if task is rescheduled
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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
