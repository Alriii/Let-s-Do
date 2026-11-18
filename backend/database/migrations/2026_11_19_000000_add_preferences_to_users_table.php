<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Stores the preferences shown on the Figma "Preferences" screen.
 * Preferences are stored per user so they sync across devices.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('theme', 20)->default('light');
            $table->boolean('task_reminders_enabled')->default(true);
            $table->boolean('daily_digest_enabled')->default(true);
            $table->string('avatar_path')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'theme',
                'task_reminders_enabled',
                'daily_digest_enabled',
                'avatar_path',
            ]);
        });
    }
};
