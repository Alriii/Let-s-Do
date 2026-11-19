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
    'bg-gradient-to-b from-brand to-[#38945f] text-white shadow-[0_4px_12px_rgba(69,170,112,0.25),inset_0_1px_0_rgba(255,255,255,0.3)] hover:brightness-105 active:scale-[0.985] transition-all',
  secondary:
    'border border-line-strong bg-surface text-ink shadow-xs hover:border-brand/40 hover:bg-brand-soft/50 hover:text-brand-strong active:scale-[0.985] transition-all',
  soft: 'bg-surface-2 text-muted hover:bg-brand-soft/60 hover:text-brand-strong active:scale-[0.985] transition-all',
  ghost: 'text-muted hover:bg-brand-soft hover:text-brand-strong active:scale-[0.985] transition-all',
  danger: 'bg-danger text-white shadow-xs hover:brightness-95 active:scale-[0.985] transition-all',
  dangerSoft: 'bg-danger-soft text-danger hover:brightness-95 active:scale-[0.985] transition-all',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold',
  md: 'h-10 gap-2 rounded-[11px] px-4 text-sm font-semibold',
  lg: 'h-12 gap-2 rounded-xl px-5 text-sm font-semibold',
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
