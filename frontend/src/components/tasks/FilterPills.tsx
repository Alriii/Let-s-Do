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
        'inline-flex items-center gap-1 rounded-[10px] bg-surface-2 p-[3px]',
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
              'rounded-lg transition-colors',
              size === 'sm' ? 'px-3 py-[5px] text-[11.5px]' : 'px-3.5 py-1.5 text-xs',
              active
                ? 'bg-surface font-bold text-ink shadow-sm'
                : 'font-medium text-muted hover:text-ink',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
