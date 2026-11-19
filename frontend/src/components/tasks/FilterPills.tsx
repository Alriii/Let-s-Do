import clsx from 'clsx';

interface FilterPillsProps<Value extends string> {
  options: { label: string; value: Value }[];
  value: Value;
  onChange: (value: Value) => void;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function FilterPills<Value extends string>({
  options,
  value,
  onChange,
  label = 'Filter',
  className,
  size = 'sm',
}: FilterPillsProps<Value>) {
  return (
    <div
      className={clsx(
        'inline-flex items-center gap-1 rounded-xl border border-line-strong/60 bg-surface-2/80 p-1 shadow-2xs backdrop-blur-xs',
        className,
      )}
      role="group"
      aria-label={label}
    >
      {options.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={clsx(
              'rounded-lg transition-all duration-150',
              size === 'sm' ? 'px-3 py-1 text-[11.5px]' : 'px-3.5 py-1.5 text-xs',
              active
                ? 'bg-surface font-bold text-brand-strong shadow-[0_1px_3px_rgba(23,74,50,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] border border-brand/25'
                : 'font-semibold text-muted hover:text-ink hover:bg-surface/50',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
