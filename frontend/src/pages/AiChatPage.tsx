import {
  AlertCircle,
  Calendar,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  History,
  Loader2,
  MessageSquare,
  PanelLeftClose,
  Paperclip,
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import { categoryStyles, priorityStyles } from '../lib/format';
import type { AiConversationDetail, AiConversationSummary, ParseNotesResponse, TaskInput } from '../lib/types';
import { useToast } from '../components/ui/Toast';
import botAvatarImg from '../assets/bot-avatar.png';

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

interface ProposedScheduleData {
  tasks: TaskInput[];
  selectedIndices: number[];
  imported?: boolean;
  importing?: boolean;
}

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
  proposedSchedule?: ProposedScheduleData;
}

interface ChatResponse {
  reply: string;
  proposed_tasks?: TaskInput[] | null;
  blocked: boolean;
  conversation_id?: number;
  user_message_id?: string;
  ai_message_id?: string;
  title?: string;
}

const STARTERS = [
  'What are some gentle tips to beat procrastination?',
  'Help me organize and prioritize my schedule this week!',
  'Is there a Philippine holiday coming up soon?',
  'Help me plan my study schedule for finals.',
];

const MAX_FILE_MB = 10;
const ACCEPTED_FILE_TYPES = '.pdf,.docx,.doc,.txt';

function formatFileSize(bytes: number): string {
  const kb = Math.round(bytes / 1024);
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

/**
 * Format message text with rich styling:
 * - Converts markdown **bold** into <strong> elements (eliminating literal asterisks).
 * - Converts stray leading * or - bullet points into neat sparkle emojis.
 * - Preserves emojis, spacing, and paragraph line breaks.
 */
function renderFormattedText(text: string) {
  // Replace accidental leading bullet asterisks or hyphens
  const sanitized = text
    .replace(/^\s*[\*\-]\s+/gm, '✨ ')
    .replace(/\n\s*[\*\-]\s+/g, '\n✨ ');

  const paragraphs = sanitized.split('\n\n');

  return paragraphs.map((para, paraIdx) => {
    const lines = para.split('\n');
    return (
      <p key={paraIdx} className={paraIdx > 0 ? 'mt-2.5' : ''}>
        {lines.map((line, lineIdx) => {
          // Parse **bold text**
          const parts = line.split(/(\*\*.*?\*\*)/g);
          return (
            <span key={lineIdx} className="block min-h-[1.3em]">
              {parts.map((part, partIdx) => {
                if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
                  const inner = part.slice(2, -2);
                  return (
                    <strong key={partIdx} className="font-bold text-inherit">
                      {inner}
                    </strong>
                  );
                }
                return part;
              })}
            </span>
          );
        })}
      </p>
    );
  });
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
          <p className="text-base font-semibold text-ink leading-snug">{task.title}</p>
          <div className="flex shrink-0 items-center gap-1.5">
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                priorityStyles[task.priority]
              }`}
            >
              {task.priority}
            </span>
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                categoryStyles[task.category]
              }`}
            >
              {task.category}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted">
          <span className="flex items-center gap-1 font-medium text-ink-soft">
            <Calendar className="h-3.5 w-3.5 text-brand" aria-hidden />
            {task.due_date}
          </span>
          {task.start_time && (
            <span className="flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" aria-hidden />
              {task.start_time.slice(0, 5)}
              {task.end_time ? ` – ${task.end_time.slice(0, 5)}` : ''}
            </span>
          )}
          <span className="text-brand font-medium">3 email alerts</span>
        </div>

        {task.notes && (
          <p className="line-clamp-1 text-xs text-muted/80">{task.notes}</p>
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
      <div className="rounded-xl border border-brand/25 bg-brand-tint/30 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand">
              <FileText className="h-4 w-4" aria-hidden />
            </div>
            <span className="truncate text-sm font-semibold text-brand-deep">
              {doc.fileName}
            </span>
            <span className="shrink-0 text-xs text-muted">
              ({formatFileSize(doc.fileSize)})
            </span>
          </div>
          <span className="shrink-0 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-bold text-brand-deep">
            {count} / {doc.tasks.length} selected
          </span>
        </div>
        <p className="mt-2 text-sm text-ink leading-relaxed">{doc.summary}</p>
      </div>

      {/* Truncation warning if applicable */}
      {doc.truncatedNotice && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <span>{doc.truncatedNotice}</span>
        </div>
      )}

      {/* Tasks review list */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">
            Extracted Tasks & Deadlines
          </span>
          {!doc.imported && (
            <button
              type="button"
              onClick={allSelected ? onDeselectAll : onSelectAll}
              className="text-xs font-semibold text-brand hover:underline"
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
      <div className="pt-1.5">
        {doc.imported ? (
          <div className="flex items-center gap-2 rounded-xl border border-brand/30 bg-brand-soft px-4 py-3 text-sm font-semibold text-brand-deep">
            <CheckCircle2 className="h-4.5 w-4.5 text-brand" aria-hidden />
            <span>
              {count} task{count !== 1 ? 's' : ''} added to your schedule! You can view them in Home or Upcoming.
            </span>
          </div>
        ) : (
          <button
            type="button"
            disabled={count === 0 || doc.importing}
            onClick={onImport}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 px-5 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-deep focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {doc.importing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Adding tasks to schedule…
              </>
            ) : (
              <>
                <CalendarPlus className="h-4 w-4" aria-hidden />
                Add {count} Selected Task{count !== 1 ? 's' : ''} to Schedule
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Proposed Schedule Confirmation (Lumi directly suggests a schedule) ───────

function ProposedScheduleConfirmation({
  schedule,
  onToggleIndex,
  onSelectAll,
  onDeselectAll,
  onImport,
}: {
  schedule: ProposedScheduleData;
  onToggleIndex: (index: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onImport: () => void;
}) {
  const count = schedule.selectedIndices.length;
  const allSelected = count === schedule.tasks.length && count > 0;

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-brand/30 bg-surface/90 p-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-line pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-brand/10 text-brand text-sm">
            📋
          </span>
          <div>
            <h4 className="text-sm font-bold text-ink">
              Proposed Schedule Confirmation
            </h4>
            <p className="text-xs text-muted">
              Lumi prepared {schedule.tasks.length} task{schedule.tasks.length !== 1 ? 's' : ''}. Double-check and confirm before adding:
            </p>
          </div>
        </div>
        {!schedule.imported && (
          <button
            type="button"
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="text-xs font-semibold text-brand hover:underline"
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {schedule.tasks.map((task, idx) => (
          <ChatTaskCard
            key={task.title + idx}
            task={task}
            selected={schedule.selectedIndices.includes(idx)}
            disabled={schedule.imported || schedule.importing}
            onToggle={() => onToggleIndex(idx)}
          />
        ))}
      </div>

      <div className="pt-1">
        {schedule.imported ? (
          <div className="flex items-center gap-2 rounded-xl border border-brand/30 bg-brand-soft px-4 py-3 text-sm font-semibold text-brand-deep">
            <CheckCircle2 className="h-4.5 w-4.5 text-brand" aria-hidden />
            <span>
              {count} task{count !== 1 ? 's' : ''} added to your schedule! You can view them in Home or Upcoming. 🎉
            </span>
          </div>
        ) : (
          <button
            type="button"
            disabled={count === 0 || schedule.importing}
            onClick={onImport}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 px-5 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-deep focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {schedule.importing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Adding tasks to schedule…
              </>
            ) : (
              <>
                <CalendarPlus className="h-4 w-4" aria-hidden />
                Confirm & Add {count} Task{count !== 1 ? 's' : ''} to Schedule 💚
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
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {stepsMeta.map((s, i) => {
            const isDone = i < currentIdx;
            const isCurrent = i === currentIdx;
            return (
              <div key={s.id} className="flex items-center gap-1.5">
                <span
                  className={`flex h-6 items-center gap-1 rounded-full px-2.5 font-medium transition-colors ${
                    isDone
                      ? 'bg-brand/15 text-brand font-bold'
                      : isCurrent
                        ? 'bg-brand text-white font-bold ring-2 ring-brand/20'
                        : 'bg-surface-2 text-muted border border-line'
                  }`}
                >
                  {isDone ? (
                    <Check className="h-3 w-3 stroke-[3]" />
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
      <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface/80 px-4 py-3 text-sm text-ink">
        <Loader2 className="h-4 w-4 animate-spin text-brand shrink-0" aria-hidden />
        <span className="font-medium text-ink-soft">{label}</span>
      </div>
    </div>
  );
}

// ─── Message Bubble Component ─────────────────────────────────────────────────

function Bubble({
  msg,
  onToggleDocIndex,
  onSelectAllDoc,
  onDeselectAllDoc,
  onImportDoc,
  onToggleScheduleIndex,
  onSelectAllSchedule,
  onDeselectAllSchedule,
  onImportSchedule,
}: {
  msg: Message;
  onToggleDocIndex?: (index: number) => void;
  onSelectAllDoc?: () => void;
  onDeselectAllDoc?: () => void;
  onImportDoc?: () => void;
  onToggleScheduleIndex?: (index: number) => void;
  onSelectAllSchedule?: () => void;
  onDeselectAllSchedule?: () => void;
  onImportSchedule?: () => void;
}) {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex gap-3.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      {isUser ? (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-xs">
          <span className="text-xs font-bold leading-none">YOU</span>
        </div>
      ) : (
        <img
          src={botAvatarImg}
          alt="Lumi"
          className="mt-0.5 h-8 w-8 shrink-0 rounded-full object-cover border border-brand/35 shadow-xs bg-brand-soft"
        />
      )}

      {/* Bubble Container */}
      <div
        className={`max-w-[88%] sm:max-w-[80%] rounded-2xl px-5 py-3.5 text-base sm:text-[16px] leading-[1.65] ${
          isUser
            ? 'bg-brand text-white rounded-tr-xs shadow-xs'
            : msg.blocked
              ? 'bg-amber-50 border border-amber-200 text-amber-900 rounded-tl-xs'
              : 'bg-surface-2 border border-line text-ink rounded-tl-xs shadow-xs'
        }`}
      >
        {/* User attachment pill */}
        {isUser && msg.attachment && (
          <div className="mb-2.5 flex items-center gap-2 rounded-lg bg-white/20 px-3 py-2 text-sm font-medium text-white">
            <Paperclip className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{msg.attachment.name}</span>
            <span className="shrink-0 text-white/80 text-xs">
              ({formatFileSize(msg.attachment.size)})
            </span>
          </div>
        )}

        {/* Text content with bold & emoji formatting (no asterisks) */}
        {msg.text && (
          <div className="leading-relaxed">
            {renderFormattedText(msg.text)}
          </div>
        )}

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

        {/* Proposed Schedule Confirmation inside AI bubble */}
        {msg.proposedSchedule && onToggleScheduleIndex && onSelectAllSchedule && onDeselectAllSchedule && onImportSchedule && (
          <ProposedScheduleConfirmation
            schedule={msg.proposedSchedule}
            onToggleIndex={onToggleScheduleIndex}
            onSelectAll={onSelectAllSchedule}
            onDeselectAll={onDeselectAllSchedule}
            onImport={onImportSchedule}
          />
        )}
      </div>
    </div>
  );
}

// ─── Conversation Sidebar ─────────────────────────────────────────────────────

function ConversationSidebar({
  conversations,
  activeId,
  loading,
  searchQuery,
  onSearchChange,
  onSelect,
  onDelete,
  onNewChat,
}: {
  conversations: AiConversationSummary[];
  activeId: number | null;
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onNewChat: () => void;
}) {
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.preview ?? '').toLowerCase().includes(q),
    );
  }, [conversations, searchQuery]);

  return (
    <div className="flex w-64 shrink-0 flex-col border-r border-line bg-surface-2 overflow-hidden">
      {/* Sidebar header */}
      <div className="flex shrink-0 items-center justify-between px-3 py-3 border-b border-line">
        <span className="text-sm font-bold text-ink">Chat History</span>
        <button
          type="button"
          onClick={onNewChat}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-brand-soft hover:text-brand transition-colors"
          title="New chat"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {/* Search */}
      <div className="shrink-0 px-3 py-2 border-b border-line">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search chats…"
            className="flex-1 bg-transparent text-xs text-ink placeholder-muted outline-none"
          />
          {searchQuery && (
            <button type="button" onClick={() => onSearchChange('')} className="text-muted hover:text-ink">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-muted">
            <MessageSquare className="h-8 w-8 opacity-30" aria-hidden />
            <p className="text-xs">
              {searchQuery ? 'No chats match your search.' : 'No past chats yet. Start one below!'}
            </p>
          </div>
        ) : (
          <ul className="py-1">
            {filtered.map((conv) => (
              <li key={conv.id}>
                <button
                  type="button"
                  onClick={() => onSelect(conv.id)}
                  className={`group relative w-full px-3 py-2.5 text-left transition-colors hover:bg-brand-soft ${
                    activeId === conv.id ? 'bg-brand-soft border-r-2 border-brand' : ''
                  }`}
                >
                  <p className={`truncate text-xs font-semibold leading-snug ${activeId === conv.id ? 'text-brand-deep' : 'text-ink'}`}>
                    {conv.title}
                  </p>
                  {conv.preview && (
                    <p className="mt-0.5 truncate text-[11px] text-muted leading-snug">
                      {conv.preview}
                    </p>
                  )}
                  <p className="mt-0.5 text-[10px] text-muted/70">
                    {formatRelativeTime(conv.updated_at)}
                  </p>
                  {/* Delete button (shows on hover) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conv.id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex h-6 w-6 items-center justify-center rounded-md text-muted hover:bg-red-100 hover:text-red-600 transition-colors"
                    title="Delete this conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Main AI Chat Page ────────────────────────────────────────────────────────

export function AiChatPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // History sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [conversations, setConversations] = useState<AiConversationSummary[]>([]);
  const [convLoading, setConvLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Load conversation list on mount
  useEffect(() => {
    void (async () => {
      setConvLoading(true);
      try {
        const data = await api.get<AiConversationSummary[]>('/ai/conversations');
        setConversations(data);
      } catch {
        // ignore silently
      } finally {
        setConvLoading(false);
      }
    })();
  }, []);

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

  // ─── Load a past conversation ──────────────────────────────────────────────

  const loadConversation = async (id: number) => {
    setHistoryLoading(true);
    setError(null);
    try {
      const detail = await api.get<AiConversationDetail>(`/ai/conversations/${id}`);
      const loaded: Message[] = detail.messages.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'model',
        text: m.text,
        timestamp: new Date(m.timestamp),
        attachment: m.attachment ? { name: m.attachment.name, size: m.attachment.size } : undefined,
        proposedSchedule: m.proposed_schedule
          ? {
              tasks: m.proposed_schedule as TaskInput[],
              selectedIndices: (m.proposed_schedule as TaskInput[]).map((_, i) => i),
              imported: false,
            }
          : undefined,
      }));
      setMessages(loaded);
      setActiveConversationId(id);
    } catch {
      toast.error('Could not load that conversation.');
    } finally {
      setHistoryLoading(false);
    }
  };

  // ─── Start a new chat ─────────────────────────────────────────────────────

  const startNewChat = () => {
    setMessages([]);
    setError(null);
    setAttachedFile(null);
    setActiveConversationId(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // ─── Delete a conversation ────────────────────────────────────────────────

  const deleteConversation = async (id: number) => {
    try {
      await api.delete(`/ai/conversations/${id}`);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        startNewChat();
      }
      toast.success('Conversation deleted.');
    } catch {
      toast.error('Could not delete conversation.');
    }
  };

  // ─── Send handler (Text or Document) ──────────────────────────────────────

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

    // Check if user is affirming a pending schedule confirmation from Lumi's last response
    const lastAiMsg = [...messages].reverse().find(
      (m) => m.role === 'model' && m.proposedSchedule && !m.proposedSchedule.imported,
    );
    const isAffirmation = /^(yes|yeah|yep|sure|ok|okay|confirm|add|add them|add it|do it|go ahead|please add)/i.test(
      textToSend.trim(),
    );
    if (lastAiMsg && isAffirmation && lastAiMsg.proposedSchedule) {
      void handleImportSchedule(lastAiMsg.id);
    }

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
      // ── File Analysis Flow with Inline Progression ──────────────────────────
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
                      'Lumi is analyzing tasks, milestones, deadlines & Philippine holidays…',
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
                  text: `I've analyzed **${fileToSend.name}** and mapped out your schedule with automated reminders! 💚 Here's what I found:`,
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
                  text: `Sorry, I encountered an issue reading that document: ${errorMsg}. Please try uploading again or pasting the text directly! 🌿`,
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
          label: 'Lumi is thinking…',
        },
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg, initialAiMsg]);

      // Build conversation history (up to last 10 turns, safe character length per turn)
      const history = messages.slice(-10).map((m) => ({
        role: m.role,
        text: m.text.slice(0, 4000),
      }));

      try {
        const res = await api.post<ChatResponse>('/ai/chat', {
          message: textToSend,
          history,
          conversation_id: activeConversationId,
        });

        // Update active conversation ID from backend
        if (res.conversation_id) {
          const newId = res.conversation_id;
          setActiveConversationId(newId);

          // Update or prepend this conversation in sidebar list
          setConversations((prev) => {
            const exists = prev.find((c) => c.id === newId);
            if (exists) {
              return [
                { ...exists, title: res.title ?? exists.title, preview: textToSend, updated_at: new Date().toISOString() },
                ...prev.filter((c) => c.id !== newId),
              ];
            }
            return [
              {
                id: newId,
                title: res.title ?? textToSend.slice(0, 60),
                preview: textToSend,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                messages_count: 1,
              },
              ...prev,
            ];
          });
        }

        let cleanReply = res.reply;
        let proposedTasks: TaskInput[] | null = res.proposed_tasks || null;

        // Fallback: If proposed_tasks was not parsed by backend but present in text block
        if (!proposedTasks) {
          const match = cleanReply.match(/```(?:json:tasks|json)?\s*(\[\s*\{.*?\}\s*\])\s*```/s);
          if (match) {
            try {
              const parsed = JSON.parse(match[1]);
              if (Array.isArray(parsed) && parsed.length > 0) {
                proposedTasks = parsed as TaskInput[];
                cleanReply = cleanReply.replace(match[0], '').trim();
              }
            } catch {
              // ignore json parse error
            }
          }
        }

        // Clean any stray asterisk bullets at line starts
        cleanReply = cleanReply.replace(/^\s*[\*\-]\s+/gm, '✨ ');

        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMessageId
              ? {
                  ...m,
                  text: cleanReply,
                  blocked: res.blocked,
                  processing: undefined,
                  proposedSchedule: proposedTasks && proposedTasks.length > 0
                    ? {
                        tasks: proposedTasks,
                        selectedIndices: proposedTasks.map((_, i) => i),
                        imported: false,
                        importing: false,
                      }
                    : undefined,
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

  // ─── Extracted Document Card Handlers ─────────────────────────────────────

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

  // ─── Proposed Schedule Confirmation Handlers ───────────────────────────────

  const handleToggleScheduleIndex = useCallback((messageId: string, index: number) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId || !m.proposedSchedule) return m;
        const current = m.proposedSchedule.selectedIndices;
        const next = current.includes(index)
          ? current.filter((i) => i !== index)
          : [...current, index];
        return {
          ...m,
          proposedSchedule: {
            ...m.proposedSchedule,
            selectedIndices: next,
          },
        };
      }),
    );
  }, []);

  const handleSelectAllSchedule = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId || !m.proposedSchedule) return m;
        return {
          ...m,
          proposedSchedule: {
            ...m.proposedSchedule,
            selectedIndices: m.proposedSchedule.tasks.map((_, i) => i),
          },
        };
      }),
    );
  }, []);

  const handleDeselectAllSchedule = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId || !m.proposedSchedule) return m;
        return {
          ...m,
          proposedSchedule: {
            ...m.proposedSchedule,
            selectedIndices: [],
          },
        };
      }),
    );
  }, []);

  const handleImportSchedule = useCallback(
    async (messageId: string) => {
      const msg = messages.find((m) => m.id === messageId);
      if (!msg?.proposedSchedule) return;

      const { tasks, selectedIndices } = msg.proposedSchedule;
      const tasksToImport = tasks.filter((_, i) => selectedIndices.includes(i));

      if (tasksToImport.length === 0) {
        toast.error('Please select at least one task to add.');
        return;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && m.proposedSchedule
            ? { ...m, proposedSchedule: { ...m.proposedSchedule, importing: true } }
            : m,
        ),
      );

      try {
        const res = await api.post<{ message: string }>('/ai/import-tasks', {
          tasks: tasksToImport,
        });

        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['calendar'] });

        toast.success(res.message || 'Tasks added to your schedule! 💚');

        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId && m.proposedSchedule
              ? {
                  ...m,
                  proposedSchedule: {
                    ...m.proposedSchedule,
                    importing: false,
                    imported: true,
                  },
                }
              : m,
          ),
        );
      } catch (err) {
        const errorText =
          err instanceof ApiError ? err.message : 'Failed to add tasks to schedule.';
        toast.error(errorText);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId && m.proposedSchedule
              ? { ...m, proposedSchedule: { ...m.proposedSchedule, importing: false } }
              : m,
          ),
        );
      }
    },
    [messages, queryClient, toast],
  );

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-1 min-h-0 rounded-[20px] border border-line bg-surface shadow-xs overflow-hidden">
      {/* ── History Sidebar ── */}
      {sidebarOpen && (
        <ConversationSidebar
          conversations={conversations}
          activeId={activeConversationId}
          loading={convLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelect={(id) => void loadConversation(id)}
          onDelete={(id) => void deleteConversation(id)}
          onNewChat={startNewChat}
        />
      )}

      {/* ── Main Chat Area ── */}
      <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
        {/* ── Header ── */}
        <div className="flex shrink-0 items-center justify-between border-b border-line bg-surface px-4 py-3">
          {/* Left: History toggle + Lumi identity */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-brand transition-colors"
              title={sidebarOpen ? "Close history" : "Open chat history"}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-[18px] w-[18px]" aria-hidden />
              ) : (
                <History className="h-[18px] w-[18px]" aria-hidden />
              )}
            </button>

            {/* Thin vertical divider */}
            <span className="h-6 w-px bg-line shrink-0" aria-hidden />

            <img
              src={botAvatarImg}
              alt="Lumi"
              className="h-9 w-9 shrink-0 rounded-full object-cover border border-brand/35 shadow-xs bg-brand-soft"
            />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-ink leading-tight">Lumi</h1>
              <p className="text-[11px] sm:text-xs text-muted truncate">
                Lumi, your Let&apos;s Do! AI companion • Philippine Calendar aware 🇵🇭
              </p>
            </div>
          </div>

          {/* Right: New Chat button */}
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={startNewChat}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-surface-2 hover:text-ink transition-colors"
                title="New chat"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                New Chat
              </button>
            )}
          </div>
        </div>

        {/* ── Scope Notice ── */}
        <div className="shrink-0 bg-brand-tint border-b border-brand/20 px-6 py-2.5 text-xs sm:text-sm text-brand-deep">
          💚 <strong>Lumi</strong> is here for <strong>task planning, deadlines, syllabus breakdown, and schedule advice</strong>. Attach notes or files below!
        </div>

        {/* ── History Loading Overlay ── */}
        {historyLoading && (
          <div className="shrink-0 flex items-center gap-2 justify-center border-b border-line bg-surface/80 px-6 py-2 text-xs text-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />
            Loading conversation…
          </div>
        )}

        {/* ── Messages Stream (Only this section scrolls) ── */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 sm:px-6">
          {isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
              <div className="flex items-center justify-center">
                <img
                  src={botAvatarImg}
                  alt="Lumi, your Let's Do! AI companion"
                  className="h-32 w-32 object-contain drop-shadow-md animate-scale-in"
                />
              </div>
              <div className="flex flex-col items-center text-center max-w-xl mx-auto">
                <h2 className="text-xl sm:text-2xl font-bold text-ink text-center">
                  Hi! I'm Lumi! Ready to make today productive? 💚
                </h2>
                <p className="mt-2 text-sm sm:text-base text-muted max-w-md mx-auto text-center leading-relaxed">
                  I'm here to remind you about deadlines, organize your schedule, celebrate your wins, and gently keep procrastination away!
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 w-full max-w-lg">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void handleSend(s)}
                    className="rounded-xl border border-line bg-surface px-4 py-3 text-left text-sm font-medium text-ink hover:border-brand/40 hover:bg-brand-soft transition-colors shadow-2xs"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5 max-w-2xl mx-auto">
              {messages.map((msg) => (
                <Bubble
                  key={msg.id}
                  msg={msg}
                  onToggleDocIndex={(idx) => handleToggleDocIndex(msg.id, idx)}
                  onSelectAllDoc={() => handleSelectAllDoc(msg.id)}
                  onDeselectAllDoc={() => handleDeselectAllDoc(msg.id)}
                  onImportDoc={() => handleImportDoc(msg.id)}
                  onToggleScheduleIndex={(idx) => handleToggleScheduleIndex(msg.id, idx)}
                  onSelectAllSchedule={() => handleSelectAllSchedule(msg.id)}
                  onDeselectAllSchedule={() => handleDeselectAllSchedule(msg.id)}
                  onImportSchedule={() => handleImportSchedule(msg.id)}
                />
              ))}
              {error && (
                <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </p>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* ── Chat Input Bar with Paperclip ── */}
        <div className="shrink-0 border-t border-line bg-surface px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-2xl flex-col gap-2.5">
            {/* File attachment preview chip */}
            {attachedFile && (
              <div className="flex items-center justify-between rounded-xl border border-brand/30 bg-brand-tint/60 px-4 py-2.5 text-sm">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="h-4.5 w-4.5 text-brand shrink-0" aria-hidden />
                  <span className="truncate font-semibold text-brand-deep">
                    {attachedFile.name}
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    ({formatFileSize(attachedFile.size)})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={removeAttachedFile}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted hover:bg-brand/10 hover:text-ink transition-colors"
                  aria-label="Remove attached file"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            )}

            {/* Input & Action buttons */}
            <div className="flex items-end gap-2.5 sm:gap-3">
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
                <Paperclip className="h-4.5 w-4.5" aria-hidden />
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
                      ? 'Add instructions for Lumi (e.g. prioritize quizzes)... or press Enter to analyze'
                      : 'Ask Lumi about tasks, deadlines, or attach a document…'
                  }
                  rows={1}
                  maxLength={2000}
                  disabled={isProcessing}
                  className="block w-full resize-none bg-transparent text-base text-ink placeholder-muted outline-none disabled:opacity-50"
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
                <Send className="h-4.5 w-4.5" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
