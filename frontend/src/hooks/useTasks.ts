import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  CalendarResponse,
  DashboardResponse,
  Task,
  TaskInput,
  TaskListResponse,
  TaskResponse,
  UpcomingResponse,
} from '../lib/types';

export interface TaskQueryParams {
  search?: string;
  category?: string;
  priority?: string;
  status?: string;
  date?: string;
  due_after?: string;
  due_before?: string;
  page?: number;
  per_page?: number;
  enabled?: boolean;
}

function buildQuery(params: TaskQueryParams): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (key === 'enabled' || value === undefined || value === null || value === '') {
      continue;
    }

    search.set(key, String(value));
  }

  const query = search.toString();

  return query ? `?${query}` : '';
}

export const queryKeys = {
  dashboard: ['dashboard'] as const,
  tasks: (params: TaskQueryParams) => ['tasks', params] as const,
  upcoming: ['tasks', 'upcoming'] as const,
  completed: (page: number) => ['tasks', 'completed', page] as const,
  calendar: (month: string) => ['calendar', month] as const,
  profile: ['profile'] as const,
};

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => api.get<DashboardResponse>('/dashboard'),
  });
}

export function useTasks(params: TaskQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.tasks(params),
    queryFn: ({ signal }) => api.get<TaskListResponse>(`/tasks${buildQuery(params)}`, signal),
    enabled: params.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

export function useUpcoming() {
  return useQuery({
    queryKey: queryKeys.upcoming,
    queryFn: () => api.get<UpcomingResponse>('/tasks/upcoming?per_page=100'),
  });
}

export function useCompleted(page = 1) {
  return useQuery({
    queryKey: queryKeys.completed(page),
    queryFn: () => api.get<TaskListResponse>(`/tasks/completed?per_page=100&page=${page}`),
    placeholderData: keepPreviousData,
  });
}

export function useCalendar(month: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.calendar(month),
    queryFn: () => api.get<CalendarResponse>(`/tasks/calendar?month=${month}`),
    enabled,
  });
}

function useInvalidateTaskData() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    void queryClient.invalidateQueries({ queryKey: ['calendar'] });
  };
}

export function useCreateTask() {
  const invalidate = useInvalidateTaskData();

  return useMutation({
    mutationFn: (input: TaskInput) => api.post<TaskResponse>('/tasks', input),
    onSuccess: invalidate,
  });
}

export function useUpdateTask() {
  const invalidate = useInvalidateTaskData();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<TaskInput> }) =>
      api.patch<TaskResponse>(`/tasks/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useCompleteTask() {
  const invalidate = useInvalidateTaskData();

  return useMutation({
    mutationFn: (id: number) => api.patch<TaskResponse>(`/tasks/${id}/complete`),
    onSuccess: invalidate,
  });
}

export function useCancelTask() {
  const invalidate = useInvalidateTaskData();

  return useMutation({
    mutationFn: ({
      id,
      reason,
      note,
    }: {
      id: number;
      reason: string;
      note?: string | null;
    }) =>
      api.patch<TaskResponse>(`/tasks/${id}/cancel`, {
        cancellation_reason: reason,
        cancellation_note: note || null,
      }),
    onSuccess: invalidate,
  });
}

export function useReopenTask() {
  const invalidate = useInvalidateTaskData();

  return useMutation({
    mutationFn: (id: number) => api.patch<TaskResponse>(`/tasks/${id}/reopen`),
    onSuccess: invalidate,
  });
}

export function useDeleteTask() {
  const invalidate = useInvalidateTaskData();

  return useMutation({
    mutationFn: (id: number) => api.delete<{ message: string }>(`/tasks/${id}`),
    onSuccess: invalidate,
  });
}

export function bestMilestone(tasks: Task[]): Task | null {
  const pending = tasks.filter((task) => task.status === 'pending');

  if (pending.length === 0) {
    return null;
  }

  const rank = { High: 0, Medium: 1, Low: 2 } as const;

  return [...pending].sort((a, b) => {
    const byPriority = rank[a.priority] - rank[b.priority];

    if (byPriority !== 0) {
      return byPriority;
    }

    if (a.due_date !== b.due_date) {
      return a.due_date.localeCompare(b.due_date);
    }

    return (a.due_time ?? '99:99').localeCompare(b.due_time ?? '99:99');
  })[0];
}
