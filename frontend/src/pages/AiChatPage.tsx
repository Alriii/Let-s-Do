import { Bot, Send, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../stores/auth';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  blocked?: boolean;
  timestamp: Date;
}

interface ChatResponse {
  reply: string;
  blocked: boolean;
}

// ─── Suggested starters ──────────────────────────────────────────────────────

const STARTERS = [
  'What are some tips to beat procrastination?',
  'How should I prioritize my tasks this week?',
  'Is there a Philippine holiday coming up soon?',
  'Help me plan my study schedule for finals.',
];

// ─── Bubble ──────────────────────────────────────────────────────────────────

function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser ? 'bg-brand text-white' : 'bg-brand-soft border border-brand/30'
        }`}
      >
        {isUser ? (
          <span className="text-[11px] font-bold leading-none">
            YOU
          </span>
        ) : (
          <Sparkles className="h-3.5 w-3.5 text-brand" aria-hidden />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-brand text-white rounded-tr-sm'
            : msg.blocked
              ? 'bg-amber-50 border border-amber-200 text-amber-900 rounded-tl-sm'
              : 'bg-surface-2 border border-line text-ink rounded-tl-sm'
        }`}
      >
        {msg.text}
      </div>
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft border border-brand/30">
        <Sparkles className="h-3.5 w-3.5 text-brand" aria-hidden />
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-line bg-surface-2 px-4 py-3">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AiChatPage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    setInput('');
    setError(null);
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      text: msg,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    // Build history for context (last 10 turns)
    const history = messages.slice(-10).map((m) => ({
      role: m.role,
      text: m.text,
    }));

    try {
      const res = await api.post<ChatResponse>('/ai/chat', {
        message: msg,
        history,
      });

      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: 'model',
        text: res.reply,
        blocked: res.blocked,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Something went wrong. Please try again.';
      setError(message);
      // Remove the user message on error
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col">
      {/* ── Header ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-line bg-surface px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft border border-brand/30">
            <Bot className="h-5 w-5 text-brand" aria-hidden />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-ink">LetsDo AI</h1>
            <p className="text-[11px] text-muted">
              Task management &amp; productivity assistant • Philippines 🇵🇭
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

      {/* ── Scope notice ── */}
      <div className="shrink-0 bg-brand-tint border-b border-brand/20 px-6 py-2 text-[11px] text-brand-deep">
        🔒 This AI only discusses <strong>task management, productivity, and Philippine holidays</strong>.
        Off-topic questions will be redirected.
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {isEmpty ? (
          /* Empty state / starters */
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft border border-brand/30">
              <Sparkles className="h-8 w-8 text-brand" aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">
                Hey {firstName}! What's on your mind?
              </h2>
              <p className="mt-1 text-sm text-muted max-w-xs">
                I can help you plan your schedule, beat deadlines, and stay on top of Philippine holidays.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 w-full max-w-sm">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void sendMessage(s)}
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
              <Bubble key={msg.id} msg={msg} />
            ))}
            {loading && <TypingIndicator />}
            {error && (
              <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
                {error}
              </p>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <div className="shrink-0 border-t border-line bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-end gap-3">
          <div className="flex-1 rounded-xl border border-line bg-surface-2 px-4 py-2.5 focus-within:border-brand/60 focus-within:ring-2 focus-within:ring-brand/15 transition">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask about tasks, deadlines, or productivity tips…"
              rows={1}
              maxLength={800}
              className="block w-full resize-none bg-transparent text-sm text-ink placeholder-muted outline-none"
              aria-label="Chat message"
            />
          </div>
          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={!input.trim() || loading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-sm transition hover:bg-brand-deep disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-muted">
          Press <kbd className="rounded px-1 py-0.5 bg-surface-2 border border-line font-mono text-[9px]">Enter</kbd> to send ·{' '}
          <kbd className="rounded px-1 py-0.5 bg-surface-2 border border-line font-mono text-[9px]">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
}
