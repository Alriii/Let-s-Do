<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Controller handling dashboard analytics and summary metrics:
 * Today's schedule, counts, completed-today, pending actions, and overview.
 */
class DashboardController extends Controller
{
    /**
     * Return all dashboard counts and today's schedule for the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $today = now()->toDateString();

        // 1. Tasks due today
        $todayTasks = $user->tasks()
            ->where('due_date', $today)
            ->orderBy('due_time', 'asc')
            ->get();

        // 2. Metrics for the dashboard cards
        $todayTotal = $todayTasks->count();

        $todayCompleted = $user->tasks()
            ->where('status', 'completed')
            ->whereDate('completed_at', $today)
            ->count();

        $pendingActions = $user->tasks()
            ->where('status', 'pending')
            ->where('due_date', '<=', $today)
            ->count();

        // 3. Upcoming preview (next 5 pending tasks after today)
        $upcomingPreview = $user->tasks()
            ->where('status', 'pending')
            ->where('due_date', '>', $today)
            ->orderBy('due_date', 'asc')
            ->orderBy('due_time', 'asc')
            ->limit(5)
            ->get();

        // 4. Counts by category
        $categoriesCount = [
            'Work' => $user->tasks()->where('category', 'Work')->count(),
            'Personal' => $user->tasks()->where('category', 'Personal')->count(),
            'Health' => $user->tasks()->where('category', 'Health')->count(),
            'Errands' => $user->tasks()->where('category', 'Errands')->count(),
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
