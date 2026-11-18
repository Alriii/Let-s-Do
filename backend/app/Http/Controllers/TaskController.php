<?php

namespace App\Http\Controllers;

use App\Http\Requests\Task\CancelTaskRequest;
use App\Http\Requests\Task\CreateTaskRequest;
use App\Http\Requests\Task\UpdateTaskRequest;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Controller handling user-scoped task operations:
 * List, Filter, Create, Show, Update, Complete, Cancel, and Delete.
 */
class TaskController extends Controller
{
    /**
     * List and filter tasks belonging to the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $query = $request->user()->tasks();

        // 1. Search keyword (in title or notes)
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('notes', 'like', "%{$search}%");
            });
        }

        // 2. Filter by category
        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }

        // 3. Filter by priority
        if ($priority = $request->query('priority')) {
            $query->where('priority', $priority);
        }

        // 4. Filter by status
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        // 5. Filter by specific date
        if ($date = $request->query('date')) {
            $query->where('due_date', $date);
        }

        // Default ordering by due date and time
        $tasks = $query->orderBy('due_date', 'asc')
            ->orderBy('due_time', 'asc')
            ->get();

        return response()->json([
            'tasks' => $tasks,
            'count' => $tasks->count(),
        ], 200);
    }

    /**
     * Create a new task for the authenticated user.
     */
    public function store(CreateTaskRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // Ensure user_id is forced to the authenticated user and status starts as pending
        $task = $request->user()->tasks()->create(array_merge($validated, [
            'status' => 'pending',
        ]));

        return response()->json([
            'message' => 'Task created successfully.',
            'task' => $task,
        ], 201);
    }

    /**
     * Retrieve a specific task (must belong to authenticated user).
     */
    public function show(Request $request, Task $task): JsonResponse
    {
        $this->authorizeTask($request, $task);

        return response()->json([
            'task' => $task,
        ], 200);
    }

    /**
     * Update permitted fields of an owned task.
     */
    public function update(UpdateTaskRequest $request, Task $task): JsonResponse
    {
        $this->authorizeTask($request, $task);

        $task->update($request->validated());

        return response()->json([
            'message' => 'Task updated successfully.',
            'task' => $task->fresh(),
        ], 200);
    }

    /**
     * Mark a task as completed.
     */
    public function complete(Request $request, Task $task): JsonResponse
    {
        $this->authorizeTask($request, $task);

        $task->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        return response()->json([
            'message' => 'Task marked as completed.',
            'task' => $task->fresh(),
        ], 200);
    }

    /**
     * Cancel a task with a required reason.
     */
    public function cancel(CancelTaskRequest $request, Task $task): JsonResponse
    {
        $this->authorizeTask($request, $task);

        $task->update([
            'status' => 'cancelled',
            'cancellation_reason' => $request->validated('cancellation_reason'),
        ]);

        return response()->json([
            'message' => 'Task cancelled.',
            'task' => $task->fresh(),
        ], 200);
    }

    /**
     * Reopen a completed or cancelled task back to pending.
     */
    public function reopen(Request $request, Task $task): JsonResponse
    {
        $this->authorizeTask($request, $task);

        $task->update([
            'status' => 'pending',
            'completed_at' => null,
            'cancellation_reason' => null,
        ]);

        return response()->json([
            'message' => 'Task reopened successfully.',
            'task' => $task->fresh(),
        ], 200);
    }

    /**
     * Delete a task.
     */
    public function destroy(Request $request, Task $task): JsonResponse
    {
        $this->authorizeTask($request, $task);

        $task->delete();

        return response()->json([
            'message' => 'Task deleted successfully.',
        ], 200);
    }

    /**
     * List upcoming pending tasks due after today.
     */
    public function upcoming(Request $request): JsonResponse
    {
        $today = now()->toDateString();

        $tasks = $request->user()->tasks()
            ->where('status', 'pending')
            ->where('due_date', '>', $today)
            ->orderBy('due_date', 'asc')
            ->orderBy('due_time', 'asc')
            ->get();

        return response()->json([
            'tasks' => $tasks,
            'count' => $tasks->count(),
        ], 200);
    }

    /**
     * List completed tasks history.
     */
    public function completed(Request $request): JsonResponse
    {
        $tasks = $request->user()->tasks()
            ->where('status', 'completed')
            ->orderByDesc('completed_at')
            ->get();

        return response()->json([
            'tasks' => $tasks,
            'count' => $tasks->count(),
        ], 200);
    }

    /**
     * Enforce strict user ownership. Returns 404 if the task does not belong to the user.
     */
    protected function authorizeTask(Request $request, Task $task): void
    {
        if ($task->user_id !== $request->user()->id) {
            abort(404, 'Task not found.');
        }
    }
}
