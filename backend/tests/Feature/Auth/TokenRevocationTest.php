<?php

use App\Models\User;
use App\Models\VerificationCode;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('resetting a password revokes every API token', function () {
    $user = User::factory()->create([
        'email' => 'revoke@example.com',
        'password' => 'OldPassword123!',
    ]);

    $user->createToken('one');
    $user->createToken('two');

    expect($user->tokens()->count())->toBe(2);

    $plainCode = '445566';
    VerificationCode::create([
        'email' => $user->email,
        'code_hash' => hash('sha256', $plainCode),
        'purpose' => 'password_reset',
        'expires_at' => now()->addMinutes(15),
        'attempts' => 0,
    ]);

    $this->postJson('/api/v1/auth/reset-password', [
        'email' => $user->email,
        'code' => $plainCode,
        'password' => 'NewPassword123!',
        'password_confirmation' => 'NewPassword123!',
    ])->assertStatus(200);

    expect($user->tokens()->count())->toBe(0);
});

test('changing the password keeps the current token and revokes the others', function () {
    $user = User::factory()->create([
        'password' => 'OldPassword123!',
    ]);

    $currentToken = $user->createToken('current')->plainTextToken;
    $user->createToken('other');

    expect($user->tokens()->count())->toBe(2);

    $this->withHeader('Authorization', 'Bearer '.$currentToken)
        ->patchJson('/api/v1/auth/profile', [
            'current_password' => 'OldPassword123!',
            'new_password' => 'NewPassword123!',
            'new_password_confirmation' => 'NewPassword123!',
        ])
        ->assertStatus(200);

    expect($user->tokens()->count())->toBe(1);
    expect($user->tokens()->first()->name)->toBe('current');
});
