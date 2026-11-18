<?php

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('authenticated user can create a task', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/tasks', [
        'title' => 'Design wireframes',
        'category' => 'Work',
        'due_date' => now()->addDays(2)->toDateString(),
        'due_time' => '14:30',
        'priority' => 'High',
        'notes' => 'Complete the prototype screens.',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('task.title', 'Design wireframes')
        ->assertJsonPath('task.status', 'pending');

    $this->assertDatabaseHas('tasks', [
        'user_id' => $user->id,
        'title' => 'Design wireframes',
        'category' => 'Work',
    ]);
});

test('user cannot access tasks belonging to another user', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();

    $task = Task::create([
        'user_id' => $alice->id,
        'title' => "Alice's Secret Task",
        'category' => 'Personal',
        'due_date' => now()->toDateString(),
        'priority' => 'Medium',
        'status' => 'pending',
    ]);

    // Bob tries to view Alice's task
    $this->actingAs($bob, 'sanctum')
        ->getJson("/api/v1/tasks/{$task->id}")
        ->assertStatus(404);

    // Bob tries to complete Alice's task
    $this->actingAs($bob, 'sanctum')
        ->patchJson("/api/v1/tasks/{$task->id}/complete")
        ->assertStatus(404);

    // Bob tries to delete Alice's task
    $this->actingAs($bob, 'sanctum')
        ->deleteJson("/api/v1/tasks/{$task->id}")
        ->assertStatus(404);
});

test('user can mark task as completed', function () {
    $user = User::factory()->create();

    $task = Task::create([
        'user_id' => $user->id,
        'title' => 'Buy groceries',
        'category' => 'Errands',
        'due_date' => now()->toDateString(),
        'priority' => 'Low',
        'status' => 'pending',
    ]);

    $response = $this->actingAs($user, 'sanctum')
        ->patchJson("/api/v1/tasks/{$task->id}/complete");

    $response->assertStatus(200)
        ->assertJsonPath('task.status', 'completed');

    $this->assertNotNull($task->fresh()->completed_at);
});

test('user can cancel a task with a reason', function () {
    $user = User::factory()->create();

    $task = Task::create([
        'user_id' => $user->id,
        'title' => 'Go to gym',
        'category' => 'Health',
        'due_date' => now()->toDateString(),
        'priority' => 'Medium',
        'status' => 'pending',
    ]);

    $response = $this->actingAs($user, 'sanctum')
        ->patchJson("/api/v1/tasks/{$task->id}/cancel", [
            'cancellation_reason' => 'Feeling sick today.',
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('task.status', 'cancelled')
        ->assertJsonPath('task.cancellation_reason', 'Feeling sick today.');
});

test('user can filter and search their tasks', function () {
    $user = User::factory()->create();

    Task::create([
        'user_id' => $user->id,
        'title' => 'Work on React app',
        'category' => 'Work',
        'due_date' => now()->toDateString(),
        'priority' => 'High',
        'status' => 'pending',
    ]);

    Task::create([
        'user_id' => $user->id,
        'title' => 'Doctor appointment',
        'category' => 'Health',
        'due_date' => now()->toDateString(),
        'priority' => 'Low',
        'status' => 'pending',
    ]);

    // Search for "React"
    $response = $this->actingAs($user, 'sanctum')
        ->getJson('/api/v1/tasks?search=React');

    $response->assertStatus(200)
        ->assertJsonCount(1, 'tasks')
        ->assertJsonPath('tasks.0.title', 'Work on React app');

    // Filter by Category
    $responseHealth = $this->actingAs($user, 'sanctum')
        ->getJson('/api/v1/tasks?category=Health');

    $responseHealth->assertStatus(200)
        ->assertJsonCount(1, 'tasks')
        ->assertJsonPath('tasks.0.title', 'Doctor appointment');
});

test('user can reopen a completed or cancelled task back to pending', function () {
    $user = User::factory()->create();

    $task = Task::create([
        'user_id' => $user->id,
        'title' => 'Finished task',
        'category' => 'Work',
        'due_date' => now()->toDateString(),
        'priority' => 'Medium',
        'status' => 'completed',
        'completed_at' => now(),
    ]);

    $response = $this->actingAs($user, 'sanctum')
        ->patchJson("/api/v1/tasks/{$task->id}/reopen");

    $response->assertStatus(200)
        ->assertJsonPath('task.status', 'pending');

    $freshTask = $task->fresh();
    $this->assertEquals('pending', $freshTask->status);
    $this->assertNull($freshTask->completed_at);
    $this->assertNull($freshTask->cancellation_reason);
});
