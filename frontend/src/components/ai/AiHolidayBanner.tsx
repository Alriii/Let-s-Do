import { Calendar, X } from 'lucide-react';
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
    <div
      className={`relative mb-6 overflow-hidden rounded-[20px] border p-5 transition-all ${
        isHoliday
          ? 'border-brand/40 bg-gradient-to-r from-brand-soft/75 via-surface to-peach-soft/40 shadow-[0_4px_20px_rgba(23,74,50,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]'
          : 'border-line-strong/60 bg-surface shadow-[0_2px_12px_rgba(23,74,50,0.04),inset_0_1px_0_rgba(255,255,255,0.85)]'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <img
            src={botAvatarImg}
            alt="Lumi, your Let's Do! AI companion"
            className="h-11 w-11 shrink-0 rounded-2xl object-contain drop-shadow-xs border border-brand/20 bg-brand-soft/50"
          />

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-brand/25 bg-brand-soft px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-brand-deep uppercase shadow-2xs">
                {briefing.tag || "LUMI'S INSIGHT"}
              </span>
              {long_weekend && (
                <span className="inline-flex items-center gap-1 rounded-full border border-peach/30 bg-peach-soft px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-rose uppercase shadow-2xs">
                  🌴 {long_weekend.type}
                </span>
              )}
            </div>

            <h3 className="text-[15.5px] font-bold tracking-tight text-ink">
              {briefing.headline}
            </h3>

            <p className="text-[13px] leading-relaxed text-muted">
              {briefing.message}
            </p>

            {upcoming_holidays && upcoming_holidays.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 pt-1 text-[11.5px] text-muted">
                <span className="font-semibold text-ink-soft flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-brand" />
                  Upcoming Philippine Holidays:
                </span>
                {upcoming_holidays.slice(0, 2).map((h) => (
                  <span
                    key={h.name + h.date}
                    className="inline-flex items-center rounded-md bg-surface border border-line px-2 py-0.5 text-ink-soft font-medium"
                  >
                    {h.name} &bull; {h.formatted_date}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-lg p-1 text-muted transition-colors hover:bg-line/40 hover:text-ink"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
