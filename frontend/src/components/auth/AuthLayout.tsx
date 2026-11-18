import { ArrowLeft, CalendarDays, Check, ListChecks, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  children: ReactNode;
  heroTitle: ReactNode;
  heroDescription: string;
  backTo?: string;
  backLabel?: string;
}

function HeroPreview() {
  return (
    <div className="mt-10 hidden overflow-hidden rounded-[18px] border border-line bg-gradient-to-br from-brand-tint via-surface to-surface-2 p-5 shadow-[0_16px_40px_rgba(17,21,20,0.05)] lg:block">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-ink">
          <CalendarDays className="h-4 w-4 text-brand-strong" aria-hidden />
          Today&rsquo;s focus
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-brand-strong">
          <Sparkles className="h-3 w-3" aria-hidden />
          3 tasks
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {[
          { title: 'Quarterly team planning', tag: 'Work', done: true },
          { title: 'Morning workout routine', tag: 'Health', done: true },
          { title: 'Review weekly grocery list', tag: 'Errands', done: false },
        ].map((item) => (
          <div
            key={item.title}
            className="flex items-center gap-3 rounded-[10px] border border-line bg-surface px-3 py-2.5"
          >
            <span
              className={
                item.done
                  ? 'grid h-5 w-5 place-items-center rounded-md bg-brand-strong text-white'
                  : 'h-5 w-5 rounded-md border border-line-strong bg-surface'
              }
            >
              {item.done && <Check className="h-3 w-3" aria-hidden />}
            </span>
            <span
              className={
                item.done
                  ? 'flex-1 truncate text-[12px] text-muted line-through'
                  : 'flex-1 truncate text-[12px] font-medium text-ink'
              }
            >
              {item.title}
            </span>
            <span className="rounded bg-brand-soft px-1.5 py-0.5 text-[9.5px] font-semibold text-brand-strong">
              {item.tag}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-[10px] bg-brand-strong px-3 py-2.5 text-white">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white/15">
          <Check className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold">2 of 3 completed today</p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/25">
            <div className="h-full w-2/3 rounded-full bg-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthLayout({
  children,
  heroTitle,
  heroDescription,
  backTo,
  backLabel,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-5 py-7 sm:px-8 lg:px-14">
        <header className="flex items-center justify-between gap-4">
          <Link to="/login" className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-brand text-white">
              <ListChecks className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-2xl font-bold tracking-[-0.02em] text-ink">Let&rsquo;s Do!</span>
          </Link>

          {backTo && backLabel && (
            <Link
              to={backTo}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {backLabel}
            </Link>
          )}
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1fr_520px] lg:gap-16 xl:gap-24">
          <section className="max-w-[600px]">
            <h2 className="text-[34px] font-bold leading-[1.12] tracking-[-0.03em] text-ink sm:text-[42px] xl:text-[52px] xl:leading-[64px]">
              {heroTitle}
            </h2>
            <p className="mt-5 max-w-[490px] text-[15px] leading-7 text-muted sm:text-[17px]">
              {heroDescription}
            </p>
            <HeroPreview />
          </section>

          <section className="w-full">
            <div className="mx-auto w-full max-w-[520px] rounded-[20px] border border-line bg-surface p-6 shadow-[0_20px_50px_rgba(17,21,20,0.06)] sm:p-9">
              {children}
            </div>
          </section>
        </div>

        <footer className="pb-2 text-center text-[11px] text-faint">
          Let&rsquo;s Do! · Calm focus, steady progress.
        </footer>
      </div>
    </div>
  );
}
