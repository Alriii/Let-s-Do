<?php

namespace App\Http\Controllers;

use App\Http\Requests\Task\CancelTaskRequest;
use App\Http\Requests\Task\CreateTaskRequest;
use App\Http\Requests\Task\UpdateTaskRequest;
use App\Models\Task;
use App\Services\PhilippineCalendarService;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

// task controller
class TaskController extends Controller
{
    public function __construct(
        private PhilippineCalendarService $calendarSvc,
    ) {}

    private const CATEGORIES = ['Work', 'Personal', 'Health', 'Errands', 'School'];
    private const PRIORITIES = ['Low', 'Medium', 'High'];
    private const STATUSES = ['pending', 'completed', 'cancelled'];

    // get tasks with filters
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', Rule::in(self::CATEGORIES)],
            'priority' => ['nullable', Rule::in(self::PRIORITIES)],
            'status' => ['nullable', Rule::in(self::STATUSES)],
            'date' => ['nullable', 'date_format:Y-m-d'],
            'due_after' => ['nullable', 'date_format:Y-m-d'],
            'due_before' => ['nullable', 'date_format:Y-m-d'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = $request->user()->tasks();

        // search keyword
        if (! empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('title', 'like', "%{$filters['search']}%")
                    ->orWhere('notes', 'like', "%{$filters['search']}%");
            });
        }

        // filters
        foreach (['category', 'priority', 'status', 'date'] as $field) {
            if (! empty($filters[$field])) {
                $query->where($field === 'date' ? 'due_date' : $field, $filters[$field]);
            }
        }

        // date range
        if (! empty($filters['due_after'])) {
            $query->where('due_date', '>=', $filters['due_after']);
        }

        if (! empty($filters['due_before'])) {
            $query->where('due_date', '<=', $filters['due_before']);
        }

        $query->orderBy('due_date', 'asc')->orderBy('due_time', 'asc');

        return $this->paginatedResponse($query, $request);
    }

    // create new task
    public function store(CreateTaskRequest $request): JsonResponse
    {
        $validated = $request->validated();

        if (empty($validated['due_time'])) {
            $validated['due_time'] = $validated['end_time'] ?? $validated['start_time'] ?? null;
        }
        if (empty($validated['end_time']) && ! empty($validated['due_time'])) {
            $validated['end_time'] = $validated['due_time'];
        }
        if (empty($validated['start_time']) && ! empty($validated['due_time'])) {
            $validated['start_time'] = $validated['due_time'];
        }

        $task = $request->user()->tasks()->create(array_merge($validated, [
            'status' => 'pending',
            'reminders_sent' => 0,
        ]));

        return response()->json([
            'message' => 'Task created successfully.',
            'task' => $task,
        ], 201);
    }

    // get single task
    public function show(Request $request, Task $task): JsonResponse
    {
        $this->authorizeTask($request, $task);

        return response()->json([
            'task' => $task,
        ], 200);
    }

    // update task
    public function update(UpdateTaskRequest $request, Task $task): JsonResponse
    {
        $this->authorizeTask($request, $task);

        $validated = $request->validated();

        if (array_key_exists('end_time', $validated) || array_key_exists('start_time', $validated) || array_key_exists('due_time', $validated)) {
            if (empty($validated['due_time'])) {
                $validated['due_time'] = $validated['end_time'] ?? $validated['start_time'] ?? $task->due_time;
            }
        }

        $task->update($validated);

        return response()->json([
            'message' => 'Task updated successfully.',
            'task' => $task->fresh(),
        ], 200);
    }

    // mark completed
    public function complete(Request $request, Task $task): JsonResponse
    {
        $this->authorizeTask($request, $task);

        $task->update([
            'status' => 'completed',
            'completed_at' => now(),
            'cancelled_at' => null,
            'cancellation_reason' => null,
            'cancellation_note' => null,
        ]);

        return response()->json([
            'message' => 'Task marked as completed.',
            'task' => $task->fresh(),
        ], 200);
    }

    // cancel task
    public function cancel(CancelTaskRequest $request, Task $task): JsonResponse
    {
        $this->authorizeTask($request, $task);

        $task->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'completed_at' => null,
            'cancellation_reason' => $request->validated('cancellation_reason'),
            'cancellation_note' => $request->validated('cancellation_note'),
        ]);

        return response()->json([
            'message' => 'Task cancelled.',
            'task' => $task->fresh(),
        ], 200);
    }

    // reopen task
    public function reopen(Request $request, Task $task): JsonResponse
    {
        $this->authorizeTask($request, $task);

        $task->update([
            'status' => 'pending',
            'completed_at' => null,
            'cancelled_at' => null,
            'cancellation_reason' => null,
            'cancellation_note' => null,
            'reminder_sent_at' => null,
        ]);

        return response()->json([
            'message' => 'Task reopened successfully.',
            'task' => $task->fresh(),
        ], 200);
    }

    // delete task
    public function destroy(Request $request, Task $task): JsonResponse
    {
        $this->authorizeTask($request, $task);

        $task->delete();

        return response()->json([
            'message' => 'Task deleted successfully.',
        ], 200);
    }

    // upcoming tasks
    public function upcoming(Request $request): JsonResponse
    {
        $today = now()->toDateString();
        $tomorrow = now()->addDay()->toDateString();
        $endOfWeek = now()->endOfWeek(Carbon::SUNDAY)->toDateString();

        $query = $request->user()->tasks()
            ->where('status', 'pending')
            ->where('due_date', '>', $today)
            ->orderBy('due_date', 'asc')
            ->orderBy('due_time', 'asc');

        $summary = [
            'total' => (clone $query)->count(),
            'due_this_week' => (clone $query)
                ->whereBetween('due_date', [$tomorrow, $endOfWeek])
                ->count(),
            'high_priority' => (clone $query)->where('priority', 'High')->count(),
        ];

        return $this->paginatedResponse($query, $request, ['summary' => $summary]);
    }

    // completed tasks history
    public function completed(Request $request): JsonResponse
    {
        $query = $request->user()->tasks()
            ->where('status', 'completed')
            ->orderByDesc('completed_at');

        return $this->paginatedResponse($query, $request);
    }

    // month calendar view with holidays
    public function calendar(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'month'   => ['nullable', 'date_format:Y-m'],
            'country' => ['nullable', 'string', 'max:10'],
        ]);

        $month = $validated['month'] ?? now()->format('Y-m');
        $country = strtoupper($validated['country'] ?? 'PH');

        $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        $end   = $start->copy()->endOfMonth();

        $rows = $request->user()->tasks()
            ->whereBetween('due_date', [$start->toDateString(), $end->toDateString()])
            ->selectRaw('due_date, status, COUNT(*) as aggregate')
            ->groupBy('due_date', 'status')
            ->get();

        $days = [];

        foreach ($rows as $row) {
            $dueDate = $row->due_date;
            $date = $dueDate instanceof \DateTimeInterface
                ? $dueDate->format('Y-m-d')
                : substr((string) $dueDate, 0, 10);

            $days[$date] ??= [
                'date'      => $date,
                'total'     => 0,
                'pending'   => 0,
                'completed' => 0,
                'cancelled' => 0,
                'holiday'   => null,
            ];

            $count = (int) $row->aggregate;
            $days[$date]['total'] += $count;

            if (isset($days[$date][$row->status])) {
                $days[$date][$row->status] += $count;
            }
        }

        // add holidays for PH
        if ($country === 'PH') {
            $cursor = $start->copy();
            while ($cursor->lte($end)) {
                $iso     = $cursor->format('Y-m-d');
                $holiday = $this->calendarSvc->getHoliday($cursor);

                if ($holiday) {
                    $days[$iso] ??= [
                        'date'      => $iso,
                        'total'     => 0,
                        'pending'   => 0,
                        'completed' => 0,
                        'cancelled' => 0,
                        'holiday'   => null,
                    ];
                    $days[$iso]['holiday'] = [
                        'name' => $holiday['name'],
                        'type' => $holiday['type'],
                    ];
                }

                $cursor->addDay();
            }
        }

        ksort($days);

        return response()->json([
            'month'   => $month,
            'country' => $country,
            'days'    => array_values($days),
            'count'   => count(array_filter($days, fn($d) => $d['total'] > 0)),
        ], 200);
    }

    // pagination helper
    protected function paginatedResponse(HasMany $query, Request $request, array $extra = []): JsonResponse
    {
        $perPage = $request->integer('per_page') ?: 50;
        $perPage = max(1, min(100, $perPage));

        $paginator = $query->paginate($perPage)->withQueryString();

        return response()->json(array_merge([
            'tasks' => $paginator->items(),
            'count' => $paginator->count(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'last_page' => $paginator->lastPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
        ], $extra), 200);
    }

    // check if task belongs to user
    protected function authorizeTask(Request $request, Task $task): void
    {
        if ($task->user_id !== $request->user()->id) {
            abort(404, 'Task not found.');
        }
    }
}
