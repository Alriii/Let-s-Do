import clsx from 'clsx';
import { Bot, CalendarClock, CircleCheckBig, House, Sparkles, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import botanicalPlantImg from '../../assets/botanical-plant.png';
import logoImg from '../../assets/logo.png';
import { useUI } from '../../stores/ui';
import { Button } from '../ui/Button';

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: House, end: true },
  { to: '/upcoming', label: 'Upcoming', icon: CalendarClock, end: false },
  { to: '/completed', label: 'Completed', icon: CircleCheckBig, end: false },
  { to: '/ai-chat', label: 'AI Chat', icon: Bot, end: false },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { openAddTask, openFeedAi } = useUI();

  return (
    <div className="flex h-full flex-col justify-between px-6 pb-8 pt-9 bg-surface text-ink transition-colors">
      <div className="flex flex-col gap-9">
        <div className="flex items-center gap-3">
          <img
            src={logoImg}
            alt="Let's Do!"
            className="h-11 w-11 rounded-[10px] object-contain shadow-[0_6px_14px_rgba(75,168,110,0.28)]"
          />
          <span className="text-2xl font-bold tracking-[-0.02em] text-ink">
            Let&rsquo;s Do!
          </span>
        </div>

        <nav className="flex flex-col gap-2" aria-label="Primary">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) =>
                clsx(
                  'flex h-12 items-center gap-3 rounded-xl px-3.5 text-[15px] transition-colors',
                  isActive
                    ? 'border border-brand/40 bg-brand-soft font-bold text-brand-strong'
                    : 'font-medium text-ink hover:bg-surface-2',
                )
              }
            >
              <Icon className="h-[18px] w-[18px]" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-col gap-2.5">
          <Button
            className="h-11 w-full rounded-xl"
            onClick={() => {
              onNavigate?.();
              openAddTask();
            }}
          >
            + Add Task
          </Button>

          <Button
            variant="soft"
            className="h-10 w-full rounded-xl gap-2 text-xs font-semibold text-brand-deep hover:border-brand/40"
            onClick={() => {
              onNavigate?.();
              openFeedAi();
            }}
          >
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            Feed AI / Syllabus
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="relative flex h-[90px] w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-brand-tint to-brand-soft border border-line">
          <img
            src={botanicalPlantImg}
            alt="Botanical Plant"
            className="h-[90px] w-auto object-contain"
          />
        </div>
        <p className="max-w-[190px] text-center text-[11px] leading-4 text-muted">
          Rush and you will break,
          <br />
          Slow and you&rsquo;ll be safe.
        </p>
      </div>
    </div>
  );
}

export function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] border-r border-line bg-surface lg:block transition-colors">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-[#111514]/45 animate-fade-in backdrop-blur-[2px]"
            onClick={onClose}
            role="presentation"
          />
          <div className="absolute inset-y-0 left-0 w-[280px] border-r border-line bg-surface shadow-2xl animate-slide-up">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-muted"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
            <SidebarContent onNavigate={onClose} />
          </div>
        </div>
      )}
    </>
  );
}
