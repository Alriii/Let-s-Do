import { Calendar, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { HolidayBriefingResponse } from '../../lib/types';
import botAvatarImg from '../../assets/bot-avatar.png';

export function AiHolidayBanner() {
  const [dismissed, setDismissed] = useState(false);

  const { data, isLoading } = useQuery<HolidayBriefingResponse>({
    queryKey: ['ai-holiday-briefing'],
    queryFn: () => api.get<HolidayBriefingResponse>('/ai/holiday-briefing'),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  if (dismissed || isLoading || !data?.briefing) {
    return null;
  }

  const { briefing, upcoming_holidays, long_weekend } = data;
  const isHoliday = briefing.has_holiday;

  return (
    <aside
      aria-label="Lumi daily briefing"
      className={`relative mb-6 overflow-hidden rounded-[24px] border p-5 sm:p-6 md:p-7 transition-all ${
        isHoliday
          ? 'border-brand/35 bg-gradient-to-br from-brand-soft/85 via-surface to-peach-soft/35 shadow-[0_6px_28px_rgba(23,74,50,0.08),0_1px_3px_rgba(23,74,50,0.04),inset_0_1px_0_rgba(255,255,255,0.95)]'
          : 'border-line-strong/70 bg-gradient-to-br from-surface via-surface to-brand-soft/25 shadow-[0_4px_24px_rgba(23,74,50,0.05),0_1px_3px_rgba(23,74,50,0.03),inset_0_1px_0_rgba(255,255,255,0.9)]'
      }`}
    >
      {/* background glow */}
      <div
        className="pointer-events-none absolute -left-10 -top-10 h-44 w-44 rounded-full bg-brand/10 blur-2xl"
        aria-hidden
      />
      {isHoliday && (
        <div
          className="pointer-events-none absolute -right-12 -bottom-12 h-44 w-44 rounded-full bg-peach/15 blur-2xl"
          aria-hidden
        />
      )}

      {/* close button */}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute top-4 right-4 sm:top-5 sm:right-5 z-10 rounded-xl p-1.5 text-muted transition-colors hover:bg-line/40 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        aria-label="Dismiss banner"
      >
        <X className="h-4 w-4" />
      </button>

      {/* content */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 md:gap-7">
        {/* lumi avatar */}
        <div className="relative shrink-0 flex flex-col items-center group">
          <div
            className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-brand-soft/90 via-brand-soft/40 to-peach-soft/40 blur-md opacity-75 pointer-events-none transition-opacity duration-300 group-hover:opacity-100"
            aria-hidden
          />

          <div className="relative flex items-center justify-center rounded-2xl sm:rounded-3xl border border-brand/25 bg-gradient-to-b from-surface via-brand-soft/30 to-brand-soft/60 p-2 sm:p-2.5 shadow-[0_8px_22px_rgba(23,74,50,0.08),inset_0_1px_0_rgba(255,255,255,0.95)]">
            <img
              src={botAvatarImg}
              alt="Lumi, your Let's Do! AI companion"
              width={160}
              height={160}
              className="h-28 w-28 sm:h-32 sm:w-32 md:h-36 md:w-36 lg:h-40 lg:w-40 aspect-square object-contain drop-shadow-md select-none transition-transform duration-300 group-hover:scale-105"
            />
          </div>

          <span className="relative -mt-3.5 inline-flex items-center gap-1 rounded-full border border-brand/30 bg-surface px-2.5 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wider text-brand-deep shadow-xs">
            <Sparkles className="h-3 w-3 text-brand fill-brand/20" />
            Lumi
          </span>
        </div>

        {/* text content */}
        <div className="min-w-0 flex-1 text-center sm:text-left">
          {/* badges */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-brand/25 bg-brand-soft px-3 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wider text-brand-deep shadow-2xs">
              {briefing.tag || "LUMI'S INSIGHT"}
            </span>
            {long_weekend && (
              <span className="inline-flex items-center gap-1 rounded-full border border-peach/40 bg-peach-soft px-3 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wider text-rose shadow-2xs">
                🌴 {long_weekend.type}
              </span>
            )}
          </div>

          <h2 className="mt-2 text-lg sm:text-xl md:text-[22px] font-extrabold tracking-tight text-ink leading-snug">
            {briefing.headline}
          </h2>

          <p className="mt-2 text-[13.5px] sm:text-[14.5px] leading-relaxed text-muted max-w-3xl font-normal">
            {briefing.message}
          </p>

          {/* upcoming holidays */}
          {upcoming_holidays && upcoming_holidays.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-[12px] text-muted">
              <span className="font-semibold text-ink-soft flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-brand" />
                Upcoming Philippine Holidays:
              </span>
              {upcoming_holidays.slice(0, 2).map((h) => (
                <span
                  key={h.name + h.date}
                  className="inline-flex items-center rounded-lg bg-surface/90 border border-line-strong/60 px-2.5 py-1 text-ink-soft font-medium shadow-2xs"
                >
                  {h.name} &bull; {h.formatted_date}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
