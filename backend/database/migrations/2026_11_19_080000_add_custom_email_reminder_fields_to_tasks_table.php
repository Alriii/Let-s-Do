<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->time('start_time')->nullable()->after('due_date');
            $table->time('end_time')->nullable()->after('start_time');
            $table->boolean('reminder_enabled')->default(false)->after('reminder_sent_at');
            $table->string('reminder_target', 20)->default('start_time')->after('reminder_enabled'); // 'start_time' or 'end_time'
            $table->unsignedSmallInteger('reminder_interval_minutes')->default(5)->after('reminder_target'); // e.g. 5, 10, 15, 30
            $table->unsignedSmallInteger('reminder_count')->default(3)->after('reminder_interval_minutes'); // e.g. 1, 2, 3, 5
            $table->unsignedSmallInteger('reminders_sent')->default(0)->after('reminder_count');
            $table->timestamp('last_reminder_sent_at')->nullable()->after('reminders_sent');
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn([
                'start_time',
                'end_time',
                'reminder_enabled',
                'reminder_target',
                'reminder_interval_minutes',
                'reminder_count',
                'reminders_sent',
                'last_reminder_sent_at',
            ]);
        });
    }
};
