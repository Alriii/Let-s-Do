import clsx from 'clsx';
import { Ban, Bell, Check } from 'lucide-react';
import { ApiError } from '../../lib/api';
import {
  categoryStyles,
  formatTaskTimeRange,
  isOverdue,
  priorityStyles,
} from '../../lib/format';
import type { Task } from '../../lib/types';
import { useCompleteTask, useReopenTask } from '../../hooks/useTasks';
import { useToast } from '../ui/Toast';
import { TaskActionsMenu } from './TaskActionsMenu';

export function TaskRow({ task, className }: { task: Task; className?: string }) {
  const completeTask = useCompleteTask();
  const reopenTask = useReopenTask();
  const toast = useToast();
  const overdue = isOverdue(task);
  const done = task.status === 'completed';
  const cancelled = task.status === 'cancelled';

  const handleToggle = () => {
    const onError = (error: unknown) =>
      toast.error(error instanceof ApiError ? error.message : 'Unable to update that task.');

    if (done) {
      reopenTask.mutate(task.id, {
        onSuccess: () => toast.success('Task reopened.'),
        onError,
      });
      return;
    }

    completeTask.mutate(task.id, {
      onSuccess: () => toast.success('Nice work — task completed!'),
      onError,
    });
  };

  const busy = completeTask.isPending || reopenTask.isPending;

  return (
    <div
      className={clsx(
        'group flex min-h-12 items-center gap-2.5 rounded-[10px] border border-line bg-surface px-3 py-2 transition-colors hover:border-brand/35 sm:gap-3 sm:px-3.5',
        cancelled && 'opacity-75',
        className,
      )}
    >
      {cancelled ? (
        <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md border border-line text-faint">
          <Ban className="h-3.5 w-3.5" aria-hidden />
        </span>
      ) : (
        <button
          type="button"
          onClick={handleToggle}
          disabled={busy}
          aria-label={done ? `Reopen ${task.title}` : `Mark ${task.title} as done`}
          className={clsx(
            'grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md border transition-colors disabled:opacity-60',
            done
              ? 'border-brand-strong bg-brand-strong text-white'
              : 'border-line-strong bg-surface hover:border-brand hover:bg-brand-tint',
          )}
        >
          {done ? (
            <Check className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Check className="h-3.5 w-3.5 text-transparent transition-colors group-hover:text-brand/40" aria-hidden />
          )}
        </button>
      )}

      <div className="min-w-0 flex-1">
        <p
          className={clsx(
            'truncate text-[13px] font-medium',
            done || cancelled ? 'text-muted line-through' : 'text-ink',
            overdue && !done && !cancelled && 'text-danger',
          )}
          title={task.notes ?? task.title}
        >
          {task.title}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-muted sm:hidden">
          <span className={clsx('rounded px-1.5 py-0.5 font-medium', categoryStyles[task.category])}>
            {task.category}
          </span>
          {task.reminder_enabled && (
            <Bell className="h-3 w-3 text-brand" aria-label="Reminder active" />
          )}
          <span>{formatTaskTimeRange(task)}</span>
        </p>
      </div>

      <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
        {done && (
          <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[10px] font-bold tracking-wide text-brand-strong">
            DONE
          </span>
        )}
        {cancelled && (
          <span className="rounded-md bg-line px-2 py-0.5 text-[10px] font-bold tracking-wide text-muted">
            CANCELLED
          </span>
        )}
        {!done && !cancelled && (
          <span
            className={clsx(
              'rounded-md px-2 py-0.5 text-[10.5px] font-medium',
              priorityStyles[task.priority],
            )}
          >
            {task.priority}
          </span>
        )}
        <span
          className={clsx(
            'rounded-md px-2 py-0.5 text-[10.5px] font-medium',
            categoryStyles[task.category],
          )}
        >
          {task.category}
        </span>
      </div>

      <span
        className={clsx(
          'hidden shrink-0 text-right text-[11.5px] md:flex md:items-center md:gap-1.5',
          overdue && !done && !cancelled ? 'font-semibold text-danger' : 'text-muted',
        )}
      >
        {task.reminder_enabled && (
          <span
            className="flex items-center text-brand"
            title={`Email reminder enabled (${task.reminder_count ?? 3}x every ${task.reminder_interval_minutes ?? 5}m)`}
          >
            <Bell className="h-3 w-3 shrink-0" aria-hidden />
          </span>
        )}
        <span>{formatTaskTimeRange(task)}</span>
      </span>

      <TaskActionsMenu task={task} />
    </div>
  );
}
