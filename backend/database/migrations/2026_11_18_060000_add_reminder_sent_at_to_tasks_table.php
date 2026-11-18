<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds reminder_sent_at to tasks so we never send duplicate reminder emails.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            // Tracks when the reminder email was sent; null means not yet sent
            $table->timestamp('reminder_sent_at')->nullable()->after('completed_at');
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn('reminder_sent_at');
        });
    }
};
