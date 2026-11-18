import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ApiError } from '../../lib/api';
import type { Task } from '../../lib/types';
import { useCancelTask } from '../../hooks/useTasks';
import { useToast } from '../ui/Toast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

const REASONS = [
  'Postponed / Rescheduled',
  'No longer needed / Irrelevant',
  'Duplicate task',
  'Other reason / Blocked by dependency',
] as const;

interface CancelTaskModalProps {
  task: Task | null;
  onClose: () => void;
}

export function CancelTaskModal({ task, onClose }: CancelTaskModalProps) {
  const toast = useToast();
  const cancelTask = useCancelTask();
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setReason(REASONS[0]);
      setNote('');
      setError(null);
    }
  }, [task]);

  const confirm = async () => {
    if (!task) {
      return;
    }

    setError(null);

    try {
      await cancelTask.mutateAsync({ id: task.id, reason, note });
      toast.success('Task cancelled.');
      onClose();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Unable to cancel this task right now.',
      );
    }
  };

  return (
    <Modal
      open={Boolean(task)}
      onClose={cancelTask.isPending ? () => undefined : onClose}
      size="sm"
    >
      <div className="-mt-2">
        <p className="text-[13px] text-muted">Please select a reason for canceling this task:</p>

        {task && (
          <p className="mt-3 truncate rounded-[10px] border border-line bg-surface-2 px-3 py-2 text-[13px] font-medium text-ink">
            {task.title}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2" role="radiogroup" aria-label="Cancellation reason">
          {REASONS.map((option) => {
            const active = reason === option;

            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setReason(option)}
                className={
                  active
                    ? 'flex h-[42px] items-center justify-between gap-3 rounded-lg border border-brand/40 bg-brand-tint px-3.5 text-left text-[13px] font-semibold text-ink'
                    : 'flex h-[42px] items-center justify-between gap-3 rounded-lg border border-line-strong bg-surface px-3.5 text-left text-[13px] text-ink-soft transition-colors hover:border-brand/40 hover:bg-surface-2'
                }
              >
                <span>{option}</span>
                {active && (
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-brand-deep">
                    Default
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <label htmlFor="cancel-note" className="mt-4 block">
          <span className="sr-only">Additional details</span>
          <textarea
            id="cancel-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Additional details or comments (optional)..."
            className="w-full resize-none rounded-lg border border-line-strong bg-surface-2 px-3.5 py-2.5 text-xs text-ink placeholder:text-faint focus:border-brand focus:outline-none"
          />
        </label>

        {error && <p className="mt-2 text-xs font-medium text-danger">{error}</p>}

        <div className="mt-4 flex justify-end gap-2.5">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={cancelTask.isPending}>
            Keep Task
          </Button>
          <Button variant="danger" size="sm" loading={cancelTask.isPending} onClick={confirm}>
            Confirm Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
