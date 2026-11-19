<?php

namespace App\Http\Controllers;

use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Services\DocumentExtractorService;
use App\Services\GeminiService;
use App\Services\PhilippineCalendarService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AiController extends Controller
{
    public function __construct(
        private GeminiService $gemini,
        private PhilippineCalendarService $calendar,
        private DocumentExtractorService $extractor,
    ) {}

    /**
     * Get dynamic holiday briefing & advice for dashboard.
     */
    public function holidayBriefing(Request $request): JsonResponse    {
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
     * Extract plain text from an uploaded document (PDF, DOCX, TXT).
     */
    public function extractFile(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:10240', 'mimes:pdf,docx,doc,txt'],
        ]);

        $result = $this->extractor->extract($request->file('file'));

        if (isset($result['error'])) {
            return response()->json(['message' => $result['error']], 422);
        }

        return response()->json([
            'text'       => $result['text'],
            'char_count' => $result['char_count'],
            'truncated'  => $result['truncated'],
            'limit'      => 15000,
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

        // If message_id provided, mark that message as imported in DB
        $messageId = $request->input('message_id');
        if ($messageId) {
            $aiMessage = AiMessage::whereHas('conversation', function ($q) use ($user) {
                $q->where('user_id', $user->id);
            })->find($messageId);

            if ($aiMessage) {
                if ($aiMessage->proposed_schedule) {
                    $sched = $aiMessage->proposed_schedule;
                    $sched['imported'] = true;
                    $aiMessage->update(['proposed_schedule' => $sched]);
                }
                if ($aiMessage->extracted_doc) {
                    $doc = $aiMessage->extracted_doc;
                    $doc['imported'] = true;
                    $aiMessage->update(['extracted_doc' => $doc]);
                }
            }
        }

        return response()->json([
            'message' => count($created).' tasks imported successfully into your schedule.',
            'tasks' => $created,
        ], 201);
    }

    /**
     * List all chat conversations for the current user.
     */
    public function listConversations(Request $request): JsonResponse
    {
        $conversations = $request->user()->aiConversations()
            ->withCount('messages')
            ->with(['messages' => function ($query) {
                $query->latest('created_at')->limit(1);
            }])
            ->get()
            ->map(function ($conv) {
                $latest = $conv->messages->first();
                return [
                    'id' => $conv->id,
                    'title' => $conv->title,
                    'updated_at' => $conv->updated_at,
                    'created_at' => $conv->created_at,
                    'messages_count' => $conv->messages_count,
                    'preview' => $latest ? Str::limit($latest->text, 90) : null,
                ];
            });

        return response()->json($conversations);
    }

    /**
     * Create a new chat conversation.
     */
    public function createConversation(Request $request): JsonResponse
    {
        $conversation = $request->user()->aiConversations()->create([
            'title' => $request->input('title', 'New Chat'),
        ]);

        return response()->json([
            'id' => $conversation->id,
            'title' => $conversation->title,
            'created_at' => $conversation->created_at,
            'updated_at' => $conversation->updated_at,
            'messages' => [],
        ], 201);
    }

    /**
     * Get a specific conversation with all of its messages.
     */
    public function showConversation(Request $request, AiConversation $conversation): JsonResponse
    {
        if ($conversation->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $messages = $conversation->messages()->get()->map(function ($msg) {
            return [
                'id' => (string) $msg->id,
                'role' => $msg->role,
                'text' => $msg->text,
                'attachment' => $msg->attachment,
                'extracted_doc' => $msg->extracted_doc,
                'proposed_schedule' => $msg->proposed_schedule,
                'timestamp' => $msg->created_at,
            ];
        });

        return response()->json([
            'id' => $conversation->id,
            'title' => $conversation->title,
            'created_at' => $conversation->created_at,
            'updated_at' => $conversation->updated_at,
            'messages' => $messages,
        ]);
    }

    /**
     * Delete a conversation and its messages.
     */
    public function destroyConversation(Request $request, AiConversation $conversation): JsonResponse
    {
        if ($conversation->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $conversation->delete();

        return response()->json(['message' => 'Conversation deleted successfully.']);
    }

    /**
     * Append a message to a conversation (e.g. document extraction result).
     */
    public function appendMessage(Request $request, AiConversation $conversation): JsonResponse
    {
        if ($conversation->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'role'              => ['required', 'string', 'in:user,model'],
            'text'              => ['required', 'string'],
            'attachment'        => ['nullable', 'array'],
            'extracted_doc'     => ['nullable', 'array'],
            'proposed_schedule' => ['nullable', 'array'],
        ]);

        $message = $conversation->messages()->create($validated);
        $conversation->touch();

        return response()->json([
            'id' => (string) $message->id,
            'role' => $message->role,
            'text' => $message->text,
            'attachment' => $message->attachment,
            'extracted_doc' => $message->extracted_doc,
            'proposed_schedule' => $message->proposed_schedule,
            'timestamp' => $message->created_at,
        ], 201);
    }

    /**
     * Secure AI chat — scoped to task management, jailbreak-protected.
     * Accepts a message + optional conversation history & conversation_id.
     */
    public function chat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message'          => ['required', 'string', 'min:1', 'max:2000'],
            'conversation_id'  => ['nullable', 'integer'],
            'history'          => ['nullable', 'array', 'max:30'],
            'history.*.role'   => ['required', 'string', 'in:user,model'],
            'history.*.text'   => ['required', 'string', 'max:10000'],
        ]);

        $user    = $request->user();
        $message = trim($validated['message']);
        $history = $validated['history'] ?? [];
        $conversationId = $validated['conversation_id'] ?? null;

        // Find or create conversation
        $conversation = null;
        if ($conversationId) {
            $conversation = $user->aiConversations()->find($conversationId);
        }

        if (! $conversation) {
            $conversation = $user->aiConversations()->create([
                'title' => 'New Chat',
            ]);
        }

        // Save User Message to DB
        $userMsg = $conversation->messages()->create([
            'role' => 'user',
            'text' => $message,
        ]);

        // If history wasn't passed from frontend, load recent history from conversation
        if (empty($history) && $conversation) {
            $history = $conversation->messages()
                ->where('id', '!=', $userMsg->id)
                ->latest('created_at')
                ->limit(10)
                ->get()
                ->reverse()
                ->map(fn($m) => ['role' => $m->role, 'text' => $m->text])
                ->values()
                ->toArray();
        }

        $result = $this->gemini->chat($message, $history, $user);

        // Prepare proposed_schedule JSON if tasks exist
        $proposedScheduleData = null;
        if (! empty($result['proposed_tasks'])) {
            $proposedScheduleData = [
                'tasks' => $result['proposed_tasks'],
                'selectedIndices' => array_keys($result['proposed_tasks']),
                'imported' => false,
            ];
        }

        // Save Lumi Model Message to DB
        $aiMsg = $conversation->messages()->create([
            'role' => 'model',
            'text' => $result['reply'],
            'proposed_schedule' => $proposedScheduleData,
        ]);

        // Auto-generate title if it's currently "New Chat"
        if ($conversation->title === 'New Chat') {
            $words = preg_split('/\s+/', $message);
            $shortTitle = implode(' ', array_slice($words, 0, 5));
            $cleanTitle = Str::limit(trim(preg_replace('/[^\w\s\-\,\.\?\!]/u', '', $shortTitle)), 40);
            if (! empty($cleanTitle)) {
                $conversation->update(['title' => $cleanTitle]);
            }
        }

        $conversation->touch();

        return response()->json([
            'reply'             => $result['reply'],
            'proposed_tasks'    => $result['proposed_tasks'] ?? null,
            'blocked'           => $result['blocked'],
            'conversation_id'   => $conversation->id,
            'user_message_id'   => (string) $userMsg->id,
            'ai_message_id'     => (string) $aiMsg->id,
            'title'             => $conversation->title,
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
