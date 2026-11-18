import clsx from 'clsx';
import { CalendarCheck2, Sparkles, Target } from 'lucide-react';
import { ApiError } from '../../lib/api';
import {
  categoryStyles,
  formatShortDate,
  formatTime,
  isOverdue,
} from '../../lib/format';
import type { Task } from '../../lib/types';
import { bestMilestone, useCompleteTask } from '../../hooks/useTasks';
import { useToast } from '../ui/Toast';

export function MilestoneCard({ tasks }: { tasks: Task[] }) {
  const milestone = bestMilestone(tasks);
  const completeTask = useCompleteTask();
  const toast = useToast();

  return (
    <section className="flex flex-col rounded-[18px] border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-brand-strong" aria-hidden />
          <h2 className="text-[15px] font-bold text-ink">Priority Milestone</h2>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-soft px-2 py-0.5 text-[10.5px] font-bold text-amber">
          <Sparkles className="h-3 w-3" aria-hidden />
          Upcoming Focus
        </span>
      </div>

      {milestone ? (
        <div className="mt-4 flex flex-1 flex-col justify-between rounded-[14px] border border-line bg-surface-2 p-4">
          <div>
            <p className="text-[15px] font-bold leading-snug text-ink">{milestone.title}</p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-muted">
              <CalendarCheck2 className="h-3.5 w-3.5" aria-hidden />
              Due {formatShortDate(milestone.due_date)} at {formatTime(milestone.due_time)}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span
                className={clsx(
                  'rounded-md px-2 py-0.5 text-[10.5px] font-medium',
                  categoryStyles[milestone.category],
                )}
              >
                {milestone.category}
              </span>
              <span
                className={clsx(
                  'rounded-md px-2 py-0.5 text-[10.5px] font-semibold',
                  milestone.priority === 'High'
                    ? 'bg-danger-soft text-danger'
                    : 'bg-brand-soft text-brand-strong',
                )}
              >
                {milestone.priority} Priority
              </span>
              {isOverdue(milestone) && (
                <span className="rounded-md bg-danger-soft px-2 py-0.5 text-[10.5px] font-semibold text-danger">
                  Overdue
                </span>
              )}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-3">
            <span className="text-[11.5px] font-medium text-muted">Stay ahead of the curve.</span>
            <button
              type="button"
              onClick={() =>
                completeTask.mutate(milestone.id, {
                  onSuccess: () => toast.success('Milestone completed!'),
                  onError: (error) =>
                    toast.error(
                      error instanceof ApiError ? error.message : 'Unable to complete that task.',
                    ),
                })
              }
              disabled={completeTask.isPending}
              className="text-[12.5px] font-bold text-brand-strong transition-colors hover:text-brand-deep disabled:opacity-60"
            >
              {completeTask.isPending ? 'Completing…' : 'Mark Complete'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-[14px] border border-dashed border-line-strong bg-surface-2 px-4 py-8 text-center">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-soft text-brand-strong">
            <CalendarCheck2 className="h-5 w-5" aria-hidden />
          </span>
          <p className="mt-3 text-[13px] font-semibold text-ink">Nothing pressing ahead</p>
          <p className="mt-1 text-xs text-muted">
            Add a task or schedule something for later this week.
          </p>
        </div>
      )}
    </section>
  );
}
