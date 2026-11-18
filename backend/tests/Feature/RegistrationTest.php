<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

test('new users can register with valid credentials', function () {
    $response = $this->postJson('/api/v1/auth/register', [
        'name' => 'John Doe',
        'email' => 'john@example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
    ]);

    // 1. Should return 201 Created
    $response->assertStatus(201);

    // 2. Should see the user in the database
    $this->assertDatabaseHas('users', [
        'name' => 'John Doe',
        'email' => 'john@example.com',
    ]);
});

test('registration requires a matching password confirmation', function () {
    $response = $this->postJson('/api/v1/auth/register', [
        'name' => 'John Doe',
        'email' => 'john@example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'WrongPassword!',
    ]);

    // Should return 422 Validation Error
    $response->assertStatus(422)
        ->assertJsonValidationErrors(['password']);
});

test('registration works without a name and derives one from the email', function () {
    Mail::fake();

    $response = $this->postJson('/api/v1/auth/register', [
        'email' => 'jane.doe@example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('requires_verification', true)
        ->assertJsonPath('user.name', 'Jane Doe');

    $this->assertDatabaseHas('users', [
        'email' => 'jane.doe@example.com',
        'name' => 'Jane Doe',
    ]);
});
