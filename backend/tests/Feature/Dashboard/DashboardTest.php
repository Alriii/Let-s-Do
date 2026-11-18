<?php

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('dashboard returns correct metrics and today schedule', function () {
    $user = User::factory()->create();
    $today = now()->toDateString();

    // 1. Task due today and completed
    Task::create([
        'user_id' => $user->id,
        'title' => 'Completed today',
        'category' => 'Work',
        'due_date' => $today,
        'priority' => 'High',
        'status' => 'completed',
        'completed_at' => now(),
    ]);

    // 2. Task due today and still pending
    Task::create([
        'user_id' => $user->id,
        'title' => 'Pending today',
        'category' => 'Personal',
        'due_date' => $today,
        'priority' => 'Medium',
        'status' => 'pending',
    ]);

    // 3. Task due tomorrow
    Task::create([
        'user_id' => $user->id,
        'title' => 'Upcoming tomorrow',
        'category' => 'Health',
        'due_date' => now()->addDay()->toDateString(),
        'priority' => 'Low',
        'status' => 'pending',
    ]);

    $response = $this->actingAs($user, 'sanctum')->getJson('/api/v1/dashboard');

    $response->assertStatus(200)
        ->assertJsonPath('metrics.today_total', 2)
        ->assertJsonPath('metrics.today_completed', 1)
        ->assertJsonPath('metrics.pending_actions', 1)
        ->assertJsonCount(2, 'today_tasks')
        ->assertJsonCount(1, 'upcoming_preview');
});
