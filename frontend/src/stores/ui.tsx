import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Task } from '../lib/types';
import { AddTaskModal } from '../components/modals/AddTaskModal';
import { CancelTaskModal } from '../components/modals/CancelTaskModal';
import { FeedAiModal } from '../components/modals/FeedAiModal';
import { PreferencesModal } from '../components/modals/PreferencesModal';

interface UIContextValue {
  openAddTask: () => void;
  openEditTask: (task: Task) => void;
  openCancelTask: (task: Task) => void;
  openPreferences: () => void;
  openFeedAi: () => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [cancellingTask, setCancellingTask] = useState<Task | null>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [feedAiOpen, setFeedAiOpen] = useState(false);

  const openAddTask = useCallback(() => {
    setEditingTask(null);
    setAddOpen(true);
  }, []);

  const openEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setAddOpen(true);
  }, []);

  const openCancelTask = useCallback((task: Task) => {
    setCancellingTask(task);
  }, []);

  const openPreferences = useCallback(() => {
    setPreferencesOpen(true);
  }, []);

  const openFeedAi = useCallback(() => {
    setFeedAiOpen(true);
  }, []);

  const value = useMemo<UIContextValue>(
    () => ({ openAddTask, openEditTask, openCancelTask, openPreferences, openFeedAi }),
    [openAddTask, openEditTask, openCancelTask, openPreferences, openFeedAi],
  );

  return (
    <UIContext.Provider value={value}>
      {children}
      <AddTaskModal
        open={addOpen}
        task={editingTask}
        onClose={() => {
          setAddOpen(false);
          setEditingTask(null);
        }}
      />
      <CancelTaskModal
        task={cancellingTask}
        onClose={() => setCancellingTask(null)}
      />
      <FeedAiModal open={feedAiOpen} onClose={() => setFeedAiOpen(false)} />
      <PreferencesModal open={preferencesOpen} onClose={() => setPreferencesOpen(false)} />
    </UIContext.Provider>
  );
}

export function useUI(): UIContextValue {
  const context = useContext(UIContext);

  if (!context) {
    throw new Error('useUI must be used inside a UIProvider.');
  }

  return context;
}
