import clsx from 'clsx';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger' | 'dangerSoft';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-brand text-white shadow-[0_1px_2px_rgba(17,21,20,0.08)] hover:bg-brand-deep active:bg-brand-deep',
  secondary:
    'border border-line-strong bg-surface text-ink hover:border-brand hover:text-brand-strong',
  soft: 'bg-surface-2 text-muted hover:bg-line hover:text-ink',
  ghost: 'text-muted hover:bg-brand-soft hover:text-brand-strong',
  danger: 'bg-danger text-white hover:brightness-95',
  dangerSoft: 'bg-danger-soft text-danger hover:brightness-95',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold',
  md: 'h-10 gap-2 rounded-[10px] px-4 text-sm font-semibold',
  lg: 'h-12 gap-2 rounded-[10px] px-5 text-sm font-semibold',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}
