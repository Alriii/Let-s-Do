import { Check, MoreHorizontal, Pencil, RotateCcw, Trash2, Ban } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../lib/api';
import type { Task } from '../../lib/types';
import {
  useCompleteTask,
  useDeleteTask,
  useReopenTask,
} from '../../hooks/useTasks';
import { useUI } from '../../stores/ui';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useToast } from '../ui/Toast';

export function TaskActionsMenu({ task }: { task: Task }) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const { openEditTask, openCancelTask } = useUI();
  const completeTask = useCompleteTask();
  const reopenTask = useReopenTask();
  const deleteTask = useDeleteTask();

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const onError = (error: unknown) => {
    toast.error(error instanceof ApiError ? error.message : 'That action could not be completed.');
  };

  const markDone = () => {
    setOpen(false);
    completeTask.mutate(task.id, {
      onSuccess: () => toast.success('Task marked as done.'),
      onError,
    });
  };

  const reopen = () => {
    setOpen(false);
    reopenTask.mutate(task.id, {
      onSuccess: () => toast.success('Task moved back to pending.'),
      onError,
    });
  };

  const remove = () => {
    deleteTask.mutate(task.id, {
      onSuccess: () => {
        toast.success('Task deleted.');
        setConfirmDelete(false);
      },
      onError,
    });
  };

  const itemClass =
    'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors';

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className="grid h-7 w-7 place-items-center rounded-md text-[#64728b] transition-colors hover:bg-surface-2 hover:text-ink"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${task.title}`}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-30 w-[220px] rounded-[10px] border border-line bg-surface p-1.5 shadow-[0_14px_34px_rgba(17,21,20,0.16)] animate-scale-in"
        >
          {task.status === 'pending' && (
            <>
              <button type="button" role="menuitem" className={`${itemClass} text-ink hover:bg-brand-soft`} onClick={markDone}>
                <span className="grid h-5 w-5 place-items-center rounded-md bg-brand-soft text-brand-strong">
                  <Check className="h-3 w-3" aria-hidden />
                </span>
                Mark as Done
              </button>
              <button
                type="button"
                role="menuitem"
                className={`${itemClass} text-ink-soft hover:bg-surface-2`}
                onClick={() => {
                  setOpen(false);
                  openEditTask(task);
                }}
              >
                <span className="grid h-5 w-5 place-items-center rounded-md bg-surface-2 text-muted">
                  <Pencil className="h-3 w-3" aria-hidden />
                </span>
                Edit Task
              </button>
              <div className="my-1.5 h-px bg-line" />
              <button
                type="button"
                role="menuitem"
                className={`${itemClass} text-danger hover:bg-danger-soft`}
                onClick={() => {
                  setOpen(false);
                  openCancelTask(task);
                }}
              >
                <span className="grid h-5 w-5 place-items-center rounded-md bg-danger-soft text-danger">
                  <Ban className="h-3 w-3" aria-hidden />
                </span>
                Remove / Cancel...
              </button>
            </>
          )}

          {task.status !== 'pending' && (
            <>
              <button type="button" role="menuitem" className={`${itemClass} text-ink hover:bg-brand-soft`} onClick={reopen}>
                <span className="grid h-5 w-5 place-items-center rounded-md bg-brand-soft text-brand-strong">
                  <RotateCcw className="h-3 w-3" aria-hidden />
                </span>
                Reopen Task
              </button>
              {task.status === 'cancelled' && (
                <button
                  type="button"
                  role="menuitem"
                  className={`${itemClass} text-ink-soft hover:bg-surface-2`}
                  onClick={() => {
                    setOpen(false);
                    openEditTask(task);
                  }}
                >
                  <span className="grid h-5 w-5 place-items-center rounded-md bg-surface-2 text-muted">
                    <Pencil className="h-3 w-3" aria-hidden />
                  </span>
                  Edit Task
                </button>
              )}
              <div className="my-1.5 h-px bg-line" />
              <button
                type="button"
                role="menuitem"
                className={`${itemClass} text-danger hover:bg-danger-soft`}
                onClick={() => {
                  setOpen(false);
                  setConfirmDelete(true);
                }}
              >
                <span className="grid h-5 w-5 place-items-center rounded-md bg-danger-soft text-danger">
                  <Trash2 className="h-3 w-3" aria-hidden />
                </span>
                Delete Task
              </button>
            </>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this task?"
        description={
          <>
            <strong className="font-semibold text-ink">{task.title}</strong> will be permanently
            removed. This cannot be undone.
          </>
        }
        confirmLabel="Delete Task"
        loading={deleteTask.isPending}
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}
