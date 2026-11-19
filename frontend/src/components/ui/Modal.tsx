import clsx from 'clsx';
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  bodyClassName?: string;
  className?: string;
  showClose?: boolean;
}

const sizes = {
  sm: 'max-w-[400px]',
  md: 'max-w-[480px]',
  lg: 'max-w-[640px]',
  xl: 'max-w-[680px]',
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  bodyClassName,
  className,
  showClose = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#252B29]/50 p-4 backdrop-blur-[3px] animate-fade-in"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        className={clsx(
          'w-full overflow-hidden rounded-[20px] border border-line bg-surface shadow-[0_24px_60px_rgba(23,74,50,0.14)] animate-scale-in',
          sizes[size],
          className,
        )}
      >
        {(title || showClose) && (
          <div className="flex items-start justify-between gap-4 px-6 pt-6 sm:px-7">
            <div className="min-w-0">
              {title && (
                <h2 className="text-[22px] font-bold leading-tight tracking-[-0.01em] text-ink sm:text-[24px]">
                  {title}
                </h2>
              )}
              {subtitle && <p className="mt-1 text-[13px] text-muted">{subtitle}</p>}
            </div>
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-muted transition-colors hover:bg-line hover:text-ink"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        )}
        <div className={clsx('px-6 pt-5 sm:px-7', bodyClassName)}>{children}</div>
        {footer && <div className="px-6 pb-6 pt-5 sm:px-7">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
