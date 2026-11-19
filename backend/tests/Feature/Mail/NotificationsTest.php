<?php

use App\Mail\DailyDigestMail;
use App\Mail\TaskReminderMail;
use App\Mail\VerificationCodeMail;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

test('daily digest is sent only to opted-in users with tasks due', function () {
    Mail::fake();

    $enabled = User::factory()->create(['daily_digest_enabled' => true]);
    Task::factory()->for($enabled)->create(['due_date' => now()->toDateString()]);

    $disabled = User::factory()->create(['daily_digest_enabled' => false]);
    Task::factory()->for($disabled)->create(['due_date' => now()->toDateString()]);

    // Opted in, but nothing scheduled: no email.
    User::factory()->create(['daily_digest_enabled' => true]);

    $this->artisan('tasks:send-daily-digest')->assertSuccessful();

    Mail::assertSent(DailyDigestMail::class, 1);
    Mail::assertSent(DailyDigestMail::class, fn (DailyDigestMail $mail) => $mail->hasTo($enabled->email));
});

test('task reminders respect the notification preference', function () {
    Mail::fake();

    $this->travelTo(Carbon::create(2026, 10, 26, 9, 0, 0));

    $enabled = User::factory()->create(['task_reminders_enabled' => true]);
    Task::factory()->for($enabled)->create([
        'due_date' => '2026-10-26',
        'due_time' => '09:15',
    ]);

    $disabled = User::factory()->create(['task_reminders_enabled' => false]);
    Task::factory()->for($disabled)->create([
        'due_date' => '2026-10-26',
        'due_time' => '09:15',
    ]);

    $this->artisan('tasks:send-reminders')->assertSuccessful();

    Mail::assertSent(TaskReminderMail::class, 1);
    Mail::assertSent(TaskReminderMail::class, fn (TaskReminderMail $mail) => $mail->hasTo($enabled->email));
});

test('verification email renders the code and embeds Lumi inline', function () {
    $html = (new VerificationCodeMail('123456'))->render();

    expect($html)
        ->toContain('123456')
        ->toContain('data:image/jpeg;base64,')
        ->not->toContain('raw.githubusercontent.com');
});

test('password reset email uses the reset copy', function () {
    $html = (new VerificationCodeMail('654321', 'password_reset'))->render();

    expect($html)
        ->toContain('654321')
        ->toContain('Reset your password');
});
