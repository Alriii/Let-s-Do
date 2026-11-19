import { Menu, Plus } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useUI } from '../../stores/ui';
import { ProfileMenu } from './ProfileMenu';

const PAGE_COPY: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: "Today's Task Command",
    subtitle: 'Focus on what needs to be done right now today.',
  },
  '/upcoming': {
    title: 'Upcoming Schedule & Timeline',
    subtitle: 'Plan ahead, manage upcoming milestones, and keep your workload balanced.',
  },
  '/pending': {
    title: 'Pending Actions',
    subtitle: 'Everything that still needs your attention, in one place.',
  },
  '/completed': {
    title: 'Completed Achievements',
    subtitle: 'A record of the progress you have already made.',
  },
  '/ai-chat': {
    title: 'Chat with Lumi',
    subtitle: "Lumi, your Let's Do! AI companion · organize your schedule and beat deadlines.",
  },
};

export function Topbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const { pathname } = useLocation();
  const { openAddTask } = useUI();
  const copy = PAGE_COPY[pathname] ?? {
    title: 'Your Workspace',
    subtitle: 'Everything you need to keep moving forward.',
  };

  return (
    <header className="flex min-h-20 items-center justify-between gap-4 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-line bg-surface text-ink lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[26px] xl:text-[28px]">
            {copy.title}
          </h1>
          <p className="mt-1 hidden truncate text-[13px] text-muted sm:block sm:text-sm">
            {copy.subtitle}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={openAddTask}
          className="grid h-10 w-10 place-items-center rounded-[10px] bg-brand text-white transition-colors hover:bg-brand-deep lg:hidden"
          aria-label="Add task"
        >
          <Plus className="h-5 w-5" aria-hidden />
        </button>
        <ProfileMenu />
      </div>
    </header>
  );
}
