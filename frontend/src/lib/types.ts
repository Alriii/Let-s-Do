export type TaskStatus = 'pending' | 'completed' | 'cancelled';
export type TaskPriority = 'Low' | 'Medium' | 'High';
export type TaskCategory = 'Work' | 'Personal' | 'Health' | 'Errands' | 'School';
export type Theme = 'light' | 'dark';
export type TextSize = 'sm' | 'md' | 'lg' | 'xl';
export type ReminderTarget = 'start_time' | 'end_time';

export const CATEGORIES: TaskCategory[] = ['Work', 'Personal', 'Health', 'Errands', 'School'];
export const PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High'];

export interface Task {
  id: number;
  user_id: number;
  title: string;
  category: TaskCategory;
  due_date: string;
  due_time: string | null;
  start_time?: string | null;
  end_time?: string | null;
  priority: TaskPriority;
  notes: string | null;
  status: TaskStatus;
  cancellation_reason: string | null;
  cancellation_note: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  reminder_sent_at: string | null;
  reminder_enabled?: boolean;
  reminder_target?: ReminderTarget;
  reminder_interval_minutes?: number;
  reminder_count?: number;
  reminders_sent?: number;
  last_reminder_sent_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Preferences {
  theme: Theme;
  task_reminders_enabled: boolean;
  daily_digest_enabled: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  avatar_url: string | null;
  preferences: Preferences;
  created_at?: string;
}

export interface PageMeta {
  current_page: number;
  per_page: number;
  last_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface TaskListResponse {
  tasks: Task[];
  count: number;
  meta: PageMeta;
}

export interface UpcomingSummary {
  total: number;
  due_this_week: number;
  high_priority: number;
}

export interface UpcomingResponse extends TaskListResponse {
  summary: UpcomingSummary;
}

export interface DashboardResponse {
  metrics: {
    today_total: number;
    today_completed: number;
    pending_actions: number;
  };
  today_tasks: Task[];
  upcoming_preview: Task[];
  categories: Record<TaskCategory, number>;
}

export interface CalendarDay {
  date: string;
  total: number;
  pending: number;
  completed: number;
  cancelled: number;
  holiday?: {
    name: string;
    type: 'regular' | 'special'; // regular or special holiday
  } | null;
}

export interface CalendarResponse {
  month: string;
  country: string;
  days: CalendarDay[];
  count: number;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export interface RegisterResponse {
  message: string;
  requires_verification: boolean;
  user: User;
}

export interface ProfileResponse {
  message: string;
  user: User;
}

export interface TaskResponse {
  message: string;
  task: Task;
}

export interface TaskInput {
  title: string;
  category: TaskCategory;
  due_date: string;
  due_time: string | null;
  start_time?: string | null;
  end_time?: string | null;
  reminder_enabled?: boolean;
  reminder_target?: ReminderTarget;
  reminder_interval_minutes?: number;
  reminder_count?: number;
  priority: TaskPriority;
  notes: string | null;
}

export interface HolidayInfo {
  name: string;
  type: string;
  date: string;
  formatted_date: string;
  day_of_week: string;
  days_away?: number;
  is_today?: boolean;
  is_tomorrow?: boolean;
}

export interface AiBriefing {
  headline: string;
  message: string;
  tag: string;
  has_holiday: boolean;
  holiday_name: string | null;
}

export interface HolidayBriefingResponse {
  briefing: AiBriefing;
  upcoming_holidays: HolidayInfo[];
  long_weekend: {
    holiday: HolidayInfo;
    days_away: number;
    type: string;
  } | null;
}

export interface ParseNotesResponse {
  summary: string;
  tasks: TaskInput[];
}

export interface AiConversationSummary {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  messages_count: number;
  preview: string | null;
}

export interface AiConversationDetail {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  messages: {
    id: string;
    role: 'user' | 'model';
    text: string;
    attachment?: {
      name: string;
      size: number;
    } | null;
    extracted_doc?: any | null;
    proposed_schedule?: any | null;
    timestamp: string;
  }[];
}
