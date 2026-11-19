import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import {
  formatMonthLabel,
  monthGrid,
  monthKey,
  parseISODate,
  todayISO,
  WEEKDAY_LABELS,
} from '../../lib/format';
import { useCalendar } from '../../hooks/useTasks';
import { Spinner } from '../ui/Feedback';

interface CalendarWidgetProps {
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}

export function CalendarWidget({ selectedDate, onSelectDate }: CalendarWidgetProps) {
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const { data, isLoading } = useCalendar(month);
  const today = todayISO();
  const days = monthGrid(month);
  const counts = new Map((data?.days ?? []).map((day) => [day.date, day]));

  const changeMonth = (offset: number) => {
    const [year, monthIndex] = month.split('-').map(Number);
    const next = new Date(year, monthIndex - 1 + offset, 1);
    setMonth(monthKey(next));
    onSelectDate(null);
  };

  const selectDate = (date: Date) => {
    const iso = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;

    setMonth(monthKey(date));
    onSelectDate(selectedDate === iso ? null : iso);
  };

  return (
    <section className="rounded-[20px] border border-line-strong/60 bg-surface p-5 shadow-[0_1px_3px_rgba(23,74,50,0.03),0_6px_16px_rgba(23,74,50,0.03),inset_0_1px_0_rgba(255,255,255,0.85)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-bold tracking-tight text-ink">Calendar</h2>
        <div className="flex items-center gap-1 rounded-lg border border-line bg-surface-2 p-0.5">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="grid h-6.5 w-6.5 place-items-center rounded-md text-muted transition-colors hover:bg-surface hover:text-ink active:scale-95"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <span className="min-w-[88px] text-center text-xs font-bold text-ink">
            {formatMonthLabel(month)}
          </span>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="grid h-6.5 w-6.5 place-items-center rounded-md text-muted transition-colors hover:bg-surface hover:text-ink active:scale-95"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-[244px] items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-7 gap-1">
            {WEEKDAY_LABELS.map((label) => (
              <span
                key={label}
                className="grid h-5 place-items-center text-[11px] font-medium text-faint"
              >
                {label}
              </span>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((date) => {
              const iso = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
              const inMonth = monthKey(date) === month;
              const selected = selectedDate === iso;
              const isToday = iso === today;
              const hasTasks = (counts.get(iso)?.total ?? 0) > 0;

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => selectDate(date)}
                  className={clsx(
                    'relative grid h-[31px] place-items-center rounded-lg text-xs transition-colors',
                    selected
                      ? 'bg-gradient-to-b from-brand to-brand-strong font-bold text-white shadow-xs'
                      : isToday
                        ? 'border border-brand/50 font-bold text-brand-strong bg-brand-soft/60 hover:bg-brand-soft'
                        : inMonth
                          ? 'text-ink hover:bg-surface-2'
                          : 'text-faint/60 hover:bg-surface-2',
                  )}
                  aria-label={`${iso}${hasTasks ? `, ${counts.get(iso)?.total} tasks` : ''}`}
                  aria-pressed={selected}
                >
                  {date.getDate()}
                  {hasTasks && (
                    <span
                      className={clsx(
                        'absolute bottom-[3px] h-1 w-1 rounded-full',
                        selected ? 'bg-white' : 'bg-brand',
                        counts.get(iso)?.pending === 0 && !selected && 'bg-brand/45',
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-2.5">
        <span className="text-[11px] text-muted">
          {selectedDate
            ? `Showing ${parseISODate(selectedDate).getDate()} ${formatMonthLabel(monthKey(parseISODate(selectedDate)))}`
            : 'Has Scheduled Tasks'}
        </span>
        {selectedDate ? (
          <button
            type="button"
            onClick={() => onSelectDate(null)}
            className="text-[11px] font-bold text-brand-strong hover:underline"
          >
            Clear Filter
          </button>
        ) : (
          <span className="text-[11px] text-faint">
            {data?.count ?? 0} day{(data?.count ?? 0) === 1 ? '' : 's'}
          </span>
        )}
      </div>
    </section>
  );
}
