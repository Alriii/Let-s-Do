<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// dashboard metrics
class DashboardController extends Controller
{
    // get dashboard counts and today tasks
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $today = now()->toDateString();

        // today tasks
        $todayTasks = $user->tasks()
            ->where('due_date', $today)
            ->orderBy('due_time', 'asc')
            ->get();

        // card metrics
        $todayTotal = $todayTasks->count();

        $todayCompleted = $user->tasks()
            ->where('status', 'completed')
            ->whereDate('completed_at', $today)
            ->count();

        $pendingActions = $user->tasks()
            ->where('status', 'pending')
            ->where('due_date', '<=', $today)
            ->count();

        // upcoming tasks
        $upcomingPreview = $user->tasks()
            ->where('status', 'pending')
            ->where('due_date', '>', $today)
            ->orderBy('due_date', 'asc')
            ->orderBy('due_time', 'asc')
            ->limit(5)
            ->get();

        // category counts
        $categoriesCount = [
            'Work' => $user->tasks()->where('category', 'Work')->count(),
            'Personal' => $user->tasks()->where('category', 'Personal')->count(),
            'Health' => $user->tasks()->where('category', 'Health')->count(),
            'Errands' => $user->tasks()->where('category', 'Errands')->count(),
            'School' => $user->tasks()->where('category', 'School')->count(),
        ];

        return response()->json([
            'metrics' => [
                'today_total' => $todayTotal,
                'today_completed' => $todayCompleted,
                'pending_actions' => $pendingActions,
            ],
            'today_tasks' => $todayTasks,
            'upcoming_preview' => $upcomingPreview,
            'categories' => $categoriesCount,
        ], 200);
    }
}
