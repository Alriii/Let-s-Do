<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\TaskController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - Let's Do! Application
|--------------------------------------------------------------------------
| All routes in this file are automatically prefixed with "/api" by Laravel.
*/

// public auth routes
Route::prefix('v1/auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])
        ->middleware('throttle:auth-register');

    // email verification
    Route::post('/email/verify', [AuthController::class, 'verifyEmail'])
        ->middleware('throttle:auth-verify');
    Route::post('/email/resend', [AuthController::class, 'resendVerificationEmail'])
        ->middleware('throttle:auth-code');

    // login
    Route::post('/login', [AuthController::class, 'login'])
        ->name('login')
        ->middleware('throttle:auth-login');

    // password reset
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])
        ->middleware('throttle:auth-code');
    Route::post('/reset-password', [AuthController::class, 'resetPassword'])
        ->middleware('throttle:auth-verify');
});

// protected routes
Route::middleware('auth:sanctum')->prefix('v1')->group(function () {

    // user & profile
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::patch('/profile', [AuthController::class, 'updateProfile']);
        Route::post('/avatar', [AuthController::class, 'uploadAvatar']);
        Route::delete('/avatar', [AuthController::class, 'destroyAvatar']);
    });

    // dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // task views
    Route::get('/tasks/upcoming', [TaskController::class, 'upcoming']);
    Route::get('/tasks/completed', [TaskController::class, 'completed']);
    Route::get('/tasks/calendar', [TaskController::class, 'calendar']);

    // task crud
    Route::get('/tasks', [TaskController::class, 'index']);
    Route::post('/tasks', [TaskController::class, 'store']);
    Route::get('/tasks/{task}', [TaskController::class, 'show']);
    Route::patch('/tasks/{task}', [TaskController::class, 'update']);
    Route::patch('/tasks/{task}/complete', [TaskController::class, 'complete']);
    Route::patch('/tasks/{task}/cancel', [TaskController::class, 'cancel']);
    Route::patch('/tasks/{task}/reopen', [TaskController::class, 'reopen']);
    Route::delete('/tasks/{task}', [TaskController::class, 'destroy']);

    // ai and lumi
    Route::prefix('ai')->group(function () {
        Route::get('/holiday-briefing', [\App\Http\Controllers\AiController::class, 'holidayBriefing']);
        Route::post('/extract-file',    [\App\Http\Controllers\AiController::class, 'extractFile']);
        Route::post('/parse-notes',     [\App\Http\Controllers\AiController::class, 'parseNotes']);
        Route::post('/import-tasks',    [\App\Http\Controllers\AiController::class, 'importTasks']);
        Route::post('/quick-parse',     [\App\Http\Controllers\AiController::class, 'quickParse']);

        // conversations
        Route::get('/conversations', [\App\Http\Controllers\AiController::class, 'listConversations']);
        Route::post('/conversations', [\App\Http\Controllers\AiController::class, 'createConversation']);
        Route::get('/conversations/{conversation}', [\App\Http\Controllers\AiController::class, 'showConversation']);
        Route::delete('/conversations/{conversation}', [\App\Http\Controllers\AiController::class, 'destroyConversation']);
        Route::post('/conversations/{conversation}/messages', [\App\Http\Controllers\AiController::class, 'appendMessage']);

        // chat
        Route::post('/chat', [\App\Http\Controllers\AiController::class, 'chat'])
            ->middleware('throttle:ai-chat');
    });
});

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');
