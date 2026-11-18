<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Matches the Figma "Cancel Task with Reason" modal (preset reason + notes)
 * and adds indexes for the dashboard, calendar, and list queries.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->timestamp('cancelled_at')->nullable();
            $table->text('cancellation_note')->nullable();

            $table->index(['user_id', 'status', 'due_date'], 'tasks_user_status_due_date_index');
            $table->index(['user_id', 'due_date'], 'tasks_user_due_date_index');
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex('tasks_user_status_due_date_index');
            $table->dropIndex('tasks_user_due_date_index');
            $table->dropColumn(['cancelled_at', 'cancellation_note']);
        });
    }
};
