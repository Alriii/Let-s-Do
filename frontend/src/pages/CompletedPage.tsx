import { ChevronLeft, ChevronRight, SearchX, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { RightRail } from '../components/tasks/RightRail';
import { TaskRow } from '../components/tasks/TaskRow';
import { Button } from '../components/ui/Button';
import { EmptyState, InlineError, PanelSkeleton } from '../components/ui/Feedback';
import { useCompleted, useUpcoming } from '../hooks/useTasks';
import type { Task } from '../lib/types';
import { useSearch } from '../stores/search';

export function CompletedPage() {
  const [page, setPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useCompleted(page);
  const upcoming = useUpcoming();
  const { normalized } = useSearch();

  const tasks = useMemo<Task[]>(() => data?.tasks ?? [], [data]);
  const meta = data?.meta;

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (selectedDate && task.due_date !== selectedDate) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return (
        task.title.toLowerCase().includes(normalized) ||
        (task.notes ?? '').toLowerCase().includes(normalized) ||
        task.category.toLowerCase().includes(normalized)
      );
    });
  }, [tasks, selectedDate, normalized]);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-center gap-4 rounded-[18px] border border-line bg-surface px-5 py-4 sm:px-6">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-[#fff7ed] text-amber">
          <Trophy className="h-7 w-7" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[24px] font-bold leading-tight tracking-[-0.02em] text-ink">
            {isLoading ? '—' : (meta?.total ?? 0)} Finished Task
            {(meta?.total ?? 0) === 1 ? '' : 's'}
          </p>
          <p className="mt-0.5 text-[13px] text-muted">
            Great job keeping up with your goals!
          </p>
        </div>
        <span className="hidden rounded-full bg-brand-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-brand-strong sm:inline-flex">
          Archive
        </span>
      </section>

      {isError ? (
        <InlineError message="We couldn't load your completed tasks." onRetry={() => void refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_420px] 2xl:grid-cols-[minmax(0,1fr)_506px]">
          <section className="flex min-h-[520px] flex-col rounded-[22px] border border-line-strong/60 bg-surface p-6 shadow-[0_1px_3px_rgba(23,74,50,0.03),0_8px_24px_rgba(23,74,50,0.03),inset_0_1px_0_rgba(255,255,255,0.85)] lg:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-ink sm:text-xl">
                  Archive of Finished Tasks
                </h2>
                <p className="mt-1 text-xs text-muted">
                  {selectedDate
                    ? 'Filtered to the selected day on the calendar.'
                    : 'Your recent wins, newest first.'}
                </p>
              </div>
              {meta && meta.total > 0 && (
                <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-muted">
                  {meta.total} total
                </span>
              )}
            </div>

            <div className="mt-5 flex flex-1 flex-col gap-2.5">
              {isLoading ? (
                <PanelSkeleton rows={5} />
              ) : visibleTasks.length === 0 ? (
                <div className="flex flex-1 items-center">
                  <div className="w-full">
                    <EmptyState
                      icon={<SearchX className="h-5 w-5" aria-hidden />}
                      title={tasks.length === 0 ? 'No completed tasks yet' : 'No matches here'}
                      description={
                        tasks.length === 0
                          ? 'Finish a task and it will show up here as part of your archive.'
                          : 'Try clearing the calendar filter or searching for something else.'
                      }
                    />
                  </div>
                </div>
              ) : (
                visibleTasks.map((task) => <TaskRow key={task.id} task={task} />)
              )}
            </div>

            {meta && meta.last_page > 1 && (
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
                <span className="text-[11px] text-muted">
                  Page {meta.current_page} of {meta.last_page}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<ChevronLeft className="h-3.5 w-3.5" aria-hidden />}
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page >= meta.last_page}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
              </div>
            )}
          </section>

          <RightRail
            tasks={upcoming.data?.tasks ?? []}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>
      )}
    </div>
  );
}
