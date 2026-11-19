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
        'group flex min-h-[52px] items-center gap-3 rounded-[14px] border border-line-strong/60 bg-surface px-3.5 py-2.5 shadow-[0_1px_2px_rgba(23,74,50,0.03),inset_0_1px_0_rgba(255,255,255,0.85)] transition-all duration-150 hover:-translate-y-[1px] hover:border-brand/45 hover:shadow-[0_6px_18px_rgba(23,74,50,0.06)] sm:px-4',
        cancelled && 'opacity-70',
        className,
      )}
    >
      {cancelled ? (
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 text-faint">
          <Ban className="h-3.5 w-3.5" aria-hidden />
        </span>
      ) : (
        <button
          type="button"
          onClick={handleToggle}
          disabled={busy}
          aria-label={done ? `Reopen ${task.title}` : `Mark ${task.title} as done`}
          className={clsx(
            'grid h-6 w-6 shrink-0 place-items-center rounded-lg border transition-all duration-150 active:scale-90 disabled:opacity-60',
            done
              ? 'border-brand-strong bg-gradient-to-b from-brand to-brand-strong text-white shadow-xs'
              : 'border-line-strong bg-surface-2 hover:border-brand hover:bg-brand-soft/80',
          )}
        >
          {done ? (
            <Check className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden />
          ) : (
            <Check className="h-3.5 w-3.5 text-transparent transition-colors group-hover:text-brand" aria-hidden />
          )}
        </button>
      )}

      <div className="min-w-0 flex-1">
        <p
          className={clsx(
            'truncate text-[13.5px] font-semibold tracking-[-0.01em]',
            done || cancelled ? 'text-muted line-through opacity-85' : 'text-ink',
            overdue && !done && !cancelled && 'text-danger',
          )}
          title={task.notes ?? task.title}
        >
          {task.title}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-muted sm:hidden">
          <span className={clsx('rounded-full px-2 py-0.5 font-bold', categoryStyles[task.category])}>
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
          <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-brand-strong">
            DONE
          </span>
        )}
        {cancelled && (
          <span className="rounded-full bg-line px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-muted">
            CANCELLED
          </span>
        )}
        {!done && !cancelled && (
          <span
            className={clsx(
              'rounded-full px-2.5 py-0.5 text-[10.5px] font-bold tracking-wide',
              priorityStyles[task.priority],
            )}
          >
            {task.priority}
          </span>
        )}
        <span
          className={clsx(
            'rounded-full px-2.5 py-0.5 text-[10.5px] font-bold tracking-wide',
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
