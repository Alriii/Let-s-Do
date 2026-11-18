<?php

use App\Mail\VerificationCodeMail;
use App\Models\User;
use App\Models\VerificationCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

test('forgot password sends a 6-digit reset code via email', function () {
    Mail::fake();

    User::factory()->create([
        'email' => 'reset@example.com',
    ]);

    $response = $this->postJson('/api/v1/auth/forgot-password', [
        'email' => 'reset@example.com',
    ]);

    $response->assertStatus(200);

    Mail::assertSent(VerificationCodeMail::class, function ($mail) {
        return $mail->hasTo('reset@example.com');
    });

    $this->assertDatabaseHas('verification_codes', [
        'email' => 'reset@example.com',
        'purpose' => 'password_reset',
    ]);
});

test('users can reset password with a valid code', function () {
    $user = User::factory()->create([
        'email' => 'resetuser@example.com',
        'password' => 'OldPassword123!',
    ]);

    $plainCode = '888999';
    VerificationCode::create([
        'email' => 'resetuser@example.com',
        'code_hash' => hash('sha256', $plainCode),
        'purpose' => 'password_reset',
        'expires_at' => now()->addMinutes(15),
        'attempts' => 0,
    ]);

    $response = $this->postJson('/api/v1/auth/reset-password', [
        'email' => 'resetuser@example.com',
        'code' => $plainCode,
        'password' => 'NewSecret123!',
        'password_confirmation' => 'NewSecret123!',
    ]);

    $response->assertStatus(200);

    // Verify password was changed
    $user->refresh();
    $this->assertTrue(Hash::check('NewSecret123!', $user->password));
});
