import {
  AlertCircle,
  Bot,
  Calendar,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  Paperclip,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import { categoryStyles, priorityStyles } from '../lib/format';
import type { ParseNotesResponse, TaskInput } from '../lib/types';
import { useAuth } from '../stores/auth';
import { useToast } from '../components/ui/Toast';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExtractedDocData {
  fileName: string;
  fileSize: number;
  summary: string;
  tasks: TaskInput[];
  selectedIndices: number[];
  imported?: boolean;
  importing?: boolean;
  truncatedNotice?: string | null;
}

type ProcessingStep = 'reading_file' | 'ai_analysis' | 'thinking';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  blocked?: boolean;
  timestamp: Date;
  attachment?: {
    name: string;
    size: number;
  };
  processing?: {
    step: ProcessingStep;
    label: string;
  };
  extractedDoc?: ExtractedDocData;
}

interface ChatResponse {
  reply: string;
  blocked: boolean;
}

const STARTERS = [
  'What are some tips to beat procrastination?',
  'How should I prioritize my tasks this week?',
  'Is there a Philippine holiday coming up soon?',
  'Help me plan my study schedule for finals.',
];

const MAX_FILE_MB = 10;
const ACCEPTED_FILE_TYPES = '.pdf,.docx,.doc,.txt';

function formatFileSize(bytes: number): string {
  const kb = Math.round(bytes / 1024);
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

// ─── Task Card inside Chat Bubble ─────────────────────────────────────────────

function ChatTaskCard({
  task,
  selected,
  disabled,
  onToggle,
}: {
  task: TaskInput;
  selected: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      role="checkbox"
      aria-checked={selected}
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onToggle}
      onKeyDown={(e) => {
        if (!disabled && (e.key === ' ' || e.key === 'Enter')) {
          e.preventDefault();
          onToggle();
        }
      }}
      className={`group flex items-start gap-3 rounded-xl border p-3 text-left transition-all duration-150 ${
        disabled
          ? 'border-line bg-surface/50 opacity-80 cursor-default'
          : selected
            ? 'cursor-pointer border-brand/70 bg-surface shadow-xs hover:border-brand'
            : 'cursor-pointer border-line bg-surface/60 opacity-60 hover:opacity-90'
      }`}
    >
      <div
        className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border transition-colors ${
          selected
            ? 'border-brand bg-brand text-white'
            : 'border-line-strong bg-surface group-hover:border-brand/40'
        }`}
        aria-hidden
      >
        {selected && <Check className="h-3 w-3 stroke-[3]" />}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <p className="text-[13px] font-semibold text-ink leading-snug">{task.title}</p>
          <div className="flex shrink-0 items-center gap-1">
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                priorityStyles[task.priority]
              }`}
            >
              {task.priority}
            </span>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                categoryStyles[task.category]
              }`}
            >
              {task.category}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-muted">
          <span className="flex items-center gap-1 font-medium text-ink-soft">
            <Calendar className="h-3 w-3 text-brand" aria-hidden />
            {task.due_date}
          </span>
          {task.start_time && (
            <span className="flex items-center gap-1">
              <Clock3 className="h-3 w-3" aria-hidden />
              {task.start_time.slice(0, 5)}
              {task.end_time ? ` – ${task.end_time.slice(0, 5)}` : ''}
            </span>
          )}
          <span className="text-brand font-medium">3 email alerts</span>
        </div>

        {task.notes && (
          <p className="line-clamp-1 text-[11px] text-muted/80">{task.notes}</p>
        )}
      </div>
    </div>
  );
}

// ─── Inline Review & Schedule Component in Chat ───────────────────────────────

function ExtractedScheduleReview({
  doc,
  onToggleIndex,
  onSelectAll,
  onDeselectAll,
  onImport,
}: {
  doc: ExtractedDocData;
  onToggleIndex: (index: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onImport: () => void;
}) {
  const allSelected = doc.selectedIndices.length === doc.tasks.length;
  const count = doc.selectedIndices.length;

  return (
    <div className="mt-3.5 space-y-3.5 border-t border-line/70 pt-3">
      {/* File Badge & Summary */}
      <div className="rounded-xl border border-brand/25 bg-brand-tint/30 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand">
              <FileText className="h-3.5 w-3.5" aria-hidden />
            </div>
            <span className="truncate text-xs font-semibold text-brand-deep">
              {doc.fileName}
            </span>
            <span className="shrink-0 text-[10px] text-muted">
              ({formatFileSize(doc.fileSize)})
            </span>
          </div>
          <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand-deep">
            {count} / {doc.tasks.length} selected
          </span>
        </div>
        <p className="mt-1.5 text-xs text-ink leading-relaxed">{doc.summary}</p>
      </div>

      {/* Truncation warning if applicable */}
      {doc.truncatedNotice && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
          <span>{doc.truncatedNotice}</span>
        </div>
      )}

      {/* Tasks review list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Extracted Tasks & Deadlines
          </span>
          {!doc.imported && (
            <button
              type="button"
              onClick={allSelected ? onDeselectAll : onSelectAll}
              className="text-[11px] font-semibold text-brand hover:underline"
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
          )}
        </div>

        <div className="space-y-2">
          {doc.tasks.map((task, idx) => (
            <ChatTaskCard
              key={task.title + idx}
              task={task}
              selected={doc.selectedIndices.includes(idx)}
              disabled={doc.imported || doc.importing}
              onToggle={() => onToggleIndex(idx)}
            />
          ))}
        </div>
      </div>

      {/* Action / Success Banner */}
      <div className="pt-1">
        {doc.imported ? (
          <div className="flex items-center gap-2 rounded-xl border border-brand/30 bg-brand-soft px-3.5 py-2.5 text-xs font-semibold text-brand-deep">
            <CheckCircle2 className="h-4 w-4 text-brand" aria-hidden />
            <span>
              {count} task{count !== 1 ? 's' : ''} added to your schedule! You can view them in Home or Upcoming.
            </span>
          </div>
        ) : (
          <button
            type="button"
            disabled={count === 0 || doc.importing}
            onClick={onImport}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-deep focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {doc.importing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Adding tasks to schedule…
              </>
            ) : (
              <>
                <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
                Add {count} Selected Task{count !== 1 ? 's' : ''} to Schedule
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Inline Processing Bubble (Replacing separate tabs/modals) ───────────────

function InlineProcessingBox({ step, label }: { step: ProcessingStep; label: string }) {
  const stepsMeta = [
    { id: 'reading_file', label: 'Reading Document' },
    { id: 'ai_analysis',  label: 'AI Analysis' },
    { id: 'review',       label: 'Review Schedule' },
  ];

  const currentIdx = step === 'reading_file' ? 0 : step === 'ai_analysis' ? 1 : 2;

  return (
    <div className="space-y-3 py-1" aria-busy="true">
      {/* 3-step pills inside the message response */}
      {step !== 'thinking' && (
        <div className="flex items-center gap-1.5 text-[10px]">
          {stepsMeta.map((s, i) => {
            const isDone = i < currentIdx;
            const isCurrent = i === currentIdx;
            return (
              <div key={s.id} className="flex items-center gap-1.5">
                <span
                  className={`flex h-5 items-center gap-1 rounded-full px-2 font-medium transition-colors ${
                    isDone
                      ? 'bg-brand/15 text-brand font-bold'
                      : isCurrent
                        ? 'bg-brand text-white font-bold ring-2 ring-brand/20'
                        : 'bg-surface-2 text-muted border border-line'
                  }`}
                >
                  {isDone ? (
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                  <span>{s.label}</span>
                </span>
                {i < stepsMeta.length - 1 && (
                  <span className="h-px w-3 bg-line" aria-hidden />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Animated status row */}
      <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface/80 px-3.5 py-2.5 text-xs text-ink">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-brand shrink-0" aria-hidden />
        <span className="font-medium text-ink-soft">{label}</span>
      </div>
    </div>
  );
}

// ─── Message Bubble Component ────────────────────────────────────────────────

function Bubble({
  msg,
  onToggleDocIndex,
  onSelectAllDoc,
  onDeselectAllDoc,
  onImportDoc,
}: {
  msg: Message;
  onToggleDocIndex?: (index: number) => void;
  onSelectAllDoc?: () => void;
  onDeselectAllDoc?: () => void;
  onImportDoc?: () => void;
}) {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? 'bg-brand text-white shadow-xs'
            : 'bg-brand-soft border border-brand/30 text-brand'
        }`}
      >
        {isUser ? (
          <span className="text-[10px] font-bold leading-none">YOU</span>
        ) : (
          <Sparkles className="h-3.5 w-3.5 text-brand" aria-hidden />
        )}
      </div>

      {/* Bubble Container */}
      <div
        className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-brand text-white rounded-tr-xs shadow-xs'
            : msg.blocked
              ? 'bg-amber-50 border border-amber-200 text-amber-900 rounded-tl-xs'
              : 'bg-surface-2 border border-line text-ink rounded-tl-xs shadow-xs'
        }`}
      >
        {/* User attachment pill */}
        {isUser && msg.attachment && (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-medium text-white">
            <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{msg.attachment.name}</span>
            <span className="shrink-0 text-white/70">
              ({formatFileSize(msg.attachment.size)})
            </span>
          </div>
        )}

        {/* Text content */}
        {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}

        {/* Processing State indicator inside AI bubble */}
        {msg.processing && (
          <InlineProcessingBox
            step={msg.processing.step}
            label={msg.processing.label}
          />
        )}

        {/* Extracted Schedule Review inside AI bubble */}
        {msg.extractedDoc && onToggleDocIndex && onSelectAllDoc && onDeselectAllDoc && onImportDoc && (
          <ExtractedScheduleReview
            doc={msg.extractedDoc}
            onToggleIndex={onToggleDocIndex}
            onSelectAll={onSelectAllDoc}
            onDeselectAll={onDeselectAllDoc}
            onImport={onImportDoc}
          />
        )}
      </div>
    </div>
  );
}

// ─── Main AI Chat Page ────────────────────────────────────────────────────────

export function AiChatPage() {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`File is too large. Max size is ${MAX_FILE_MB} MB.`);
      return;
    }

    setAttachedFile(file);
    e.target.value = '';
    inputRef.current?.focus();
  };

  const removeAttachedFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Send handler (Text or Document) ────────────────────────────────────────

  const handleSend = async (overrideText?: string) => {
    const textToSend = (overrideText ?? input).trim();
    const fileToSend = attachedFile;

    if ((!textToSend && !fileToSend) || isProcessing) return;

    setInput('');
    setAttachedFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.style.height = 'auto';

    const userMessageId = crypto.randomUUID();
    const aiMessageId = crypto.randomUUID();

    // 1. Add User Message
    const userMsg: Message = {
      id: userMessageId,
      role: 'user',
      text: textToSend || (fileToSend ? `Uploaded ${fileToSend.name} for schedule analysis.` : ''),
      attachment: fileToSend
        ? { name: fileToSend.name, size: fileToSend.size }
        : undefined,
      timestamp: new Date(),
    };

    setIsProcessing(true);

    if (fileToSend) {
      // ── File Analysis Flow with Inline Progression ─────────────────────────
      // Add initial AI placeholder in 'reading_file' state
      const initialAiMsg: Message = {
        id: aiMessageId,
        role: 'model',
        text: '',
        processing: {
          step: 'reading_file',
          label: `Reading and extracting text from ${fileToSend.name}…`,
        },
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg, initialAiMsg]);

      try {
        // Step 1: Extract Document Text
        const formData = new FormData();
        formData.append('file', fileToSend);

        const extracted = await api.postForm<{
          text: string;
          truncated: boolean;
          char_count: number;
          limit: number;
        }>('/ai/extract-file', formData);

        // Step 2: Transition AI bubble to 'ai_analysis'
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMessageId
              ? {
                  ...m,
                  processing: {
                    step: 'ai_analysis',
                    label:
                      'AI analyzing tasks, milestones, deadlines & Philippine holidays…',
                  },
                }
              : m,
          ),
        );

        // Step 3: Parse extracted text into structured tasks with Gemini
        const parsed = await api.post<ParseNotesResponse>('/ai/parse-notes', {
          notes: extracted.text,
        });

        const truncatedNotice = extracted.truncated
          ? `Document exceeded ${extracted.limit.toLocaleString()} characters. The first ${extracted.char_count.toLocaleString()} characters were analyzed.`
          : null;

        // Step 4: Render Review directly in the AI response bubble
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMessageId
              ? {
                  ...m,
                  text: `I've analyzed **${fileToSend.name}** and mapped out the schedule with automated reminders and Philippine holiday awareness:`,
                  processing: undefined,
                  extractedDoc: {
                    fileName: fileToSend.name,
                    fileSize: fileToSend.size,
                    summary: parsed.summary,
                    tasks: parsed.tasks,
                    selectedIndices: parsed.tasks.map((_, i) => i),
                    imported: false,
                    truncatedNotice,
                  },
                }
              : m,
          ),
        );
      } catch (err) {
        const errorMsg =
          err instanceof ApiError ? err.message : 'Failed to analyze document.';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMessageId
              ? {
                  ...m,
                  text: `Sorry, I encountered an issue reading that document: ${errorMsg}. Please try uploading again or pasting the text directly.`,
                  processing: undefined,
                }
              : m,
          ),
        );
      } finally {
        setIsProcessing(false);
      }
    } else {
      // ── Normal AI Text Chat Flow with Inline Thinking ─────────────────────
      const initialAiMsg: Message = {
        id: aiMessageId,
        role: 'model',
        text: '',
        processing: {
          step: 'thinking',
          label: 'LetsDo AI is thinking…',
        },
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg, initialAiMsg]);

      // Build conversation history (up to last 10 turns)
      const history = messages.slice(-10).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      try {
        const res = await api.post<ChatResponse>('/ai/chat', {
          message: textToSend,
          history,
        });

        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMessageId
              ? {
                  ...m,
                  text: res.reply,
                  blocked: res.blocked,
                  processing: undefined,
                }
              : m,
          ),
        );
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Something went wrong. Please try again.';
        setError(message);
        setMessages((prev) => prev.filter((m) => m.id !== aiMessageId));
      } finally {
        setIsProcessing(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }
  };

  // ─── Extracted Document Card Handlers ───────────────────────────────────────

  const handleToggleDocIndex = useCallback((messageId: string, index: number) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId || !m.extractedDoc) return m;
        const current = m.extractedDoc.selectedIndices;
        const next = current.includes(index)
          ? current.filter((i) => i !== index)
          : [...current, index];
        return {
          ...m,
          extractedDoc: {
            ...m.extractedDoc,
            selectedIndices: next,
          },
        };
      }),
    );
  }, []);

  const handleSelectAllDoc = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId || !m.extractedDoc) return m;
        return {
          ...m,
          extractedDoc: {
            ...m.extractedDoc,
            selectedIndices: m.extractedDoc.tasks.map((_, i) => i),
          },
        };
      }),
    );
  }, []);

  const handleDeselectAllDoc = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId || !m.extractedDoc) return m;
        return {
          ...m,
          extractedDoc: {
            ...m.extractedDoc,
            selectedIndices: [],
          },
        };
      }),
    );
  }, []);

  const handleImportDoc = useCallback(
    async (messageId: string) => {
      const msg = messages.find((m) => m.id === messageId);
      if (!msg?.extractedDoc) return;

      const { tasks, selectedIndices } = msg.extractedDoc;
      const tasksToImport = tasks.filter((_, i) => selectedIndices.includes(i));

      if (tasksToImport.length === 0) {
        toast.error('Please select at least one task to import.');
        return;
      }

      // Mark as importing
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && m.extractedDoc
            ? { ...m, extractedDoc: { ...m.extractedDoc, importing: true } }
            : m,
        ),
      );

      try {
        const res = await api.post<{ message: string }>('/ai/import-tasks', {
          tasks: tasksToImport,
        });

        // Invalidate queries so dashboard and upcoming schedules update live
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['calendar'] });

        toast.success(res.message || 'Tasks added to your schedule.');

        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId && m.extractedDoc
              ? {
                  ...m,
                  extractedDoc: {
                    ...m.extractedDoc,
                    importing: false,
                    imported: true,
                  },
                }
              : m,
          ),
        );
      } catch (err) {
        const errorText =
          err instanceof ApiError ? err.message : 'Failed to import tasks.';
        toast.error(errorText);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId && m.extractedDoc
              ? { ...m, extractedDoc: { ...m.extractedDoc, importing: false } }
              : m,
          ),
        );
      }
    },
    [messages, queryClient, toast],
  );

  const clearChat = () => {
    setMessages([]);
    setError(null);
    setAttachedFile(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-1 min-h-0 flex-col rounded-[20px] border border-line bg-surface shadow-xs overflow-hidden">
      {/* ── Header ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-line bg-surface px-6 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft border border-brand/30">
            <Bot className="h-5 w-5 text-brand" aria-hidden />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-ink">LetsDo AI</h1>
            <p className="text-[11px] text-muted">
              Task management &amp; schedule assistant • Philippine Calendar aware 🇵🇭
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearChat}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-surface-2 hover:text-ink transition-colors"
            title="Clear conversation"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Clear
          </button>
        )}
      </div>

      {/* ── Scope Notice ── */}
      <div className="shrink-0 bg-brand-tint border-b border-brand/20 px-6 py-2 text-[11px] text-brand-deep">
        🔒 Focused on <strong>task planning, syllabus breakdown, and Philippine holidays</strong>. Attach notes or files below!
      </div>

      {/* ── Messages Stream (Only this section scrolls) ── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 sm:px-6">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft border border-brand/30">
              <Sparkles className="h-8 w-8 text-brand" aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">
                Hey {firstName}! How can I help with your schedule?
              </h2>
              <p className="mt-1 text-sm text-muted max-w-sm">
                Ask productivity questions, or click the paperclip below to feed a syllabus/rubric and import tasks with 3 email reminders.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 w-full max-w-md">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void handleSend(s)}
                  className="rounded-xl border border-line bg-surface px-4 py-2.5 text-left text-xs text-ink hover:border-brand/40 hover:bg-brand-soft transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 max-w-2xl mx-auto">
            {messages.map((msg) => (
              <Bubble
                key={msg.id}
                msg={msg}
                onToggleDocIndex={(idx) => handleToggleDocIndex(msg.id, idx)}
                onSelectAllDoc={() => handleSelectAllDoc(msg.id)}
                onDeselectAllDoc={() => handleDeselectAllDoc(msg.id)}
                onImportDoc={() => handleImportDoc(msg.id)}
              />
            ))}
            {error && (
              <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
                {error}
              </p>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Chat Input Bar with Paperclip ── */}
      <div className="shrink-0 border-t border-line bg-surface px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-2">
          {/* File attachment preview chip */}
          {attachedFile && (
            <div className="flex items-center justify-between rounded-xl border border-brand/30 bg-brand-tint/50 px-3.5 py-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-brand shrink-0" aria-hidden />
                <span className="truncate font-semibold text-brand-deep">
                  {attachedFile.name}
                </span>
                <span className="shrink-0 text-[11px] text-muted">
                  ({formatFileSize(attachedFile.size)})
                </span>
              </div>
              <button
                type="button"
                onClick={removeAttachedFile}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted hover:bg-brand/10 hover:text-ink transition-colors"
                aria-label="Remove attached file"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </div>
          )}

          {/* Input & Action buttons */}
          <div className="flex items-end gap-2 sm:gap-3">
            {/* Paperclip Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              onChange={handleFileChange}
              className="sr-only"
              tabIndex={-1}
              aria-hidden
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              title="Attach syllabus or document (PDF, DOCX, TXT)"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-2 text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-brand focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-40"
              aria-label="Attach document"
            >
              <Paperclip className="h-4 w-4" aria-hidden />
            </button>

            {/* Textarea container */}
            <div className="flex-1 rounded-xl border border-line bg-surface-2 px-4 py-2.5 focus-within:border-brand/60 focus-within:ring-2 focus-within:ring-brand/15 transition">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={
                  attachedFile
                    ? 'Add instructions (e.g. prioritize quizzes)... or press Enter to analyze'
                    : 'Ask about tasks, deadlines, or attach a document…'
                }
                rows={1}
                maxLength={800}
                disabled={isProcessing}
                className="block w-full resize-none bg-transparent text-sm text-ink placeholder-muted outline-none disabled:opacity-50"
                aria-label="Chat message"
              />
            </div>

            {/* Send Button */}
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={(!input.trim() && !attachedFile) || isProcessing}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-xs transition hover:bg-brand-deep focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <p className="text-center text-[10px] text-muted">
            Press <kbd className="rounded px-1 py-0.5 bg-surface-2 border border-line font-mono text-[9px]">Enter</kbd> to send ·{' '}
            <kbd className="rounded px-1 py-0.5 bg-surface-2 border border-line font-mono text-[9px]">Shift+Enter</kbd> for new line · Supports PDF, Word, TXT
          </p>
        </div>
      </div>
    </div>
  );
}
