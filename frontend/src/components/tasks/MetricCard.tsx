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
  brand: 'bg-brand-tint text-brand-strong',
  mint: 'bg-[#e5f7f2] text-[#0f766e]',
  amber: 'bg-[#fff7ed] text-amber',
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
      <span className={clsx('grid h-14 w-14 shrink-0 place-items-center rounded-full', tones[tone])}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[26px] font-bold leading-none tracking-[-0.02em] text-ink">
          {value}
        </span>
        <span className="mt-0.5 block truncate text-[13px] text-muted">{label}</span>
      </span>
    </>
  );

  const className = clsx(
    'flex h-24 w-full items-center gap-[18px] rounded-[18px] border bg-surface px-6 text-left',
    active ? 'border-brand/40' : 'border-line',
    onClick && 'transition-colors hover:border-brand/40 hover:bg-surface-2',
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
