<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Scheduled Commands - Let's Do!
|--------------------------------------------------------------------------
| The scheduler runs every minute when: php artisan schedule:work
*/

// Send task reminder emails every minute, checking for tasks due in 30 mins
Schedule::command('tasks:send-reminders')->everyMinute();
