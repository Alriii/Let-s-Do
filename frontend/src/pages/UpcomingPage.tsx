import { CalendarClock, CalendarRange, Flame, Plus, SearchX } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FilterPills } from '../components/tasks/FilterPills';
import { MetricCard } from '../components/tasks/MetricCard';
import { RightRail } from '../components/tasks/RightRail';
import { TaskRow } from '../components/tasks/TaskRow';
import { Button } from '../components/ui/Button';
import { EmptyState, InlineError, PanelSkeleton } from '../components/ui/Feedback';
import { useUpcoming } from '../hooks/useTasks';
import {
  addDays,
  endOfWeek,
  formatShortDate,
  formatWeekdayDate,
  parseISODate,
  relativeDayLabel,
  startOfWeek,
  toISODate,
  todayISO,
} from '../lib/format';
import type { Task } from '../lib/types';
import { useSearch } from '../stores/search';
import { useUI } from '../stores/ui';

type UpcomingFilter = 'all' | 'this-week' | 'next-week' | 'high';

const FILTERS: { label: string; value: UpcomingFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'This Week', value: 'this-week' },
  { label: 'Next Week', value: 'next-week' },
  { label: 'High Priority', value: 'high' },
];

const GROUP_ORDER = [
  'Today',
  'Tomorrow',
  'Later this week',
  'Next week',
  'Beyond next week',
];

function dateRangeLabel(first: string, last: string): string {
  if (first === last) {
    return formatShortDate(first);
  }

  return `${formatShortDate(first)} – ${formatShortDate(last)}`;
}

function groupHeading(label: string, tasks: Task[]): string {
  const dates = tasks.map((task) => task.due_date).sort();
  const first = dates[0];
  const last = dates[dates.length - 1];

  if (label === 'Tomorrow') {
    return `Tomorrow – ${formatWeekdayDate(first)}`;
  }

  if (label === 'Later this week') {
    return `Later This Week (${dateRangeLabel(first, last)})`;
  }

  if (label === 'Next week') {
    return `Next Week (${dateRangeLabel(first, last)})`;
  }

  if (label === 'Beyond next week') {
    return `Next Week & Beyond (${dateRangeLabel(first, last)})`;
  }

  return `${label} – ${formatWeekdayDate(first)}`;
}

export function UpcomingPage() {
  const { data, isLoading, isError, refetch } = useUpcoming();
  const [filter, setFilter] = useState<UpcomingFilter>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { normalized } = useSearch();
  const { openAddTask } = useUI();

  const tasks = useMemo<Task[]>(() => data?.tasks ?? [], [data]);

  const visibleTasks = useMemo(() => {
    const today = parseISODate(todayISO());
    const tomorrow = toISODate(addDays(today, 1));
    const weekEnd = toISODate(endOfWeek(today));
    const nextWeekStart = toISODate(addDays(startOfWeek(today), 7));
    const nextWeekEnd = toISODate(addDays(startOfWeek(today), 13));

    return tasks.filter((task) => {
      if (selectedDate && task.due_date !== selectedDate) {
        return false;
      }

      if (filter === 'this-week' && !(task.due_date >= tomorrow && task.due_date <= weekEnd)) {
        return false;
      }

      if (
        filter === 'next-week' &&
        !(task.due_date >= nextWeekStart && task.due_date <= nextWeekEnd)
      ) {
        return false;
      }

      if (filter === 'high' && task.priority !== 'High') {
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
  }, [tasks, filter, selectedDate, normalized]);

  const groups = useMemo(() => {
    const buckets = new Map<string, Task[]>();

    for (const task of visibleTasks) {
      const label = relativeDayLabel(task.due_date);
      const bucket = buckets.get(label);

      if (bucket) {
        bucket.push(task);
      } else {
        buckets.set(label, [task]);
      }
    }

    return GROUP_ORDER.filter((label) => buckets.has(label)).map((label) => ({
      label,
      tasks: buckets.get(label) ?? [],
    }));
  }, [visibleTasks]);

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
        <MetricCard
          icon={<CalendarRange className="h-7 w-7" aria-hidden />}
          value={isLoading ? '—' : (data?.summary.total ?? 0)}
          label="Total Scheduled"
          tone="brand"
        />
        <MetricCard
          icon={<CalendarClock className="h-7 w-7" aria-hidden />}
          value={isLoading ? '—' : (data?.summary.due_this_week ?? 0)}
          label="Due This Week"
          tone="mint"
        />
        <MetricCard
          icon={<Flame className="h-7 w-7" aria-hidden />}
          value={isLoading ? '—' : (data?.summary.high_priority ?? 0)}
          label="High Priority Focus"
          tone="amber"
        />
      </section>

      {isError ? (
        <InlineError message="We couldn't load your upcoming tasks." onRetry={() => void refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_420px] 2xl:grid-cols-[minmax(0,1fr)_506px]">
          <section className="flex min-h-[560px] flex-col rounded-[22px] border border-line-strong/60 bg-surface p-6 shadow-[0_1px_3px_rgba(23,74,50,0.03),0_8px_24px_rgba(23,74,50,0.03),inset_0_1px_0_rgba(255,255,255,0.85)] lg:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-ink sm:text-xl">
                  Chronological Timeline
                </h2>
                <p className="mt-1 text-xs text-muted">
                  {selectedDate
                    ? `Showing tasks due ${formatShortDate(selectedDate)}.`
                    : 'Plan ahead, one milestone at a time.'}
                </p>
              </div>
              <FilterPills
                options={FILTERS}
                value={filter}
                onChange={setFilter}
                label="Filter upcoming tasks"
              />
            </div>

            <div className="mt-5 flex flex-1 flex-col gap-5">
              {isLoading ? (
                <PanelSkeleton rows={5} />
              ) : groups.length === 0 ? (
                <div className="flex flex-1 items-center">
                  <div className="w-full">
                    <EmptyState
                      icon={<SearchX className="h-5 w-5" aria-hidden />}
                      title={
                        tasks.length === 0
                          ? 'Nothing on the horizon'
                          : 'No tasks match this view'
                      }
                      description={
                        tasks.length === 0
                          ? 'Schedule something for tomorrow or later this week.'
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
                groups.map((group) => (
                  <div key={group.label}>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="flex items-center gap-2 text-[13.5px] font-bold text-ink">
                        <span className="h-2 w-2 rounded-full bg-brand-strong" aria-hidden />
                        {groupHeading(group.label, group.tasks)}
                      </h3>
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
                        {group.tasks.length}
                      </span>
                    </div>
                    <div className="mt-2.5 flex flex-col gap-2.5">
                      {group.tasks.map((task) => (
                        <TaskRow key={task.id} task={task} />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <RightRail
            tasks={tasks}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>
      )}
    </div>
  );
}
