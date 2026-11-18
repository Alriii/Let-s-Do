<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('verified users can log in with valid credentials', function () {
    $user = User::factory()->create([
        'email' => 'login@example.com',
        'password' => 'ValidPass123!',
        'email_verified_at' => now(),
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'login@example.com',
        'password' => 'ValidPass123!',
    ]);

    $response->assertStatus(200)
        ->assertJsonStructure([
            'message',
            'token',
            'user' => ['id', 'name', 'email'],
        ]);
});

test('unverified users are blocked from logging in', function () {
    User::factory()->create([
        'email' => 'unverified@example.com',
        'password' => 'ValidPass123!',
        'email_verified_at' => null, // Not verified
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'unverified@example.com',
        'password' => 'ValidPass123!',
    ]);

    $response->assertStatus(403)
        ->assertJson([
            'requires_verification' => true,
        ]);
});

test('login fails with invalid password', function () {
    User::factory()->create([
        'email' => 'user@example.com',
        'password' => 'ValidPass123!',
        'email_verified_at' => now(),
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'user@example.com',
        'password' => 'WrongPassword!',
    ]);

    $response->assertStatus(401);
});

test('authenticated user can view their profile and log out', function () {
    $user = User::factory()->create([
        'email_verified_at' => now(),
    ]);

    // Check profile
    $this->actingAs($user, 'sanctum')
        ->getJson('/api/v1/auth/me')
        ->assertStatus(200)
        ->assertJsonPath('user.email', $user->email);

    // Logout
    $this->actingAs($user, 'sanctum')
        ->postJson('/api/v1/auth/logout')
        ->assertStatus(200);
});

test('authenticated user can update profile name and password', function () {
    $user = User::factory()->create([
        'name' => 'Original Name',
        'password' => 'OriginalPass123!',
        'email_verified_at' => now(),
    ]);

    // 1. Update name
    $this->actingAs($user, 'sanctum')
        ->patchJson('/api/v1/auth/profile', [
            'name' => 'Updated Name',
        ])
        ->assertStatus(200)
        ->assertJsonPath('user.name', 'Updated Name');

    $this->assertEquals('Updated Name', $user->fresh()->name);

    // 2. Update password with wrong current password fails
    $this->actingAs($user, 'sanctum')
        ->patchJson('/api/v1/auth/profile', [
            'current_password' => 'WrongCurrent!',
            'new_password' => 'BrandNewPass123!',
            'new_password_confirmation' => 'BrandNewPass123!',
        ])
        ->assertStatus(422);

    // 3. Update password with valid current password succeeds
    $this->actingAs($user, 'sanctum')
        ->patchJson('/api/v1/auth/profile', [
            'current_password' => 'OriginalPass123!',
            'new_password' => 'BrandNewPass123!',
            'new_password_confirmation' => 'BrandNewPass123!',
        ])
        ->assertStatus(200);

    $this->assertTrue(\Illuminate\Support\Facades\Hash::check('BrandNewPass123!', $user->fresh()->password));
});
