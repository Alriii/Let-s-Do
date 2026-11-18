import clsx from 'clsx';
import { initials } from '../../lib/format';

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}

export function Avatar({ name, src, size = 40, className }: AvatarProps) {
  const dimension = { width: size, height: size };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={dimension}
        className={clsx(
          'shrink-0 rounded-full border border-line object-cover',
          className,
        )}
      />
    );
  }

  return (
    <span
      style={{ ...dimension, fontSize: Math.max(11, size * 0.36) }}
      className={clsx(
        'grid shrink-0 place-items-center rounded-full border border-brand/35 bg-brand-soft font-bold uppercase tracking-wide text-brand-strong',
        className,
      )}
      aria-hidden
    >
      {initials(name) || 'U'}
    </span>
  );
}
