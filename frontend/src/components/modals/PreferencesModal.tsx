import clsx from 'clsx';
import { Camera, Eye, EyeOff, Moon, Sun, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import type { ProfileResponse, TextSize, Theme, User } from '../../lib/types';
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

const PASSWORD_RULES = [
  { label: '8+ characters', test: (value: string) => value.length >= 8 },
  { label: 'Upper & lowercase', test: (value: string) => /[a-z]/.test(value) && /[A-Z]/.test(value) },
  { label: 'A number', test: (value: string) => /\d/.test(value) },
  { label: 'A symbol', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

const TEXT_SIZE_OPTIONS: { value: TextSize; label: string; desc: string }[] = [
  { value: 'sm', label: 'Compact', desc: '14px' },
  { value: 'md', label: 'Default', desc: '16px' },
  { value: 'lg', label: 'Large', desc: '18px' },
  { value: 'xl', label: 'Extra Large', desc: '20px' },
];

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
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out',
        checked ? 'bg-brand' : 'bg-line-strong',
      )}
    >
      <span
        aria-hidden="true"
        className={clsx(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0',
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
  const { user, setUser, applyTheme, textSize, applyTextSize } = useAuth();
  const toast = useToast();
  const nameId = useFieldId('pref-name');
  const emailId = useFieldId('pref-email');
  const currentPassId = useFieldId('pref-curr-pass');
  const newPassId = useFieldId('pref-new-pass');
  const confirmPassId = useFieldId('pref-conf-pass');
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [theme, setTheme] = useState<Theme>('light');
  const [selectedTextSize, setSelectedTextSize] = useState<TextSize>(textSize);
  const [reminders, setReminders] = useState(true);
  const [digest, setDigest] = useState(true);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !user) {
      return;
    }

    setName(user.name);
    setTheme(user.preferences.theme);
    setSelectedTextSize(textSize);
    setReminders(user.preferences.task_reminders_enabled);
    setDigest(user.preferences.daily_digest_enabled);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setFieldErrors({});
  }, [open, user, textSize]);

  const close = () => {
    if (saving || uploading) {
      return;
    }

    // Revert live preview theme & text size to saved values if user cancels
    if (user) {
      applyTheme(user.preferences.theme);
      applyTextSize(textSize);
    }
    onClose();
  };

  const handleThemeChange = (selectedTheme: Theme) => {
    setTheme(selectedTheme);
    applyTheme(selectedTheme);
  };

  const handleTextSizeChange = (size: TextSize) => {
    setSelectedTextSize(size);
    applyTextSize(size);
  };

  const save = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Please enter your full name.');
      return;
    }

    setFieldErrors({});
    setError(null);

    // Password validation if user entered anything in password fields
    if (newPassword || currentPassword || confirmPassword) {
      if (!currentPassword) {
        setFieldErrors({ current_password: 'Enter your current password to set a new one.' });
        return;
      }
      if (!newPassword) {
        setFieldErrors({ new_password: 'Enter your new password.' });
        return;
      }
      const passedRules = PASSWORD_RULES.filter((r) => r.test(newPassword)).length;
      if (passedRules < PASSWORD_RULES.length) {
        setFieldErrors({
          new_password: 'Use 8+ characters with upper & lowercase letters, a number, and a symbol.',
        });
        return;
      }
      if (newPassword !== confirmPassword) {
        setFieldErrors({ new_password_confirmation: 'The new passwords do not match.' });
        return;
      }
    }

    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        name: trimmedName,
        theme,
        task_reminders_enabled: reminders,
        daily_digest_enabled: digest,
      };

      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
        payload.new_password_confirmation = confirmPassword;
      }

      const response = await api.patch<ProfileResponse>('/auth/profile', payload);

      setUser(response.user);
      applyTheme(response.user.preferences.theme);
      applyTextSize(selectedTextSize);
      toast.success(
        newPassword
          ? 'Preferences and password updated successfully.'
          : 'Preferences saved.',
      );
      onClose();
    } catch (caught) {
      if (caught instanceof ApiError) {
        const next: Record<string, string> = {};
        for (const [key, messages] of Object.entries(caught.errors)) {
          if (messages[0]) {
            next[key] = messages[0];
          }
        }
        setFieldErrors(next);
        setError(next.current_password ?? next.new_password ?? caught.message);
      } else {
        setError('Unable to save your preferences right now.');
      }
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name)) {
      toast.error('Please select an image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('Image is too large. Please select a photo under 20 MB.');
      return;
    }

    setUploading(true);
    setError(null);

    const form = new FormData();
    form.append('avatar', file);

    try {
      const response = await api.postForm<AvatarResponse>('/auth/avatar', form);
      setUser(response.user);
      toast.success('Profile photo updated.');
    } catch (caught) {
      const msg =
        caught instanceof ApiError
          ? caught.firstError('avatar') ?? caught.firstError() ?? caught.message
          : 'Unable to upload that image.';
      setError(msg);
      toast.error(msg);
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
      <div className="flex max-h-[calc(100vh-3rem)] flex-col bg-surface text-ink transition-colors">
        <div className="flex items-start justify-between gap-4 px-6 pt-6 sm:px-9">
          <div>
            <h2 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-ink">
              Preferences
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              Customize your profile, appearance, and reminder settings.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={saving || uploading}
            className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-muted transition-colors hover:bg-line hover:text-ink disabled:opacity-50"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto border-t border-line px-6 py-6 sm:pl-9 sm:pr-8">
          <SectionLabel>Profile photo</SectionLabel>
          <div className="mt-3 flex items-center gap-4">
            <Avatar name={user.name} src={user.avatar_url} size={64} />
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
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
            <Field label="Full Name" htmlFor={nameId} error={fieldErrors.name}>
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
              hint="Email address cannot be modified here."
            >
              <Input id={emailId} value={user.email} readOnly disabled />
            </Field>
          </div>

          <div className="my-5 h-px bg-line" />

          <SectionLabel>Appearance &amp; theme</SectionLabel>
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-[12px] border border-line-strong bg-surface-2 p-1.5">
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
                  onClick={() => handleThemeChange(value)}
                  aria-pressed={active}
                  className={clsx(
                    'flex h-10 items-center justify-center gap-2 rounded-lg text-[13px] font-medium transition-colors',
                    active
                      ? 'bg-surface font-semibold text-brand-strong border border-brand/30 shadow-sm'
                      : 'text-muted hover:text-ink',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            <p className="text-[12px] font-semibold text-ink">Text Size &amp; Readability</p>
            <p className="mt-0.5 text-xs text-muted">
              Scale app typography for comfortable reading across all screens.
            </p>
            <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4 rounded-[12px] border border-line-strong bg-surface-2 p-1.5">
              {TEXT_SIZE_OPTIONS.map(({ value, label, desc }) => {
                const active = selectedTextSize === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleTextSizeChange(value)}
                    aria-pressed={active}
                    className={clsx(
                      'flex h-12 flex-col items-center justify-center rounded-lg px-2 text-center transition-colors',
                      active
                        ? 'bg-surface font-semibold text-brand-strong border border-brand/30 shadow-sm'
                        : 'text-muted hover:text-ink',
                    )}
                  >
                    <span className="text-[13px] font-bold">
                      {label}
                    </span>
                    <span className="text-[10px] text-muted">{desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="my-5 h-px bg-line" />

          <SectionLabel>Security &amp; change password</SectionLabel>
          <p className="mt-1 text-xs text-muted">
            Leave blank if you do not wish to change your password.
          </p>

          <div className="mt-3 flex flex-col gap-3">
            <Field
              label="Current Password"
              htmlFor={currentPassId}
              error={fieldErrors.current_password}
            >
              <div className="relative">
                <Input
                  id={currentPassId}
                  type={showCurrentPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="pr-11"
                  invalid={Boolean(fieldErrors.current_password)}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass((c) => !c)}
                  className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded text-muted hover:text-ink"
                  aria-label={showCurrentPass ? 'Hide password' : 'Show password'}
                >
                  {showCurrentPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                label="New Password"
                htmlFor={newPassId}
                error={fieldErrors.new_password}
                hint="8+ chars, upper/lower, number, symbol"
              >
                <div className="relative">
                  <Input
                    id={newPassId}
                    type={showNewPass ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-11"
                    invalid={Boolean(fieldErrors.new_password)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass((c) => !c)}
                    className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded text-muted hover:text-ink"
                    aria-label={showNewPass ? 'Hide password' : 'Show password'}
                  >
                    {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              <Field
                label="Confirm New Password"
                htmlFor={confirmPassId}
                error={fieldErrors.new_password_confirmation}
              >
                <Input
                  id={confirmPassId}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  invalid={Boolean(fieldErrors.new_password_confirmation)}
                />
              </Field>
            </div>
          </div>

          <div className="my-5 h-px bg-line" />

          <SectionLabel>Notifications &amp; reminders</SectionLabel>
          <div className="mt-3 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[13.5px] font-medium text-ink">Task Reminders</p>
                <p className="text-xs text-muted">
                  Receive an email reminder 30 minutes before a scheduled task
                </p>
              </div>
              <Toggle checked={reminders} onChange={setReminders} label="Task reminders" />
            </div>
            <div className="flex items-center justify-between gap-4">
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
