import clsx from 'clsx';
import { useState } from 'react';
import defaultAvatar from '../../assets/avatar.png';
import { initials } from '../../lib/format';

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}

export function Avatar({ name, src, size = 42, className }: AvatarProps) {
  const [loadFailed, setLoadFailed] = useState(false);
  const dimension = { width: size, height: size };
  const avatarSrc = src || defaultAvatar;

  if (loadFailed) {
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

  return (
    <img
      src={avatarSrc}
      alt={name}
      style={dimension}
      onError={() => setLoadFailed(true)}
      className={clsx(
        'shrink-0 rounded-full border border-line object-cover shadow-sm',
        className,
      )}
    />
  );
}
