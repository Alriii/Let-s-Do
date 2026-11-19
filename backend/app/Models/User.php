<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

// user model
#[Fillable([
    'name',
    'email',
    'password',
    'theme',
    'task_reminders_enabled',
    'daily_digest_enabled',
    'avatar_path',
    'avatar_data',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'task_reminders_enabled' => 'boolean',
            'daily_digest_enabled' => 'boolean',
        ];
    }

    // get avatar url or base64 data
    public function avatarUrl(): ?string
    {
        if ($this->avatar_data) {
            return $this->avatar_data;
        }

        if (! $this->avatar_path) {
            return null;
        }

        /** @var FilesystemAdapter $disk */
        $disk = Storage::disk('public');

        return $disk->url($this->avatar_path);
    }

    public function getAvatarUrlAttribute(): ?string
    {
        return $this->avatarUrl();
    }

    // get first name for greetings
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

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function aiConversations(): HasMany
    {
        return $this->hasMany(AiConversation::class)->orderBy('updated_at', 'desc');
    }
}
