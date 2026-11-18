<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;

/**
 * User Model
 * Represents a registered user in Let's Do!
 */
#[Fillable([
    'name',
    'email',
    'password',
    'theme',
    'task_reminders_enabled',
    'daily_digest_enabled',
    'avatar_path',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'task_reminders_enabled' => 'boolean',
            'daily_digest_enabled' => 'boolean',
        ];
    }

    /**
     * Public URL for the user's uploaded avatar, if one exists.
     */
    public function avatarUrl(): ?string
    {
        return $this->avatar_path
            ? Storage::disk('public')->url($this->avatar_path)
            : null;
    }

    /**
     * A user owns many tasks.
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }
}
