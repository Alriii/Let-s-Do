import clsx from 'clsx';
import type { ReactNode } from 'react';

interface MetricCardProps {
  icon: ReactNode;
  value: ReactNode;
  label: string;
  tone?: 'brand' | 'mint' | 'amber';
  onClick?: () => void;
  active?: boolean;
}

const tones = {
  brand: 'bg-brand-soft/90 text-brand-strong border border-brand/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]',
  mint: 'bg-brand-soft/90 text-brand-strong border border-brand/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]',
  amber: 'bg-peach-soft/90 text-rose border border-peach/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]',
};

export function MetricCard({
  icon,
  value,
  label,
  tone = 'brand',
  onClick,
  active = false,
}: MetricCardProps) {
  const content = (
    <>
      <span
        className={clsx(
          'grid h-13 w-13 shrink-0 place-items-center rounded-2xl transition-transform duration-200 group-hover:scale-105',
          tones[tone],
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[28px] font-extrabold leading-none tracking-tight text-ink">
          {value}
        </span>
        <span className="mt-1 block truncate text-[11.5px] font-semibold uppercase tracking-wider text-muted">
          {label}
        </span>
      </span>
    </>
  );

  const className = clsx(
    'group relative flex h-24 w-full items-center gap-4.5 rounded-[20px] border px-6 text-left transition-all duration-200 card-elevated',
    active
      ? 'border-brand/60 ring-2 ring-brand/20 bg-gradient-to-br from-surface via-surface to-brand-soft/20'
      : 'border-line-strong/60 bg-surface hover:border-brand/40 hover:-translate-y-0.5',
    onClick && 'cursor-pointer',
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
