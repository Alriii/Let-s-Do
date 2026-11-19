import { Check, Clock3, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
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

const SAMPLE_SYLLABUS = `HCI Course Project & Syllabus:
1. Submit Figma Wireframes & Design System on Nov 24 at 2:00 PM. High priority.
2. Usability Testing Session with 5 users on Nov 27 from 10:00 AM to 12:00 PM.
3. Final Project Presentation & Defense on Nov 30 at 9:00 AM.
4. Submit Final Source Code & Documentation by Dec 4 at 5:00 PM.`;

export function FeedAiModal({ open, onClose }: FeedAiModalProps) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [notes, setNotes] = useState('');
  const [extracted, setExtracted] = useState<ParseNotesResponse | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Mutation to parse notes with Gemini
  const parseMutation = useMutation({
    mutationFn: (text: string) =>
      api.post<ParseNotesResponse>('/ai/parse-notes', { notes: text }),
    onSuccess: (data) => {
      setExtracted(data);
      setSelectedIndices(data.tasks.map((_, i) => i)); // select all by default
      setError(null);
    },
    onError: (err) => {
      setError(
        err instanceof ApiError ? err.message : 'Failed to extract tasks. Please try again.',
      );
    },
  });

  // Mutation to bulk-import tasks
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
      setError(
        err instanceof ApiError ? err.message : 'Failed to import tasks. Please try again.',
      );
    },
  });

  const handleClose = () => {
    if (parseMutation.isPending || importMutation.isPending) return;
    setNotes('');
    setExtracted(null);
    setSelectedIndices([]);
    setError(null);
    onClose();
  };

  const handleAnalyze = () => {
    if (!notes.trim()) return;
    setError(null);
    parseMutation.mutate(notes.trim());
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
      toast.error('Please select at least one task to import.');
      return;
    }
    importMutation.mutate(selected);
  };

  const busy = parseMutation.isPending || importMutation.isPending;

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : handleClose}
      size="lg"
      showClose={false}
      bodyClassName="p-0"
    >
      <div className="flex max-h-[calc(100vh-3rem)] flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 sm:px-7">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-deep">
              <Sparkles className="h-3 w-3 text-brand" />
              AI Knowledge Ingestion
            </span>
            <h2 className="mt-3 text-[24px] font-bold leading-tight tracking-[-0.02em] text-ink">
              Feed Notes, Syllabus, or Schedule
            </h2>
            <p className="mt-1.5 text-[13px] text-muted">
              Paste course guidelines, assignment rubrics, or messy notes. The AI extracts scheduled tasks and configures automated email reminders.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-raised hover:text-ink disabled:opacity-50"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 sm:px-7">
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-[10px] border border-danger/20 bg-danger/10 px-4 py-3 text-xs text-danger"
            >
              {error}
            </div>
          )}

          {!extracted ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-medium text-ink-soft">
                  Paste Syllabus, Rubric, or Notes:
                </label>
                <button
                  type="button"
                  onClick={() => setNotes(SAMPLE_SYLLABUS)}
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  Insert Sample Syllabus
                </button>
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={8}
                disabled={busy}
                placeholder="Paste your course syllabus, assignment deadlines, or meeting notes here..."
                className="w-full resize-none rounded-xl border border-line-strong bg-surface p-3.5 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
              />

              <div className="rounded-xl border border-line bg-surface-raised p-4">
                <p className="text-[12px] font-semibold text-ink flex items-center gap-1.5">
                  🇵🇭 Philippine Calendar & Holiday Aware
                </p>
                <p className="mt-1 text-[12px] text-muted leading-relaxed">
                  The AI automatically checks the Philippine National Calendar (holidays like Bonifacio Day, Rizal Day, Holy Week) and configures 3 email alerts before each deadline.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-brand/30 bg-brand-tint/40 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-brand-deep">
                    Extracted Schedule Summary
                  </p>
                  <span className="text-xs font-medium text-brand-deep">
                    {selectedIndices.length} of {extracted.tasks.length} selected
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-ink">{extracted.summary}</p>
              </div>

              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider">
                  Select Tasks to Add:
                </p>

                {extracted.tasks.map((task, idx) => {
                  const isSelected = selectedIndices.includes(idx);
                  return (
                    <div
                      key={task.title + idx}
                      onClick={() => toggleSelect(idx)}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all ${
                        isSelected
                          ? 'border-brand bg-surface shadow-xs'
                          : 'border-line bg-surface-raised/50 opacity-60'
                      }`}
                    >
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isSelected}
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                          isSelected
                            ? 'border-brand bg-brand text-white'
                            : 'border-line-strong bg-surface'
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                      </button>

                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[14px] font-semibold text-ink">{task.title}</p>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                priorityStyles[task.priority]
                              }`}
                            >
                              {task.priority}
                            </span>
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                                categoryStyles[task.category]
                              }`}
                            >
                              {task.category}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                          <span>📅 {task.due_date}</span>
                          {task.start_time && (
                            <span className="flex items-center gap-1">
                              <Clock3 className="h-3 w-3" />
                              {task.start_time.slice(0, 5)}
                              {task.end_time ? ` – ${task.end_time.slice(0, 5)}` : ''}
                            </span>
                          )}
                          <span className="text-brand font-medium">
                            ⏰ 3 email reminders
                          </span>
                        </div>

                        {task.notes && (
                          <p className="text-[12px] text-faint line-clamp-1">{task.notes}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-line px-6 py-4 sm:px-7">
          {extracted ? (
            <>
              <Button
                variant="soft"
                onClick={() => setExtracted(null)}
                disabled={busy}
              >
                Back to Notes
              </Button>
              <Button
                onClick={handleImport}
                loading={importMutation.isPending}
                disabled={selectedIndices.length === 0}
              >
                Import {selectedIndices.length} Task(s) to Schedule
              </Button>
            </>
          ) : (
            <>
              <Button variant="soft" onClick={handleClose} disabled={busy}>
                Cancel
              </Button>
              <Button
                onClick={handleAnalyze}
                loading={parseMutation.isPending}
                disabled={!notes.trim()}
              >
                <Sparkles className="mr-1.5 h-4 w-4" />
                Analyze & Extract Tasks
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
