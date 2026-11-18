import clsx from 'clsx';
import { Camera, Moon, Sun, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import type { ProfileResponse, Theme, User } from '../../lib/types';
import { useAuth } from '../../stores/auth';
import { useToast } from '../ui/Toast';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Field, Input, useFieldId } from '../ui/Field';
import { Modal } from '../ui/Modal';

interface PreferencesModalProps {
  open: boolean;
  onClose: () => void;
}

interface AvatarResponse {
  message: string;
  avatar_url: string | null;
  user: User;
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors',
        checked ? 'bg-brand' : 'bg-line-strong',
      )}
    >
      <span
        className={clsx(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-deep">{children}</p>
  );
}

export function PreferencesModal({ open, onClose }: PreferencesModalProps) {
  const { user, setUser, applyTheme } = useAuth();
  const toast = useToast();
  const nameId = useFieldId('pref-name');
  const emailId = useFieldId('pref-email');
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [theme, setTheme] = useState<Theme>('light');
  const [reminders, setReminders] = useState(true);
  const [digest, setDigest] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) {
      return;
    }

    setName(user.name);
    setTheme(user.preferences.theme);
    setReminders(user.preferences.task_reminders_enabled);
    setDigest(user.preferences.daily_digest_enabled);
    setError(null);
  }, [open, user]);

  const close = () => {
    if (saving || uploading) {
      return;
    }

    onClose();
  };

  const save = async () => {
    const trimmed = name.trim();

    if (!trimmed) {
      setError('Please enter your full name.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await api.patch<ProfileResponse>('/auth/profile', {
        name: trimmed,
        theme,
        task_reminders_enabled: reminders,
        daily_digest_enabled: digest,
      });

      setUser(response.user);
      applyTheme(response.user.preferences.theme);
      toast.success('Preferences saved.');
      onClose();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.firstError('name') ?? caught.message
          : 'Unable to save your preferences right now.',
      );
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    setUploading(true);
    setError(null);

    const form = new FormData();
    form.append('avatar', file);

    try {
      const response = await api.postForm<AvatarResponse>('/auth/avatar', form);
      setUser(response.user);
      toast.success('Profile photo updated.');
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.firstError('avatar') ?? caught.message
          : 'Unable to upload that image.',
      );
    } finally {
      setUploading(false);

      if (fileRef.current) {
        fileRef.current.value = '';
      }
    }
  };

  const removeAvatar = async () => {
    setUploading(true);
    setError(null);

    try {
      const response = await api.delete<AvatarResponse>('/auth/avatar');
      setUser(response.user);
      toast.info('Profile photo removed.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to remove your photo.');
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Modal open={open} onClose={close} size="xl" showClose={false} bodyClassName="p-0">
      <div className="flex max-h-[calc(100vh-3rem)] flex-col">
        <div className="flex items-start justify-between gap-4 px-6 pt-6 sm:px-9">
          <div>
            <h2 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-ink">
              Preferences
            </h2>
            <p className="mt-1.5 text-[13px] text-muted">
              Customize your account profile, workspace appearance, and task reminders.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-muted transition-colors hover:bg-line hover:text-ink"
            aria-label="Close preferences"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </div>

        <div className="mt-5 flex-1 overflow-y-auto border-t border-line px-6 py-5 sm:px-9">
          <SectionLabel>Account profile</SectionLabel>

          <div className="mt-3 flex flex-wrap items-center gap-4">
            <Avatar name={name || user.name} src={user.avatar_url} size={48} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-ink">{name || user.name}</p>
              <p className="truncate text-xs text-muted">{user.email} • Workspace Owner</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  if (file) {
                    void uploadAvatar(file);
                  }
                }}
              />
              <Button
                variant="secondary"
                size="sm"
                icon={<Camera className="h-3.5 w-3.5" aria-hidden />}
                loading={uploading}
                onClick={() => fileRef.current?.click()}
              >
                Change Photo
              </Button>
              {user.avatar_url && (
                <button
                  type="button"
                  onClick={() => void removeAvatar()}
                  disabled={uploading}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                  aria-label="Remove profile photo"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Full Name" htmlFor={nameId}>
              <Input
                id={nameId}
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={255}
              />
            </Field>
            <Field
              label="Email Address"
              htmlFor={emailId}
              hint="Email changes are not available yet."
            >
              <Input id={emailId} value={user.email} readOnly disabled />
            </Field>
          </div>

          <div className="my-5 h-px bg-line" />

          <SectionLabel>Appearance &amp; theme</SectionLabel>
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-[12px] border border-line-strong bg-surface-2 p-1">
            {(
              [
                { value: 'light' as Theme, label: 'Light Theme', icon: Sun },
                { value: 'dark' as Theme, label: 'Dark Theme', icon: Moon },
              ]
            ).map(({ value, label, icon: Icon }) => {
              const active = theme === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  aria-pressed={active}
                  className={clsx(
                    'flex h-9 items-center justify-center gap-2 rounded-lg text-[13px] transition-colors',
                    active
                      ? 'bg-surface font-semibold text-ink shadow-sm'
                      : 'text-muted hover:text-ink',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>

          <div className="my-5 h-px bg-line" />

          <SectionLabel>Notifications &amp; reminders</SectionLabel>
          <div className="mt-3 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-6">
              <div>
                <p className="text-[13.5px] font-medium text-ink">Task Reminders</p>
                <p className="text-xs text-muted">
                  Receive an email reminder 30 minutes before a scheduled task
                </p>
              </div>
              <Toggle checked={reminders} onChange={setReminders} label="Task reminders" />
            </div>
            <div className="flex items-center justify-between gap-6">
              <div>
                <p className="text-[13.5px] font-medium text-ink">Daily Schedule Digest</p>
                <p className="text-xs text-muted">
                  Send a morning email summary of upcoming tasks at 8:00 AM
                </p>
              </div>
              <Toggle checked={digest} onChange={setDigest} label="Daily schedule digest" />
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-[10px] border border-danger/25 bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-line px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-9">
          <p className="text-xs text-faint">Preferences sync across all devices.</p>
          <div className="flex gap-2.5">
            <Button variant="soft" onClick={close} disabled={saving || uploading}>
              Cancel
            </Button>
            <Button loading={saving} onClick={() => void save()}>
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
