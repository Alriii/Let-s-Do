<?php

namespace App\Http\Controllers;

use App\Services\GeminiService;
use App\Services\PhilippineCalendarService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiController extends Controller
{
    public function __construct(
        private GeminiService $gemini,
        private PhilippineCalendarService $calendar
    ) {}

    /**
     * Get dynamic holiday briefing & advice for dashboard.
     */
    public function holidayBriefing(Request $request): JsonResponse
    {
        $user = $request->user();
        $briefing = $this->gemini->generateHolidayBriefing($user);
        $upcoming = $this->calendar->getUpcomingHolidays(14);
        $longWeekend = $this->calendar->getLongWeekendInfo();

        return response()->json([
            'briefing' => $briefing,
            'upcoming_holidays' => $upcoming,
            'long_weekend' => $longWeekend,
        ]);
    }

    /**
     * Feed notes / syllabus to AI and parse into structured tasks.
     */
    public function parseNotes(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'notes' => ['required', 'string', 'min:5', 'max:15000'],
        ]);

        $result = $this->gemini->parseSyllabusOrNotes($validated['notes']);

        return response()->json($result);
    }

    /**
     * Bulk-import AI generated tasks directly into the user's schedule.
     */
    public function importTasks(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tasks' => ['required', 'array', 'min:1', 'max:25'],
            'tasks.*.title' => ['required', 'string', 'max:255'],
            'tasks.*.category' => ['required', 'string', 'in:Work,Personal,Health,Errands'],
            'tasks.*.due_date' => ['required', 'date'],
            'tasks.*.due_time' => ['nullable', 'date_format:H:i,H:i:s'],
            'tasks.*.start_time' => ['nullable', 'date_format:H:i,H:i:s'],
            'tasks.*.end_time' => ['nullable', 'date_format:H:i,H:i:s'],
            'tasks.*.priority' => ['required', 'string', 'in:Low,Medium,High'],
            'tasks.*.notes' => ['nullable', 'string', 'max:500'],
            'tasks.*.reminder_enabled' => ['nullable', 'boolean'],
            'tasks.*.reminder_target' => ['nullable', 'string', 'in:start_time,end_time'],
            'tasks.*.reminder_interval_minutes' => ['nullable', 'integer', 'in:1,2,3,5,10,15,30,60'],
            'tasks.*.reminder_count' => ['nullable', 'integer', 'min:1', 'max:10'],
        ]);

        $created = [];
        $user = $request->user();

        foreach ($validated['tasks'] as $item) {
            $dueTime = $item['due_time'] ?? $item['end_time'] ?? $item['start_time'] ?? null;
            $startTime = $item['start_time'] ?? $dueTime;
            $endTime = $item['end_time'] ?? $dueTime;

            $task = $user->tasks()->create([
                'title' => trim($item['title']),
                'category' => $item['category'],
                'due_date' => $item['due_date'],
                'due_time' => $dueTime,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'priority' => $item['priority'],
                'notes' => isset($item['notes']) ? trim($item['notes']) : null,
                'reminder_enabled' => (bool) ($item['reminder_enabled'] ?? true),
                'reminder_target' => $item['reminder_target'] ?? 'start_time',
                'reminder_interval_minutes' => (int) ($item['reminder_interval_minutes'] ?? 5),
                'reminder_count' => (int) ($item['reminder_count'] ?? 3),
                'reminders_sent' => 0,
                'status' => 'pending',
            ]);

            $created[] = $task;
        }

        return response()->json([
            'message' => count($created).' tasks imported successfully into your schedule.',
            'tasks' => $created,
        ], 201);
    }

    /**
     * Secure AI chat — scoped to task management, jailbreak-protected.
     * Accepts a message + optional conversation history.
     */
    public function chat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message'          => ['required', 'string', 'min:1', 'max:800'],
            'history'          => ['nullable', 'array', 'max:20'],
            'history.*.role'   => ['required', 'string', 'in:user,model'],
            'history.*.text'   => ['required', 'string', 'max:800'],
        ]);

        $user    = $request->user();
        $message = trim($validated['message']);
        $history = $validated['history'] ?? [];

        $result = $this->gemini->chat($message, $history, $user);

        return response()->json([
            'reply'   => $result['reply'],
            'blocked' => $result['blocked'],
        ]);
    }

    /**
     * Quick natural language parser for a single task bar.
     */
    public function quickParse(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'prompt' => ['required', 'string', 'min:3', 'max:500'],
        ]);

        $parsed = $this->gemini->quickParseTask($validated['prompt']);

        if (! $parsed) {
            return response()->json([
                'message' => 'Could not parse task from input prompt.',
            ], 422);
        }

        return response()->json([
            'task' => $parsed,
        ]);
    }
}
