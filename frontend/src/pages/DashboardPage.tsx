import { CalendarDays, CheckCircle2, ListTodo, Plus, SearchX } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiHolidayBanner } from '../components/ai/AiHolidayBanner';
import { FilterPills } from '../components/tasks/FilterPills';
import { MetricCard } from '../components/tasks/MetricCard';
import { RightRail } from '../components/tasks/RightRail';
import { TaskRow } from '../components/tasks/TaskRow';
import { Button } from '../components/ui/Button';
import { EmptyState, InlineError, PanelSkeleton } from '../components/ui/Feedback';
import { useDashboard, useTasks } from '../hooks/useTasks';
import { formatShortDate, todayISO } from '../lib/format';
import { CATEGORIES, type Task, type TaskCategory } from '../lib/types';
import { useSearch } from '../stores/search';
import { useUI } from '../stores/ui';

type CategoryFilter = 'All' | TaskCategory;

const CATEGORY_OPTIONS: { label: string; value: CategoryFilter }[] = [
  { label: 'All', value: 'All' },
  ...CATEGORIES.map((category) => ({ label: category, value: category })),
];

export function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboard();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryFilter>('All');
  const { normalized } = useSearch();
  const { openAddTask } = useUI();
  const navigate = useNavigate();

  const dateQuery = useTasks({
    date: selectedDate ?? undefined,
    per_page: 100,
    enabled: Boolean(selectedDate),
  });

  const scheduledDate = selectedDate ?? todayISO();
  const baseTasks = useMemo<Task[]>(
    () => (selectedDate ? dateQuery.data?.tasks ?? [] : data?.today_tasks ?? []),
    [selectedDate, dateQuery.data, data],
  );

  const visibleTasks = useMemo(() => {
    return baseTasks.filter((task) => {
      if (category !== 'All' && task.category !== category) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return (
        task.title.toLowerCase().includes(normalized) ||
        (task.notes ?? '').toLowerCase().includes(normalized) ||
        task.category.toLowerCase().includes(normalized) ||
        task.priority.toLowerCase().includes(normalized)
      );
    });
  }, [baseTasks, category, normalized]);

  const milestoneTasks = [...(data?.today_tasks ?? []), ...(data?.upcoming_preview ?? [])];
  const loadingList = selectedDate ? dateQuery.isLoading : isLoading;

  return (
    <div className="flex flex-col gap-6">
      <AiHolidayBanner />

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
        <MetricCard
          icon={<ListTodo className="h-7 w-7" aria-hidden />}
          value={isLoading ? '—' : (data?.metrics.today_total ?? 0)}
          label="Today's Tasks"
          tone="brand"
        />
        <MetricCard
          icon={<CheckCircle2 className="h-7 w-7" aria-hidden />}
          value={isLoading ? '—' : (data?.metrics.today_completed ?? 0)}
          label="Completed Today"
          tone="mint"
        />
        <MetricCard
          icon={<CalendarDays className="h-7 w-7" aria-hidden />}
          value={isLoading ? '—' : (data?.metrics.pending_actions ?? 0)}
          label="Pending Actions"
          tone="amber"
          onClick={() => navigate('/pending')}
        />
      </section>

      {isError ? (
        <InlineError message="We couldn't load your dashboard." onRetry={() => void refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_420px] 2xl:grid-cols-[minmax(0,1fr)_506px]">
          <section className="flex min-h-[520px] flex-col rounded-[18px] border border-line bg-surface p-5 lg:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold tracking-[-0.01em] text-ink sm:text-xl">
                  {selectedDate ? 'Schedule for' : "Today's Schedule"}{' '}
                  <span className="font-semibold text-muted">
                    ({formatShortDate(scheduledDate)})
                  </span>
                </h2>
                <p className="mt-1 text-xs text-muted">
                  {selectedDate
                    ? 'Viewing a single day. Clear the filter to return to today.'
                    : 'Focus on the tasks that make today count.'}
                </p>
              </div>
              <FilterPills
                options={CATEGORY_OPTIONS}
                value={category}
                onChange={setCategory}
                label="Filter today's schedule by category"
              />
            </div>

            <div className="mt-5 flex flex-1 flex-col gap-3">
              {loadingList ? (
                <PanelSkeleton rows={4} />
              ) : visibleTasks.length === 0 ? (
                <div className="flex flex-1 items-center">
                  <div className="w-full">
                    <EmptyState
                      icon={<SearchX className="h-5 w-5" aria-hidden />}
                      title={
                        baseTasks.length === 0
                          ? selectedDate
                            ? 'Nothing scheduled for this day'
                            : 'Your day is clear'
                          : 'No tasks match these filters'
                      }
                      description={
                        baseTasks.length === 0
                          ? 'Add a task to give this day a little direction.'
                          : 'Try another category, clear the calendar filter, or search for something else.'
                      }
                      action={
                        <Button
                          size="sm"
                          icon={<Plus className="h-3.5 w-3.5" aria-hidden />}
                          onClick={openAddTask}
                        >
                          Add Task
                        </Button>
                      }
                    />
                  </div>
                </div>
              ) : (
                visibleTasks.map((task) => <TaskRow key={task.id} task={task} />)
              )}
            </div>

            {!loadingList && visibleTasks.length > 0 && (
              <p className="mt-4 border-t border-line pt-3 text-[11px] text-faint">
                Showing {visibleTasks.length} of {baseTasks.length} task
                {baseTasks.length === 1 ? '' : 's'}
                {selectedDate ? ' for the selected day' : ' scheduled for today'}.
              </p>
            )}
          </section>

          <RightRail
            tasks={milestoneTasks}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>
      )}
    </div>
  );
}
