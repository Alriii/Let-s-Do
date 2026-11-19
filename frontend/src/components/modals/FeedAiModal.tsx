import {
  AlertCircle,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../../lib/api';
import { categoryStyles, priorityStyles } from '../../lib/format';
import type { ParseNotesResponse, TaskInput } from '../../lib/types';
import { useToast } from '../ui/Toast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface FeedAiModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = 'input' | 'extracting' | 'analyzing' | 'results';

const SAMPLE_SYLLABUS = `HCI Course Project & Syllabus:
1. Submit Figma Wireframes & Design System on Nov 24 at 2:00 PM. High priority.
2. Usability Testing Session with 5 users on Nov 27 from 10:00 AM to 12:00 PM.
3. Final Project Presentation & Defense on Nov 30 at 9:00 AM.
4. Submit Final Source Code & Documentation by Dec 4 at 5:00 PM.`;

const ACCEPTED = '.pdf,.docx,.doc,.txt';
const MAX_MB = 10;

// ─── Step Indicator ─────────────────────────────────────────────────────────

const STEPS = [
  { id: 'input',      label: 'Add Content' },
  { id: 'extracting', label: 'Reading File' },
  { id: 'analyzing',  label: 'AI Analysis' },
  { id: 'results',    label: 'Review' },
] as const;

function StepBar({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center gap-0 px-6 pt-5 sm:px-7" role="list" aria-label="Progress">
      {STEPS.map((step, i) => {
        const done    = i < idx;
        const active  = i === idx;
        return (
          <div key={step.id} className="flex flex-1 items-center" role="listitem">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-200 ${
                  done   ? 'bg-brand text-white'
                  : active ? 'bg-brand text-white ring-4 ring-brand/20'
                           : 'bg-surface-2 text-muted border border-line'
                }`}
              >
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span className={`text-[10px] font-medium whitespace-nowrap ${active ? 'text-brand' : done ? 'text-ink' : 'text-muted'}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`mx-1 mb-4 h-px flex-1 transition-colors duration-300 ${i < idx ? 'bg-brand' : 'bg-line'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Processing Overlay ──────────────────────────────────────────────────────

function ProcessingState({ step }: { step: 'extracting' | 'analyzing' }) {
  const labels = {
    extracting: { title: 'Reading your file…', sub: 'Extracting text content. This takes just a moment.' },
    analyzing:  { title: 'AI is analyzing…',   sub: 'Identifying tasks, deadlines & Philippine holidays.' },
  };
  const { title, sub } = labels[step];

  return (
    <div
      className="flex flex-col items-center justify-center gap-5 py-14"
      aria-busy="true"
      aria-label={title}
    >
      {/* Animated ring */}
      <div className="relative h-14 w-14">
        <svg className="h-14 w-14 -rotate-90 animate-spin" style={{ animationDuration: '1.4s' }} viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="22" fill="none" stroke="currentColor" strokeWidth="3" className="text-line" />
          <circle
            cx="28" cy="28" r="22" fill="none" stroke="currentColor" strokeWidth="3"
            strokeDasharray="138" strokeDashoffset="96" strokeLinecap="round"
            className="text-brand"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-brand" aria-hidden />
        </div>
      </div>
      <div className="text-center">
        <p className="text-[15px] font-semibold text-ink">{title}</p>
        <p className="mt-1 text-[13px] text-muted">{sub}</p>
      </div>
    </div>
  );
}

// ─── File Drop Zone ───────────────────────────────────────────────────────────

function DropZone({
  onFile,
  disabled,
}: {
  onFile: (file: File) => void;
  disabled: boolean;
}) {
  const inputRef  = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = '';
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      aria-label="Upload file — click or drag and drop"
      className={`group flex w-full cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 ${
        dragOver
          ? 'border-brand bg-brand-tint/60 scale-[1.01]'
          : 'border-line bg-surface hover:border-brand/60 hover:bg-brand-tint/30'
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${dragOver ? 'bg-brand/10' : 'bg-surface-2 group-hover:bg-brand-tint'}`}>
        <Upload className={`h-5 w-5 transition-colors ${dragOver ? 'text-brand' : 'text-muted group-hover:text-brand'}`} aria-hidden />
      </div>
      <div>
        <p className="text-[13px] font-semibold text-ink">
          {dragOver ? 'Drop it here' : 'Click to upload or drag & drop'}
        </p>
        <p className="mt-0.5 text-xs text-muted">PDF, DOCX, TXT — up to {MAX_MB} MB</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        onChange={handleChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />
    </button>
  );
}

// ─── Uploaded File Chip ───────────────────────────────────────────────────────

function FileChip({ name, size, onRemove }: { name: string; size: number; onRemove: () => void }) {
  const kb = Math.round(size / 1024);
  const display = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-brand/30 bg-brand-tint/40 px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10">
        <FileText className="h-4 w-4 text-brand" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-ink">{name}</p>
        <p className="text-[11px] text-muted">{display}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted hover:bg-line hover:text-ink transition-colors focus-visible:ring-2 focus-visible:ring-brand/50"
        aria-label="Remove file"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  selected,
  onToggle,
}: {
  task: TaskInput;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      role="checkbox"
      aria-checked={selected}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && onToggle()}
      className={`group flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
        selected
          ? 'border-brand bg-surface shadow-sm'
          : 'border-line bg-surface/60 opacity-55 hover:opacity-80'
      }`}
    >
      {/* Checkbox */}
      <div
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-150 ${
          selected ? 'border-brand bg-brand text-white' : 'border-line bg-surface group-hover:border-brand/50'
        }`}
        aria-hidden
      >
        {selected && <Check className="h-3 w-3" />}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-[14px] font-semibold leading-snug text-ink">{task.title}</p>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${priorityStyles[task.priority]}`}>
              {task.priority}
            </span>
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${categoryStyles[task.category]}`}>
              {task.category}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[12px] text-muted">
          <span className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-brand" aria-hidden />
            {task.due_date}
          </span>
          {task.start_time && (
            <span className="flex items-center gap-1">
              <Clock3 className="h-3 w-3" aria-hidden />
              {task.start_time.slice(0, 5)}
              {task.end_time ? ` – ${task.end_time.slice(0, 5)}` : ''}
            </span>
          )}
          <span className="text-brand font-medium">3 reminders</span>
        </div>

        {task.notes && (
          <p className="line-clamp-1 text-[11px] text-muted/70">{task.notes}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function FeedAiModal({ open, onClose }: FeedAiModalProps) {
  const toast        = useToast();
  const queryClient  = useQueryClient();

  const [step,            setStep]            = useState<Step>('input');
  const [notes,           setNotes]           = useState('');
  const [uploadedFile,    setUploadedFile]    = useState<File | null>(null);
  const [truncationWarn,  setTruncationWarn]  = useState<string | null>(null);
  const [extracted,       setExtracted]       = useState<ParseNotesResponse | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [error,           setError]           = useState<string | null>(null);

  // ── File extraction via backend ──────────────────────────────────────────
  const extractMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.postForm<{ text: string; truncated: boolean; char_count: number; limit: number }>(
        '/ai/extract-file',
        form,
      );
    },
    onSuccess: (data) => {
      setNotes(data.text);
      if (data.truncated) {
        setTruncationWarn(
          `Your document had more than ${data.limit.toLocaleString()} characters. Only the first ${data.char_count.toLocaleString()} characters were sent to the AI for analysis.`,
        );
      }
      setStep('analyzing');
      parseMutation.mutate(data.text);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not read the file. Please try again.');
      setStep('input');
    },
  });

  // ── AI parse notes ───────────────────────────────────────────────────────
  const parseMutation = useMutation({
    mutationFn: (text: string) =>
      api.post<ParseNotesResponse>('/ai/parse-notes', { notes: text }),
    onSuccess: (data) => {
      setExtracted(data);
      setSelectedIndices(data.tasks.map((_, i) => i));
      setError(null);
      setStep('results');
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'AI failed to extract tasks. Please try again.');
      setStep('input');
    },
  });

  // ── Bulk import ──────────────────────────────────────────────────────────
  const importMutation = useMutation({
    mutationFn: (tasksToImport: TaskInput[]) =>
      api.post<{ message: string }>('/ai/import-tasks', { tasks: tasksToImport }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      toast.success(data.message || 'Tasks added to your schedule.');
      handleClose();
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Failed to import tasks. Please try again.');
    },
  });

  const busy = extractMutation.isPending || parseMutation.isPending || importMutation.isPending;

  const handleClose = () => {
    if (busy) return;
    setStep('input');
    setNotes('');
    setUploadedFile(null);
    setTruncationWarn(null);
    setExtracted(null);
    setSelectedIndices([]);
    setError(null);
    onClose();
  };

  const handleFile = (file: File) => {
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${MAX_MB} MB.`);
      return;
    }
    setUploadedFile(file);
    setError(null);
    setTruncationWarn(null);
  };

  const handleAnalyze = () => {
    setError(null);
    if (uploadedFile) {
      setStep('extracting');
      extractMutation.mutate(uploadedFile);
    } else if (notes.trim()) {
      setStep('analyzing');
      parseMutation.mutate(notes.trim());
    }
  };

  const toggleSelect = (index: number) => {
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  const handleImport = () => {
    if (!extracted?.tasks) return;
    const selected = extracted.tasks.filter((_, i) => selectedIndices.includes(i));
    if (selected.length === 0) {
      toast.error('Select at least one task to import.');
      return;
    }
    importMutation.mutate(selected);
  };

  const handleBack = () => {
    setExtracted(null);
    setTruncationWarn(null);
    setSelectedIndices([]);
    setStep('input');
  };

  const isProcessing = step === 'extracting' || step === 'analyzing';
  const canAnalyze   = !busy && (!!uploadedFile || notes.trim().length > 0);

  return (
    <Modal open={open} onClose={busy ? () => undefined : handleClose} size="lg" showClose={false} bodyClassName="p-0">
      <div className="flex max-h-[calc(100vh-3rem)] flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-4 px-6 pt-6 sm:px-7">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft border border-brand/25">
              <Sparkles className="h-4 w-4 text-brand" aria-hidden />
            </div>
            <div>
              <h2 className="text-[17px] font-bold tracking-[-0.01em] text-ink">Import from Notes or File</h2>
              <p className="text-[11px] text-muted">AI extracts tasks and sets email reminders</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted transition-colors hover:bg-line hover:text-ink focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-40"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {/* ── Step Bar (hide during processing) ── */}
        {!isProcessing && <StepBar current={step} />}

        {/* ── Divider ── */}
        <div className="mt-4 h-px bg-line" />

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 sm:px-7">

          {/* Error banner */}
          {error && (
            <div role="alert" className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden />
              <p className="text-[13px] text-red-700">{error}</p>
            </div>
          )}

          {/* Truncation warning */}
          {truncationWarn && step === 'results' && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
              <p className="text-[12px] text-amber-800">{truncationWarn}</p>
            </div>
          )}

          {/* Processing state */}
          {isProcessing && <ProcessingState step={step as 'extracting' | 'analyzing'} />}

          {/* Input state */}
          {step === 'input' && (
            <div className="space-y-4">
              {/* File upload */}
              {uploadedFile ? (
                <FileChip name={uploadedFile.name} size={uploadedFile.size} onRemove={() => { setUploadedFile(null); setNotes(''); }} />
              ) : (
                <DropZone onFile={handleFile} disabled={busy} />
              )}

              {/* OR divider */}
              {!uploadedFile && (
                <>
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-line" />
                    <span className="text-[11px] font-medium text-muted">or paste text directly</span>
                    <div className="h-px flex-1 bg-line" />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label htmlFor="notes-area" className="text-[12px] font-medium text-muted">
                        Syllabus, rubric, or notes
                      </label>
                      <button
                        type="button"
                        onClick={() => setNotes(SAMPLE_SYLLABUS)}
                        className="text-[11px] font-semibold text-brand hover:underline focus-visible:ring-2 focus-visible:ring-brand/40 rounded"
                      >
                        Load sample
                      </button>
                    </div>
                    <textarea
                      id="notes-area"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={7}
                      disabled={busy}
                      placeholder="Paste your course syllabus, assignment deadlines, or meeting notes…"
                      className="w-full resize-none rounded-xl border border-line bg-surface-2 px-4 py-3 text-[13px] text-ink placeholder:text-muted/60 transition-colors focus:border-brand/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand/15 disabled:opacity-50"
                    />
                    {notes.length > 0 && (
                      <p className="mt-1 text-right text-[10px] text-muted">
                        {notes.length.toLocaleString()} / 15,000 characters
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* PH Calendar notice */}
              <div className="flex items-start gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3">
                <span className="mt-px text-sm" aria-hidden>🇵🇭</span>
                <div>
                  <p className="text-[12px] font-semibold text-ink">Philippine Calendar Aware</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                    Holidays like Rizal Day, Bonifacio Day & Holy Week are automatically flagged on tasks that land on them.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Results state */}
          {step === 'results' && extracted && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="rounded-xl border border-brand/25 bg-brand-tint/30 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-bold uppercase tracking-wider text-brand-deep">
                    Analysis Complete
                  </p>
                  <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand-deep">
                    {selectedIndices.length}/{extracted.tasks.length} selected
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-ink leading-relaxed">{extracted.summary}</p>
              </div>

              {/* Select / deselect all */}
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">Tasks to import</p>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedIndices(
                      selectedIndices.length === extracted.tasks.length
                        ? []
                        : extracted.tasks.map((_, i) => i),
                    )
                  }
                  className="text-[11px] font-semibold text-brand hover:underline focus-visible:ring-2 focus-visible:ring-brand/40 rounded"
                >
                  {selectedIndices.length === extracted.tasks.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>

              <div className="space-y-2">
                {extracted.tasks.map((task, idx) => (
                  <TaskCard
                    key={task.title + idx}
                    task={task}
                    selected={selectedIndices.includes(idx)}
                    onToggle={() => toggleSelect(idx)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {!isProcessing && (
          <div className="flex items-center justify-between border-t border-line px-6 py-4 sm:px-7">
            {step === 'results' ? (
              <>
                <Button variant="soft" onClick={handleBack} disabled={busy}>
                  ← Back
                </Button>
                <Button
                  onClick={handleImport}
                  loading={importMutation.isPending}
                  disabled={selectedIndices.length === 0}
                >
                  Add {selectedIndices.length} Task{selectedIndices.length !== 1 ? 's' : ''} to Schedule
                </Button>
              </>
            ) : (
              <>
                <Button variant="soft" onClick={handleClose} disabled={busy}>
                  Cancel
                </Button>
                <Button onClick={handleAnalyze} disabled={!canAnalyze} loading={false}>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  Analyze & Extract
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
