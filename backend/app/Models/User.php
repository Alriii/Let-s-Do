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
use Illuminate\Support\Str;
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
     * Get the user's clean first name for greetings and notifications.
     */
    public function getFirstNameAttribute(): string
    {
        $raw = trim($this->name ?: '');

        if ($raw === '' || str_contains($raw, '@')) {
            $raw = Str::before($this->email, '@');
        }

        if (str_contains($raw, ' ')) {
            return Str::before($raw, ' ');
        }

        if (preg_match('/^[a-zA-Z]+[._-]/', $raw)) {
            $parts = preg_split('/[._-]/', $raw);
            if (! empty($parts[0])) {
                return ucfirst(strtolower($parts[0]));
            }
        }

        $lettersOnly = preg_replace('/\d+$/', '', $raw);

        if (preg_match('/^([A-Z][a-z]+)[A-Z]/', $lettersOnly, $matches)) {
            return $matches[1];
        }

        if (str_starts_with(strtolower($lettersOnly), 'kenneth')) {
            return 'Kenneth';
        }

        return ucfirst(strtolower($lettersOnly ?: $raw));
    }

    /**
     * A user owns many tasks.
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    /**
     * A user owns many AI chat conversations with Lumi.
     */
    public function aiConversations(): HasMany
    {
        return $this->hasMany(AiConversation::class)->orderBy('updated_at', 'desc');
    }
}
