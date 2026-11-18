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

// ==========================================
// 1. Public Authentication Routes
// ==========================================
Route::prefix('v1/auth')->group(function () {
    // Register
    Route::post('/register', [AuthController::class, 'register'])
        ->middleware('throttle:auth-register');

    // Email 6-Digit Code Verification
    Route::post('/email/verify', [AuthController::class, 'verifyEmail'])
        ->middleware('throttle:auth-verify');
    Route::post('/email/resend', [AuthController::class, 'resendVerificationEmail'])
        ->middleware('throttle:auth-code');

    // Login
    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:auth-login');

    // Password Recovery
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])
        ->middleware('throttle:auth-code');
    Route::post('/reset-password', [AuthController::class, 'resetPassword'])
        ->middleware('throttle:auth-verify');
});

// ==========================================
// 2. Protected Routes (Requires Authentication)
// ==========================================
Route::middleware('auth:sanctum')->prefix('v1')->group(function () {

    // --- User & Profile ---
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::patch('/profile', [AuthController::class, 'updateProfile']);
        Route::post('/avatar', [AuthController::class, 'uploadAvatar']);
        Route::delete('/avatar', [AuthController::class, 'destroyAvatar']);
    });

    // --- Dashboard Summary ---
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // --- Task Specific Views ---
    Route::get('/tasks/upcoming', [TaskController::class, 'upcoming']);
    Route::get('/tasks/completed', [TaskController::class, 'completed']);
    Route::get('/tasks/calendar', [TaskController::class, 'calendar']);

    // --- Task Actions & CRUD ---
    Route::get('/tasks', [TaskController::class, 'index']);
    Route::post('/tasks', [TaskController::class, 'store']);
    Route::get('/tasks/{task}', [TaskController::class, 'show']);
    Route::patch('/tasks/{task}', [TaskController::class, 'update']);
    Route::patch('/tasks/{task}/complete', [TaskController::class, 'complete']);
    Route::patch('/tasks/{task}/cancel', [TaskController::class, 'cancel']);
    Route::patch('/tasks/{task}/reopen', [TaskController::class, 'reopen']);
    Route::delete('/tasks/{task}', [TaskController::class, 'destroy']);
});

// Legacy / Default user check
Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');
