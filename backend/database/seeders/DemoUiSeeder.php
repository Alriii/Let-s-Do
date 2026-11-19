<?php

namespace Database\Seeders;

use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Seeder;

class DemoUiSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'demo@letsdo.app'],
            [
                'name' => 'Alex Morgan',
                'password' => 'DemoPass123!',
                'email_verified_at' => now(),
                'theme' => 'light',
                'task_reminders_enabled' => true,
                'daily_digest_enabled' => true,
            ],
        );

        $make = fn (array $attributes) => Task::create(array_merge([
            'user_id' => $user->id,
            'status' => 'pending',
        ], $attributes));

        $make([
            'title' => 'Morning Workout Routine',
            'category' => 'Health',
            'due_date' => now()->toDateString(),
            'due_time' => '08:00',
            'priority' => 'Low',
        ]);

        $make([
            'title' => 'Quarterly Team Planning Call',
            'category' => 'Work',
            'due_date' => now()->toDateString(),
            'due_time' => '10:30',
            'priority' => 'High',
            'notes' => 'Align on Q4 goals and owners.',
        ]);

        $make([
            'title' => 'Review Weekly Grocery List',
            'category' => 'Errands',
            'due_date' => now()->toDateString(),
            'due_time' => '17:00',
            'priority' => 'Medium',
        ]);

        $make([
            'title' => 'Send Launch Recap Email',
            'category' => 'Work',
            'due_date' => now()->toDateString(),
            'due_time' => '09:15',
            'priority' => 'Medium',
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        $make([
            'title' => 'Client UX Prototype Presentation',
            'category' => 'Work',
            'due_date' => now()->addDay()->toDateString(),
            'due_time' => '10:00',
            'priority' => 'High',
        ]);

        $make([
            'title' => 'Submit Monthly Financial Statements',
            'category' => 'Work',
            'due_date' => now()->addDay()->toDateString(),
            'due_time' => '14:00',
            'priority' => 'High',
        ]);

        $make([
            'title' => 'Annual Health Checkup Appointment',
            'category' => 'Health',
            'due_date' => now()->addDays(2)->toDateString(),
            'due_time' => '09:00',
            'priority' => 'Medium',
        ]);

        $make([
            'title' => 'Read 2 Chapters of Design Systems Book',
            'category' => 'Personal',
            'due_date' => now()->addDays(2)->toDateString(),
            'due_time' => '20:00',
            'priority' => 'Low',
        ]);

        $make([
            'title' => 'Submit HCI Research Paper & Project Review',
            'category' => 'School',
            'due_date' => now()->addDays(3)->toDateString(),
            'due_time' => '15:00',
            'priority' => 'High',
            'notes' => 'Review references and format as PDF.',
        ]);

        $make([
            'title' => 'Vehicle Maintenance and Oil Change',
            'category' => 'Errands',
            'due_date' => now()->addDays(5)->toDateString(),
            'due_time' => '11:00',
            'priority' => 'Low',
        ]);

        $make([
            'title' => 'Q4 Product Roadmap Sync',
            'category' => 'Work',
            'due_date' => now()->addDays(6)->toDateString(),
            'due_time' => '15:30',
            'priority' => 'High',
        ]);

        $make([
            'title' => 'Finalize Lets Do Design System',
            'category' => 'Work',
            'due_date' => now()->subDay()->toDateString(),
            'due_time' => '16:00',
            'priority' => 'High',
            'status' => 'completed',
            'completed_at' => now()->subDay(),
        ]);

        $make([
            'title' => 'Pay Electricity and Internet Bills',
            'category' => 'Errands',
            'due_date' => now()->subDays(2)->toDateString(),
            'due_time' => '11:00',
            'priority' => 'Medium',
            'status' => 'completed',
            'completed_at' => now()->subDays(2),
        ]);

        $make([
            'title' => 'Buy Fresh Vegetables and Fruits',
            'category' => 'Errands',
            'due_date' => now()->subDays(3)->toDateString(),
            'due_time' => '18:00',
            'priority' => 'Low',
            'status' => 'completed',
            'completed_at' => now()->subDays(3),
        ]);

        $make([
            'title' => 'Old Newsletter Draft',
            'category' => 'Work',
            'due_date' => now()->subDays(4)->toDateString(),
            'due_time' => '13:00',
            'priority' => 'Low',
            'status' => 'cancelled',
            'cancelled_at' => now()->subDays(4),
            'cancellation_reason' => 'No longer needed / Irrelevant',
        ]);
    }
}
