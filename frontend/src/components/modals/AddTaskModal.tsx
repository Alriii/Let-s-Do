import { CalendarDays, Check, Clock3, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../../lib/api';
import { todayISO } from '../../lib/format';
import { CATEGORIES, PRIORITIES, type Task, type TaskCategory, type TaskInput, type TaskPriority } from '../../lib/types';
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

const emptyForm = (): TaskInput => ({
  title: '',
  category: 'Work',
  due_date: todayISO(),
  due_time: '',
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
  const timeId = useFieldId('task-time');
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

    const payload: TaskInput = {
      ...form,
      title: form.title.trim(),
      notes: form.notes?.trim() ? form.notes.trim() : null,
      due_time: form.due_time ? form.due_time : null,
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
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-muted transition-colors hover:bg-line hover:text-ink disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="mt-5 flex-1 overflow-y-auto border-t border-line px-6 py-5 sm:px-7">
          {error && (
            <p className="mb-4 rounded-[10px] border border-danger/25 bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger">
              {error}
            </p>
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
              placeholder="e.g., Morning workout, Team meeting..."
              maxLength={255}
              autoFocus
              invalid={Boolean(fieldErrors.title)}
            />
          </Field>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Category" htmlFor={categoryId} error={fieldErrors.category}>
              <Select
                id={categoryId}
                value={form.category}
                onChange={(event) => set('category', event.target.value as TaskCategory)}
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </Field>

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
              label="Time"
              htmlFor={timeId}
              hint="Optional"
              error={fieldErrors.due_time}
            >
              <div className="relative">
                <Input
                  id={timeId}
                  type="time"
                  value={form.due_time ?? ''}
                  onChange={(event) => set('due_time', event.target.value)}
                  className="pr-9 [&::-webkit-calendar-picker-indicator]:opacity-0"
                  invalid={Boolean(fieldErrors.due_time)}
                />
                <Clock3
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                  aria-hidden
                />
              </div>
            </Field>
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
                rows={4}
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
