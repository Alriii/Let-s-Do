import { BellRing, CalendarDays, Check, Clock3, Sparkles, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../../lib/api';
import { todayISO } from '../../lib/format';
import { CATEGORIES, PRIORITIES, type ReminderTarget, type Task, type TaskCategory, type TaskInput, type TaskPriority } from '../../lib/types';
import { useCreateTask, useUpdateTask } from '../../hooks/useTasks';
import { useToast } from '../ui/Toast';
import { Button } from '../ui/Button';
import { Field, Input, Select, Textarea, useFieldId } from '../ui/Field';
import { Modal } from '../ui/Modal';

interface AddTaskModalProps {
  open: boolean;
  task: Task | null;
  onClose: () => void;
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? 'bg-brand' : 'bg-line-strong'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

const emptyForm = (): TaskInput => ({
  title: '',
  category: 'Work',
  due_date: todayISO(),
  due_time: '',
  start_time: '',
  end_time: '',
  reminder_enabled: true,
  reminder_target: 'start_time',
  reminder_interval_minutes: 5,
  reminder_count: 3,
  priority: 'Medium',
  notes: '',
});

export function AddTaskModal({ open, task, onClose }: AddTaskModalProps) {
  const toast = useToast();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const [form, setForm] = useState<TaskInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const titleId = useFieldId('task-title');
  const categoryId = useFieldId('task-category');
  const dueDateId = useFieldId('task-due-date');
  const startTimeId = useFieldId('task-start-time');
  const endTimeId = useFieldId('task-end-time');
  const intervalId = useFieldId('task-reminder-interval');
  const countId = useFieldId('task-reminder-count');
  const notesId = useFieldId('task-notes');

  useEffect(() => {
    if (!open) {
      return;
    }

    setError(null);
    setFieldErrors({});

    if (task) {
      setForm({
        title: task.title,
        category: task.category,
        due_date: task.due_date,
        due_time: task.due_time ?? '',
        start_time: task.start_time ?? task.due_time ?? '',
        end_time: task.end_time ?? task.due_time ?? '',
        reminder_enabled: task.reminder_enabled ?? false,
        reminder_target: (task.reminder_target as ReminderTarget) ?? 'start_time',
        reminder_interval_minutes: task.reminder_interval_minutes ?? 5,
        reminder_count: task.reminder_count ?? 3,
        priority: task.priority,
        notes: task.notes ?? '',
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, task]);

  const set = <Key extends keyof TaskInput>(key: Key, value: TaskInput[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) {
        return current;
      }

      const next = { ...current };
      delete next[key];

      return next;
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const startTime = form.start_time?.trim() ? form.start_time.trim() : null;
    const endTime = form.end_time?.trim() ? form.end_time.trim() : null;
    const dueTime = form.due_time?.trim()
      ? form.due_time.trim()
      : (endTime ?? startTime);

    const payload: TaskInput = {
      ...form,
      title: form.title.trim(),
      notes: form.notes?.trim() ? form.notes.trim() : null,
      due_time: dueTime,
      start_time: startTime ?? dueTime,
      end_time: endTime ?? dueTime,
      reminder_enabled: Boolean(form.reminder_enabled),
      reminder_target: form.reminder_target ?? 'start_time',
      reminder_interval_minutes: Number(form.reminder_interval_minutes ?? 5),
      reminder_count: Number(form.reminder_count ?? 3),
    };

    try {
      if (task) {
        await updateTask.mutateAsync({ id: task.id, input: payload });
        toast.success('Task updated.');
      } else {
        await createTask.mutateAsync(payload);
        toast.success('Task added to your schedule.');
      }

      onClose();
    } catch (caught) {
      if (caught instanceof ApiError) {
        const nextFieldErrors: Record<string, string> = {};

        for (const [key, messages] of Object.entries(caught.errors)) {
          if (messages[0]) {
            nextFieldErrors[key] = messages[0];
          }
        }

        setFieldErrors(nextFieldErrors);
        setError(nextFieldErrors.title ?? caught.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    }
  };

  const busy = createTask.isPending || updateTask.isPending;

  const reminderCount = Number(form.reminder_count ?? 3);
  const reminderInterval = Number(form.reminder_interval_minutes ?? 5);
  const anchorLabel = form.reminder_target === 'end_time' ? 'deadline / ends' : 'starts';

  const scheduleOffsets: string[] = [];
  for (let i = reminderCount; i >= 1; i--) {
    scheduleOffsets.push(`${i * reminderInterval}m`);
  }

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      size="lg"
      showClose={false}
      bodyClassName="p-0"
    >
      <form onSubmit={submit} className="flex max-h-[calc(100vh-3rem)] flex-col">
        <div className="flex items-start justify-between gap-4 px-6 pt-6 sm:px-7">
          <div>
            <span className="inline-flex rounded-full bg-brand-tint px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-deep">
              {task ? 'Edit task' : 'New task'}
            </span>
            <h2 className="mt-3 text-[26px] font-bold leading-tight tracking-[-0.02em] text-ink">
              {task ? 'Edit Task' : 'Add New Task'}
            </h2>
            <p className="mt-1.5 text-[13px] text-muted">
              {task
                ? 'Update the details and keep your day moving forward.'
                : 'Create a task and keep your day moving forward.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-raised hover:text-ink disabled:opacity-50"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 sm:px-7">
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-[10px] border border-danger/20 bg-danger/10 px-4 py-3 text-xs text-danger"
            >
              {error}
            </div>
          )}

          <Field
            label="Task Title"
            htmlFor={titleId}
            required
            error={fieldErrors.title}
          >
            <Input
              id={titleId}
              value={form.title}
              onChange={(event) => set('title', event.target.value)}
              placeholder="e.g., Review project proposal"
              autoFocus
              invalid={Boolean(fieldErrors.title)}
            />
          </Field>

          <div className="mt-4">
            <Field
              label="Category"
              htmlFor={categoryId}
              required
              error={fieldErrors.category}
            >
              <Select
                id={categoryId}
                value={form.category}
                onChange={(event) => set('category', event.target.value as TaskCategory)}
                invalid={Boolean(fieldErrors.category)}
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Due Date" htmlFor={dueDateId} error={fieldErrors.due_date}>
              <div className="relative">
                <Input
                  id={dueDateId}
                  type="date"
                  value={form.due_date}
                  onChange={(event) => set('due_date', event.target.value)}
                  className="pr-9 [&::-webkit-calendar-picker-indicator]:opacity-0"
                  invalid={Boolean(fieldErrors.due_date)}
                />
                <CalendarDays
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                  aria-hidden
                />
              </div>
            </Field>

            <Field
              label="Start Time"
              htmlFor={startTimeId}
              hint="Optional"
              error={fieldErrors.start_time}
            >
              <div className="relative">
                <Input
                  id={startTimeId}
                  type="time"
                  value={form.start_time ?? ''}
                  onChange={(event) => {
                    const val = event.target.value;
                    set('start_time', val);
                    if (!form.due_time) {
                      set('due_time', val);
                    }
                  }}
                  className="pr-9 [&::-webkit-calendar-picker-indicator]:opacity-0"
                  invalid={Boolean(fieldErrors.start_time)}
                />
                <Clock3
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                  aria-hidden
                />
              </div>
            </Field>

            <Field
              label="End Time"
              htmlFor={endTimeId}
              hint="Optional"
              error={fieldErrors.end_time}
            >
              <div className="relative">
                <Input
                  id={endTimeId}
                  type="time"
                  value={form.end_time ?? ''}
                  onChange={(event) => {
                    const val = event.target.value;
                    set('end_time', val);
                    if (form.reminder_target === 'end_time' || !form.due_time) {
                      set('due_time', val);
                    }
                  }}
                  className="pr-9 [&::-webkit-calendar-picker-indicator]:opacity-0"
                  invalid={Boolean(fieldErrors.end_time)}
                />
                <Clock3
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                  aria-hidden
                />
              </div>
            </Field>
          </div>

          {/* Email Reminders Box */}
          <div className="mt-4 rounded-xl border border-line bg-surface-raised p-4 transition-all">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand-deep">
                  <BellRing className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-ink">Email Reminders</p>
                  <p className="text-[12px] text-muted">
                    Automated email alerts before your task begins or ends
                  </p>
                </div>
              </div>
              <Toggle
                label="Enable email reminders"
                checked={Boolean(form.reminder_enabled)}
                onChange={(enabled) => set('reminder_enabled', enabled)}
              />
            </div>

            {form.reminder_enabled && (
              <div className="mt-4 space-y-3.5 border-t border-line/70 pt-3.5">
                <div>
                  <p className="text-[12px] font-medium text-ink-soft">Remind me for</p>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => set('reminder_target', 'start_time')}
                      className={`flex flex-col rounded-lg border p-2.5 text-left transition-all ${
                        form.reminder_target === 'start_time'
                          ? 'border-brand bg-brand-tint/50 text-brand-deep'
                          : 'border-line bg-surface text-muted hover:border-brand/40 hover:text-ink'
                      }`}
                    >
                      <span className="text-[12px] font-semibold">Upcoming Task</span>
                      <span className="text-[11px] opacity-80">Remind before start time</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => set('reminder_target', 'end_time')}
                      className={`flex flex-col rounded-lg border p-2.5 text-left transition-all ${
                        form.reminder_target === 'end_time'
                          ? 'border-brand bg-brand-tint/50 text-brand-deep'
                          : 'border-line bg-surface text-muted hover:border-brand/40 hover:text-ink'
                      }`}
                    >
                      <span className="text-[12px] font-semibold">Task Deadline</span>
                      <span className="text-[11px] opacity-80">Remind before deadline ends</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Reminder Interval" htmlFor={intervalId}>
                    <Select
                      id={intervalId}
                      value={form.reminder_interval_minutes ?? 5}
                      onChange={(event) => set('reminder_interval_minutes', Number(event.target.value))}
                    >
                      <option value={1}>Every 1 minute (Fast test)</option>
                      <option value={5}>Every 5 minutes (Recommended)</option>
                      <option value={10}>Every 10 minutes</option>
                      <option value={15}>Every 15 minutes</option>
                      <option value={30}>Every 30 minutes</option>
                    </Select>
                  </Field>

                  <Field label="Total Reminders" htmlFor={countId}>
                    <Select
                      id={countId}
                      value={form.reminder_count ?? 3}
                      onChange={(event) => set('reminder_count', Number(event.target.value))}
                    >
                      <option value={1}>1 email</option>
                      <option value={2}>2 emails</option>
                      <option value={3}>3 emails (Recommended)</option>
                      <option value={5}>5 emails</option>
                    </Select>
                  </Field>
                </div>

                <div className="flex items-start gap-2 rounded-lg bg-brand-tint/60 px-3 py-2 text-[12px] text-brand-deep">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                  <p className="leading-relaxed">
                    You will receive <strong>{reminderCount} email reminders</strong> ({scheduleOffsets.join(', ')} before) before your task {anchorLabel}.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4">
            <p className="text-[13px] font-medium text-ink-soft">Priority</p>
            <div className="mt-1.5 grid grid-cols-3 gap-2.5">
              {PRIORITIES.map((priority: TaskPriority) => {
                const active = form.priority === priority;

                return (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => set('priority', priority)}
                    className={
                      active
                        ? 'flex h-11 items-center justify-center gap-2 rounded-[10px] border border-brand bg-brand-tint text-sm font-semibold text-brand-deep'
                        : 'flex h-11 items-center justify-center gap-2 rounded-[10px] border border-line-strong bg-surface text-sm text-muted transition-colors hover:border-brand/50 hover:text-ink'
                    }
                    aria-pressed={active}
                  >
                    {active && <Check className="h-3.5 w-3.5" aria-hidden />}
                    {priority}
                  </button>
                );
              })}
            </div>
            {fieldErrors.priority && (
              <p className="mt-1.5 text-xs font-medium text-danger">{fieldErrors.priority}</p>
            )}
          </div>

          <div className="mt-4">
            <Field
              label="Notes"
              htmlFor={notesId}
              hint="Optional"
              error={fieldErrors.notes}
            >
              <Textarea
                id={notesId}
                rows={3}
                value={form.notes ?? ''}
                onChange={(event) => set('notes', event.target.value)}
                placeholder="Add additional notes..."
                maxLength={500}
              />
            </Field>
            <p className="mt-1 text-right text-[11px] text-faint">
              {(form.notes ?? '').length} / 500
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-line px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <p className="text-xs text-faint">You can update task details anytime.</p>
          <div className="flex gap-2.5">
            <Button variant="soft" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              {task ? 'Save Changes' : 'Add Task'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
