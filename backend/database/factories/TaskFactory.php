<?php

namespace Database\Factories;

use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    /**
     * The model the factory creates.
     *
     * @var class-string<Task>
     */
    protected $model = Task::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title' => fake()->sentence(3),
            'category' => fake()->randomElement(['Work', 'Personal', 'Health', 'Errands']),
            'due_date' => now()->addDays(fake()->numberBetween(0, 7))->toDateString(),
            'due_time' => fake()->randomElement(['08:00', '10:30', '14:00', '17:00']),
            'priority' => fake()->randomElement(['Low', 'Medium', 'High']),
            'notes' => fake()->optional()->sentence(),
            'status' => 'pending',
        ];
    }

    /**
     * Indicate that the task is completed.
     */
    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'completed',
            'completed_at' => now(),
        ]);
    }

    /**
     * Indicate that the task is cancelled.
     */
    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'cancellation_reason' => 'No longer needed / Irrelevant',
        ]);
    }
}
