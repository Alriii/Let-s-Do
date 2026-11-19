<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();

            // 1. Who owns this task?
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // 2. Task Details from your Figma UI
            $table->string('title');                                   // Task title
            $table->string('category');                                // Work, Personal, Health, Errands, School
            $table->date('due_date');                                  // Due date
            $table->time('due_time')->nullable();                      // Due time (optional)
            $table->string('priority')->default('Medium');             // Low, Medium, High
            $table->text('notes')->nullable();                         // Extra notes (optional)

            // 3. Status Tracking
            $table->string('status')->default('pending');              // pending, completed, cancelled
            $table->string('cancellation_reason')->nullable();         // Reason if cancelled
            $table->timestamp('completed_at')->nullable();             // When marked done

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
