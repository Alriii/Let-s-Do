<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('preferences can be updated and are returned by the profile endpoint', function () {
    $user = User::factory()->create();

    $this->actingAs($user, 'sanctum')
        ->patchJson('/api/v1/auth/profile', [
            'name' => 'Alex Morgan',
            'theme' => 'dark',
            'task_reminders_enabled' => false,
            'daily_digest_enabled' => false,
        ])
        ->assertStatus(200)
        ->assertJsonPath('user.name', 'Alex Morgan')
        ->assertJsonPath('user.preferences.theme', 'dark')
        ->assertJsonPath('user.preferences.task_reminders_enabled', false)
        ->assertJsonPath('user.preferences.daily_digest_enabled', false);

    $user->refresh();

    expect($user->theme)->toBe('dark');
    expect($user->task_reminders_enabled)->toBeFalse();
    expect($user->daily_digest_enabled)->toBeFalse();

    $this->actingAs($user, 'sanctum')
        ->getJson('/api/v1/auth/me')
        ->assertStatus(200)
        ->assertJsonPath('user.preferences.theme', 'dark')
        ->assertJsonPath('user.preferences.task_reminders_enabled', false);
});

test('changing the email address is rejected', function () {
    $user = User::factory()->create(['email' => 'original@example.com']);

    $this->actingAs($user, 'sanctum')
        ->patchJson('/api/v1/auth/profile', [
            'email' => 'new@example.com',
        ])
        ->assertStatus(422);

    expect($user->fresh()->email)->toBe('original@example.com');
});

test('an unchanged email address is ignored', function () {
    $user = User::factory()->create(['email' => 'same@example.com']);

    $this->actingAs($user, 'sanctum')
        ->patchJson('/api/v1/auth/profile', [
            'name' => 'Same Email',
            'email' => 'same@example.com',
        ])
        ->assertStatus(200)
        ->assertJsonPath('user.name', 'Same Email');
});

test('an avatar can be uploaded and removed', function () {
    Storage::fake('public');

    $user = User::factory()->create();

    $this->actingAs($user, 'sanctum')
        ->postJson('/api/v1/auth/avatar', [
            'avatar' => UploadedFile::fake()->image('avatar.jpg', 200, 200),
        ])
        ->assertStatus(200)
        ->assertJsonPath('user.avatar_url', fn ($url) => is_string($url) && str_contains($url, '/storage/avatars/'));

    $path = $user->fresh()->avatar_path;

    expect($path)->not->toBeNull();
    Storage::disk('public')->assertExists($path);

    $this->actingAs($user, 'sanctum')
        ->deleteJson('/api/v1/auth/avatar')
        ->assertStatus(200)
        ->assertJsonPath('avatar_url', null);

    Storage::disk('public')->assertMissing($path);
    expect($user->fresh()->avatar_path)->toBeNull();
});
