import type { Task, TaskCategory, TaskPriority, TaskStatus } from './types';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** Parse YYYY-MM-DD as a local date (avoids UTC shifting the day). */
export function parseISODate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);

  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);

  return copy;
}

/** Start of the ISO week (Monday). */
export function startOfWeek(date: Date): Date {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);

  return copy;
}

export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  start.setDate(start.getDate() + 6);

  return start;
}

export function formatTime(value: string | null): string {
  if (!value) {
    return 'All day';
  }

  const [hours, minutes] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes ?? 0, 0, 0);

  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/** "Monday, Oct 26" */
export function formatWeekdayDate(value: string): string {
  const date = parseISODate(value);

  return `${WEEKDAYS_LONG[date.getDay()]}, ${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
}

/** "Oct 26, 2026" */
export function formatShortDate(value: string): string {
  const date = parseISODate(value);

  return `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/** "October 2026" */
export function formatMonthLabel(month: string): string {
  const [year, monthIndex] = month.split('-').map(Number);

  return `${MONTHS_LONG[(monthIndex ?? 1) - 1]} ${year}`;
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
}

export function monthGrid(month: string): Date[] {
  const [year, monthIndex] = month.split('-').map(Number);
  const first = new Date(year, (monthIndex ?? 1) - 1, 1);
  const gridStart = startOfWeek(first);
  const days: Date[] = [];

  for (let index = 0; index < 42; index += 1) {
    days.push(addDays(gridStart, index));
  }

  return days;
}

export const WEEKDAY_LABELS = WEEKDAYS_SHORT;

/** Relative section label used by the Upcoming timeline. */
export function relativeDayLabel(value: string): string {
  const date = parseISODate(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (diff === 0) {
    return 'Today';
  }

  if (diff === 1) {
    return 'Tomorrow';
  }

  if (diff === -1) {
    return 'Yesterday';
  }

  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);

  if (target >= weekStart && target <= weekEnd) {
    return 'Later this week';
  }

  const nextWeekEnd = addDays(weekEnd, 7);

  if (target > weekEnd && target <= nextWeekEnd) {
    return 'Next week';
  }

  return 'Beyond next week';
}

/** Group tasks by their due date, preserving chronological order. */
export function groupTasksByDate(tasks: Task[]): { date: string; tasks: Task[] }[] {
  const groups = new Map<string, Task[]>();

  for (const task of tasks) {
    const bucket = groups.get(task.due_date);

    if (bucket) {
      bucket.push(task);
    } else {
      groups.set(task.due_date, [task]);
    }
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({ date, tasks: items }));
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function isOverdue(task: Task): boolean {
  if (task.status !== 'pending') {
    return false;
  }

  const today = todayISO();

  if (task.due_date < today) {
    return true;
  }

  if (task.due_date > today) {
    return false;
  }

  if (!task.due_time) {
    return false;
  }

  const now = new Date();
  const [hours, minutes] = task.due_time.split(':').map(Number);
  const due = new Date();
  due.setHours(hours, minutes ?? 0, 0, 0);

  return due.getTime() < now.getTime();
}

export const categoryStyles: Record<TaskCategory, string> = {
  Work: 'bg-brand-soft text-brand-strong',
  Personal: 'bg-amber-soft text-amber',
  Health: 'bg-rose-soft text-rose',
  Errands: 'bg-info-soft text-info',
};

export const priorityStyles: Record<TaskPriority, string> = {
  Low: 'bg-surface-2 text-muted border border-line',
  Medium: 'bg-brand-soft text-brand-strong',
  High: 'bg-danger-soft text-danger',
};

export const statusLabels: Record<TaskStatus, string> = {
  pending: 'Pending',
  completed: 'Done',
  cancelled: 'Cancelled',
};
