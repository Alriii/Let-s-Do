import clsx from 'clsx';
import { ChevronDown, Search } from 'lucide-react';
import { useId } from 'react';
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  trailing?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  trailing,
  className,
  children,
}: FieldProps) {
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-soft">
          {label}
          {required && <span className="ml-0.5 font-bold text-danger">*</span>}
        </label>
        {trailing}
      </div>
      {children}
      {error ? (
        <p className="text-xs font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-faint">{hint}</p>
      ) : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({ className, invalid, ...rest }: InputProps) {
  return (
    <input
      className={clsx('field-input', invalid && 'border-danger', className)}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  wrapperClassName?: string;
}

export function SearchInput({ className, wrapperClassName, ...rest }: SearchInputProps) {
  return (
    <div className={clsx('relative', wrapperClassName)}>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
        aria-hidden
      />
      <input
        className={clsx(
          'h-10 w-full rounded-[10px] border border-line-strong bg-surface pl-9 pr-3 text-[13px] text-ink transition-colors placeholder:text-faint focus:border-brand focus:outline-none',
          className,
        )}
        {...rest}
      />
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function Textarea({ className, invalid, ...rest }: TextareaProps) {
  return (
    <textarea
      className={clsx(
        'w-full resize-none rounded-[10px] border border-line-strong bg-surface px-3.5 py-2.5 text-sm text-ink transition-colors placeholder:text-faint focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15',
        invalid && 'border-danger',
        className,
      )}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export function Select({ className, invalid, children, ...rest }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={clsx(
          'field-input appearance-none pr-9',
          invalid && 'border-danger',
          className,
        )}
        aria-invalid={invalid || undefined}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
    </div>
  );
}

export function useFieldId(prefix: string): string {
  const id = useId();

  return `${prefix}-${id}`;
}
