import { AlertTriangle, ListTodo, Plus, SearchX, Sun } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FilterPills } from '../components/tasks/FilterPills';
import { MetricCard } from '../components/tasks/MetricCard';
import { RightRail } from '../components/tasks/RightRail';
import { TaskRow } from '../components/tasks/TaskRow';
import { Button } from '../components/ui/Button';
import { EmptyState, InlineError, PanelSkeleton } from '../components/ui/Feedback';
import { useTasks } from '../hooks/useTasks';
import { formatShortDate, todayISO } from '../lib/format';
import type { Task } from '../lib/types';
import { useSearch } from '../stores/search';
import { useUI } from '../stores/ui';

type PendingFilter = 'all' | 'overdue' | 'today';

const FILTERS: { label: string; value: PendingFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Today', value: 'today' },
];

export function PendingPage() {
  const { data, isLoading, isError, refetch } = useTasks({
    status: 'pending',
    per_page: 100,
  });
  const [filter, setFilter] = useState<PendingFilter>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { normalized } = useSearch();
  const { openAddTask } = useUI();
  const today = todayISO();

  const allTasks = useMemo<Task[]>(() => data?.tasks ?? [], [data]);

  const visibleTasks = useMemo(() => {
    return allTasks.filter((task) => {
      if (selectedDate && task.due_date !== selectedDate) {
        return false;
      }

      if (filter === 'overdue' && task.due_date >= today) {
        return false;
      }

      if (filter === 'today' && task.due_date !== today) {
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
  }, [allTasks, filter, selectedDate, normalized, today]);

  const overdue = visibleTasks.filter((task) => task.due_date < today);
  const dueToday = visibleTasks.filter((task) => task.due_date === today);
  const later = visibleTasks.filter((task) => task.due_date > today);

  const overdueCount = allTasks.filter((task) => task.due_date < today).length;
  const todayCount = allTasks.filter((task) => task.due_date === today).length;

  const sections = [
    { key: 'overdue', title: 'Overdue', tasks: overdue, tone: 'danger' as const },
    { key: 'today', title: 'Due Today', tasks: dueToday, tone: 'brand' as const },
    { key: 'later', title: 'Later', tasks: later, tone: 'neutral' as const },
  ].filter((section) => section.tasks.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
        <MetricCard
          icon={<ListTodo className="h-7 w-7" aria-hidden />}
          value={isLoading ? '—' : allTasks.length}
          label="Pending Actions"
          tone="brand"
        />
        <MetricCard
          icon={<AlertTriangle className="h-7 w-7" aria-hidden />}
          value={isLoading ? '—' : overdueCount}
          label="Overdue"
          tone="amber"
        />
        <MetricCard
          icon={<Sun className="h-7 w-7" aria-hidden />}
          value={isLoading ? '—' : todayCount}
          label="Due Today"
          tone="mint"
        />
      </section>

      {isError ? (
        <InlineError message="We couldn't load your pending tasks." onRetry={() => void refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_420px] 2xl:grid-cols-[minmax(0,1fr)_506px]">
          <section className="flex min-h-[560px] flex-col rounded-[18px] border border-line bg-surface p-5 lg:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold tracking-[-0.01em] text-ink sm:text-xl">
                  Needs Your Attention
                </h2>
                <p className="mt-1 text-xs text-muted">
                  {selectedDate
                    ? `Showing pending tasks for ${formatShortDate(selectedDate)}.`
                    : 'Clear what is overdue, then make room for today.'}
                </p>
              </div>
              <FilterPills
                options={FILTERS}
                value={filter}
                onChange={setFilter}
                label="Filter pending tasks"
              />
            </div>

            <div className="mt-5 flex flex-1 flex-col gap-6">
              {isLoading ? (
                <PanelSkeleton rows={5} />
              ) : sections.length === 0 ? (
                <div className="flex flex-1 items-center">
                  <div className="w-full">
                    <EmptyState
                      icon={<SearchX className="h-5 w-5" aria-hidden />}
                      title={allTasks.length === 0 ? 'All clear' : 'No tasks match this view'}
                      description={
                        allTasks.length === 0
                          ? 'You have no pending tasks. Add something new or enjoy the breathing room.'
                          : 'Try a different filter, clear the calendar selection, or search again.'
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
                sections.map((section) => (
                  <div key={section.key}>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="flex items-center gap-2 text-[13.5px] font-bold text-ink">
                        <span
                          className={
                            section.tone === 'danger'
                              ? 'h-2 w-2 rounded-full bg-danger'
                              : section.tone === 'brand'
                                ? 'h-2 w-2 rounded-full bg-brand-strong'
                                : 'h-2 w-2 rounded-full bg-muted'
                          }
                          aria-hidden
                        />
                        {section.title}
                      </h3>
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
                        {section.tasks.length}
                      </span>
                    </div>
                    <div className="mt-2.5 flex flex-col gap-2.5">
                      {section.tasks.map((task) => (
                        <TaskRow key={task.id} task={task} />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <RightRail
            tasks={allTasks}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>
      )}
    </div>
  );
}
