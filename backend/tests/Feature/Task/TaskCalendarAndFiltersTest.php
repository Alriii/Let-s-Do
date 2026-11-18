<?php

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

test('tasks can be filtered by an inclusive due date range', function () {
    $user = User::factory()->create();

    Task::factory()->for($user)->create(['due_date' => '2026-10-25']);
    Task::factory()->for($user)->create(['due_date' => '2026-10-26']);
    Task::factory()->for($user)->create(['due_date' => '2026-10-27']);

    $response = $this->actingAs($user, 'sanctum')
        ->getJson('/api/v1/tasks?due_after=2026-10-26&due_before=2026-10-26');

    $response->assertStatus(200)
        ->assertJsonCount(1, 'tasks')
        ->assertJsonPath('meta.total', 1);
});

test('task list returns pagination metadata', function () {
    $user = User::factory()->create();

    Task::factory()->for($user)->count(3)->create();

    $response = $this->actingAs($user, 'sanctum')
        ->getJson('/api/v1/tasks?per_page=2');

    $response->assertStatus(200)
        ->assertJsonCount(2, 'tasks')
        ->assertJsonPath('meta.total', 3)
        ->assertJsonPath('meta.per_page', 2)
        ->assertJsonPath('meta.last_page', 2);
});

test('calendar returns per-day counts for a month', function () {
    $user = User::factory()->create();

    Task::factory()->for($user)->create(['due_date' => '2026-10-26', 'status' => 'pending']);
    Task::factory()->for($user)->completed()->create(['due_date' => '2026-10-26']);
    Task::factory()->for($user)->create(['due_date' => '2026-11-01']);

    $response = $this->actingAs($user, 'sanctum')
        ->getJson('/api/v1/tasks/calendar?month=2026-10');

    $response->assertStatus(200)
        ->assertJsonPath('month', '2026-10')
        ->assertJsonPath('count', 1)
        ->assertJsonPath('days.0.date', '2026-10-26')
        ->assertJsonPath('days.0.total', 2)
        ->assertJsonPath('days.0.pending', 1)
        ->assertJsonPath('days.0.completed', 1);
});

test('task status cannot be changed through the update endpoint', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->create(['status' => 'pending']);

    $this->actingAs($user, 'sanctum')
        ->patchJson("/api/v1/tasks/{$task->id}", [
            'title' => 'Renamed task',
            'status' => 'completed',
        ])
        ->assertStatus(200)
        ->assertJsonPath('task.title', 'Renamed task');

    expect($task->fresh()->status)->toBe('pending');
    expect($task->fresh()->completed_at)->toBeNull();
});

test('rescheduling a task resets its reminder flag', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->create([
        'due_date' => '2026-10-26',
        'due_time' => '10:00',
        'reminder_sent_at' => now(),
    ]);

    $this->actingAs($user, 'sanctum')
        ->patchJson("/api/v1/tasks/{$task->id}", [
            'due_date' => '2026-10-27',
        ])
        ->assertStatus(200);

    expect($task->fresh()->reminder_sent_at)->toBeNull();
});

test('cancelling stores the reason, optional note and cancelled timestamp', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->create();

    $this->actingAs($user, 'sanctum')
        ->patchJson("/api/v1/tasks/{$task->id}/cancel", [
            'cancellation_reason' => 'Postponed / Rescheduled',
            'cancellation_note' => 'Moving it to next sprint.',
        ])
        ->assertStatus(200)
        ->assertJsonPath('task.status', 'cancelled')
        ->assertJsonPath('task.cancellation_reason', 'Postponed / Rescheduled')
        ->assertJsonPath('task.cancellation_note', 'Moving it to next sprint.');

    expect($task->fresh()->cancelled_at)->not->toBeNull();
});

test('upcoming returns the three summary metrics shown in the design', function () {
    $this->travelTo(Carbon::create(2026, 10, 26, 9, 0, 0));

    $user = User::factory()->create();

    // Tomorrow (this week), later this week, and beyond next week.
    Task::factory()->for($user)->create([
        'due_date' => '2026-10-27',
        'priority' => 'High',
    ]);
    Task::factory()->for($user)->create(['due_date' => '2026-10-28', 'priority' => 'Medium']);
    Task::factory()->for($user)->create(['due_date' => '2026-11-05', 'priority' => 'Low']);
    // Completed tasks must not be counted.
    Task::factory()->for($user)->completed()->create(['due_date' => '2026-10-27']);

    $response = $this->actingAs($user, 'sanctum')
        ->getJson('/api/v1/tasks/upcoming');

    $response->assertStatus(200)
        ->assertJsonCount(3, 'tasks')
        ->assertJsonPath('summary.total', 3)
        ->assertJsonPath('summary.due_this_week', 2)
        ->assertJsonPath('summary.high_priority', 1);
});
