<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
| Lightweight API health & status response (tiny payload for uptime monitors & cron-job.org)
*/
Route::get('/', function () {
    return response()->json([
        'status' => 'healthy',
        'service' => "Let's Do! API",
    ], 200);
});
