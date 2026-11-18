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
        'priority',
        'notes',
        'status',
        'cancellation_reason',
        'completed_at',
        'reminder_sent_at',
    ];

    /**
     * The attributes that should be cast to native types.
     */
    protected function casts(): array
    {
        return [
            'due_date' => 'date:Y-m-d',
            'completed_at' => 'datetime',
            'reminder_sent_at' => 'datetime',
        ];
    }

    /**
     * Every task belongs to exactly one user.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
