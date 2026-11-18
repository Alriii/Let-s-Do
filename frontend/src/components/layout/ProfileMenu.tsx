import { LogOut, Settings, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../stores/auth';
import { useUI } from '../../stores/ui';
import { Avatar } from '../ui/Avatar';
import { useToast } from '../ui/Toast';

export function ProfileMenu() {
  const { user, logout } = useAuth();
  const { openPreferences } = useUI();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!user) {
    return null;
  }

  const signOut = async () => {
    setSigningOut(true);

    try {
      await logout();
      toast.info('You have been signed out.');
      navigate('/login', { replace: true });
    } finally {
      setSigningOut(false);
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="rounded-full transition-transform hover:scale-[1.03]"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open profile menu"
      >
        <Avatar name={user.name} src={user.avatar_url} size={42} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+10px)] z-40 w-[236px] overflow-hidden rounded-[12px] border border-line bg-surface p-3 shadow-[0_16px_40px_rgba(17,21,20,0.14)] animate-scale-in"
        >
          <div className="flex items-center gap-2.5 px-1 py-1">
            <Avatar name={user.name} src={user.avatar_url} size={34} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold text-ink">{user.name}</p>
              <p className="truncate text-[11px] text-muted">{user.email}</p>
            </div>
          </div>

          <div className="my-2.5 h-px bg-line" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              openPreferences();
            }}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-[13px] text-ink-soft transition-colors hover:bg-surface-2"
          >
            <UserRound className="h-4 w-4 text-muted" aria-hidden />
            Preferences
            <Settings className="ml-auto h-3.5 w-3.5 text-faint" aria-hidden />
          </button>

          <div className="my-2.5 h-px bg-line" />

          <button
            type="button"
            role="menuitem"
            onClick={() => void signOut()}
            disabled={signingOut}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-[13px] text-danger transition-colors hover:bg-danger-soft disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            {signingOut ? 'Signing out…' : 'Sign Out'}
          </button>
        </div>
      )}
    </div>
  );
}
