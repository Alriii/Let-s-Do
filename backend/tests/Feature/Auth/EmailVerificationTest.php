<?php

use App\Mail\VerificationCodeMail;
use App\Models\User;
use App\Models\VerificationCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

test('a verification code email is sent upon registration', function () {
    // 1. Intercept outgoing mail so we don't send real emails during testing
    Mail::fake();

    // 2. Submit valid registration request
    $this->postJson('/api/v1/auth/register', [
        'name' => 'Alice Test',
        'email' => 'alice@example.com',
        'password' => 'SecurePass123!',
        'password_confirmation' => 'SecurePass123!',
    ])->assertStatus(201);

    // 3. Verify an email was queued/sent to alice@example.com
    Mail::assertSent(VerificationCodeMail::class, function ($mail) {
        return $mail->hasTo('alice@example.com');
    });

    // 4. Verify a verification code hash was created in the database
    $this->assertDatabaseHas('verification_codes', [
        'email' => 'alice@example.com',
        'purpose' => 'email_verification',
    ]);
});

test('users can successfully verify their email with a correct code', function () {
    // 1. Create an unverified user
    $user = User::factory()->create([
        'email' => 'bob@example.com',
        'email_verified_at' => null,
    ]);

    // 2. Insert a valid 6-digit code record
    $plainCode = '123456';
    VerificationCode::create([
        'email' => 'bob@example.com',
        'code_hash' => hash('sha256', $plainCode),
        'purpose' => 'email_verification',
        'expires_at' => now()->addMinutes(15),
        'attempts' => 0,
    ]);

    // 3. Submit code to verify endpoint
    $response = $this->postJson('/api/v1/auth/email/verify', [
        'email' => 'bob@example.com',
        'code' => $plainCode,
    ]);

    $response->assertStatus(200)
        ->assertJson([
            'message' => 'Email verified successfully. You can now log in.',
        ]);

    // 4. Confirm user's email_verified_at is no longer null
    $this->assertNotNull($user->fresh()->email_verified_at);

    // 5. Confirm the code record was consumed
    $this->assertNotNull(VerificationCode::first()->consumed_at);
});

test('email verification fails when an incorrect code is provided', function () {
    // 1. Create user and a code record
    User::factory()->create([
        'email' => 'carol@example.com',
        'email_verified_at' => null,
    ]);

    VerificationCode::create([
        'email' => 'carol@example.com',
        'code_hash' => hash('sha256', '654321'),
        'purpose' => 'email_verification',
        'expires_at' => now()->addMinutes(15),
        'attempts' => 0,
    ]);

    // 2. Submit wrong code
    $response = $this->postJson('/api/v1/auth/email/verify', [
        'email' => 'carol@example.com',
        'code' => '000000',
    ]);

    $response->assertStatus(422);

    // 3. Ensure user remains unverified
    $this->assertNull(User::where('email', 'carol@example.com')->first()->email_verified_at);
});

test('users can request a resend of their verification code', function () {
    Mail::fake();

    User::factory()->create([
        'email' => 'david@example.com',
    ]);

    $response = $this->postJson('/api/v1/auth/email/resend', [
        'email' => 'david@example.com',
    ]);

    $response->assertStatus(200);

    Mail::assertSent(VerificationCodeMail::class, function ($mail) {
        return $mail->hasTo('david@example.com');
    });
});
