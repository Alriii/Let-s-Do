import clsx from 'clsx';
import { Bot, CalendarClock, CircleCheckBig, House, X } from 'lucide-react';
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
  const { openAddTask } = useUI();

  return (
    <div className="flex h-full flex-col justify-between px-6 pb-8 pt-8 bg-surface border-r border-line-strong/60 text-ink transition-colors">
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-3">
          <img
            src={logoImg}
            alt="Let's Do!"
            className="h-11 w-11 rounded-xl object-contain shadow-[0_6px_16px_rgba(69,170,112,0.24)] border border-brand/20"
          />
          <div>
            <span className="block text-xl font-extrabold tracking-tight text-ink">
              Let&rsquo;s Do!
            </span>
            <span className="block text-[11px] font-semibold tracking-wider uppercase text-brand-deep">
              Task Studio
            </span>
          </div>
        </div>

        <nav className="flex flex-col gap-1.5" aria-label="Primary">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) =>
                clsx(
                  'group relative flex h-11 items-center gap-3 rounded-xl px-3.5 text-[14.5px] transition-all duration-150',
                  isActive
                    ? 'border border-brand/30 bg-gradient-to-r from-brand-soft to-brand-soft/85 font-bold text-brand-strong shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_2px_8px_rgba(23,74,50,0.06)]'
                    : 'font-medium text-muted hover:bg-surface-2 hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      className="absolute left-1.5 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-brand"
                      aria-hidden
                    />
                  )}
                  <Icon
                    className={clsx(
                      'h-[18px] w-[18px] transition-colors',
                      isActive ? 'text-brand-strong' : 'text-muted group-hover:text-ink',
                    )}
                    aria-hidden
                  />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div>
          <Button
            className="h-11 w-full rounded-xl"
            onClick={() => {
              onNavigate?.();
              openAddTask();
            }}
          >
            + Add Task
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-2xl border border-line-strong/60 bg-gradient-to-b from-surface via-surface to-brand-soft/20 p-4 text-center shadow-xs">
        <img
          src={botanicalPlantImg}
          alt="Botanical Plant"
          className="h-[80px] w-[105px] object-contain drop-shadow-xs"
        />
        <p className="max-w-[190px] text-center text-[11.5px] font-medium leading-relaxed text-muted">
          &ldquo;Rush and you will break,
          <br />
          Slow and you&rsquo;ll be safe.&rdquo;
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
