import { ArrowLeft, KeyRound } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import badgeSecurityImg from '../assets/badge-security.png';
import heroForgot1Img from '../assets/hero-forgot-1.png';
import heroForgot2Img from '../assets/hero-forgot-2.png';
import heroForgotSuccessImg from '../assets/hero-forgot-success.png';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/ui/Button';
import { Field, Input, useFieldId } from '../components/ui/Field';
import { useToast } from '../components/ui/Toast';
import { api, ApiError } from '../lib/api';

type Step = 'request' | 'reset' | 'done';

const RULES = [
  { label: '8+ characters', test: (value: string) => value.length >= 8 },
  { label: 'Upper & lowercase', test: (value: string) => /[a-z]/.test(value) && /[A-Z]/.test(value) },
  { label: 'A number', test: (value: string) => /\d/.test(value) },
  { label: 'A symbol', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const emailId = useFieldId('forgot-email');
  const codeId = useFieldId('forgot-code');
  const passwordId = useFieldId('forgot-password');
  const confirmId = useFieldId('forgot-confirm');

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  const requestCode = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!email.trim()) {
      setFieldErrors({ email: 'Enter your registered email address.' });
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      toast.success('If that email is registered, a 6-digit code is on its way.');
      setStep('reset');
      setCooldown(30);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.firstError('email') ?? caught.message
          : 'Unable to send a reset code right now.',
      );
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setError(null);

    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      toast.success('A fresh code has been sent.');
      setCooldown(30);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to resend the code.');
    } finally {
      setResending(false);
    }
  };

  const resetPassword = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const nextErrors: Record<string, string> = {};

    if (code.length !== 6) {
      nextErrors.code = 'Enter the 6-digit code from your email.';
    }

    if (RULES.some((rule) => !rule.test(password))) {
      nextErrors.password = 'Use 8+ characters with upper & lowercase letters, a number, and a symbol.';
    }

    if (password !== confirmation) {
      nextErrors.password_confirmation = 'The passwords do not match.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError(nextErrors.code ?? nextErrors.password ?? nextErrors.password_confirmation ?? null);
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', {
        email: email.trim(),
        code,
        password,
        password_confirmation: confirmation,
      });
      setStep('done');
    } catch (caught) {
      if (caught instanceof ApiError) {
        setFieldErrors({
          code: caught.firstError('code') ?? '',
          password: caught.firstError('password') ?? '',
        });
        setError(caught.firstError('code') ?? caught.message);
      } else {
        setError('Unable to reset your password right now.');
      }
    } finally {
      setLoading(false);
    }
  };

  const heroTitle =
    step === 'done' ? (
      <>
        Security updated,
        <br />
        ready to log in.
      </>
    ) : step === 'reset' ? (
      <>
        Set new password,
        <br />
        resume your day.
      </>
    ) : (
      <>
        Recover access,
        <br />
        continue your work.
      </>
    );

  const heroDescription =
    step === 'done'
      ? 'Your account password has been safely updated. Sign in to return to your tasks and daily schedule.'
      : step === 'reset'
        ? 'Enter the 6-digit code sent to your email along with your new password to restore access.'
        : "Forgot your password? No worries. Enter your registered email address and we'll send a 6-digit recovery code.";

  const heroImageSrc =
    step === 'done'
      ? heroForgotSuccessImg
      : step === 'reset'
        ? heroForgot2Img
        : heroForgot1Img;

  return (
    <AuthLayout
      heroTitle={heroTitle}
      heroDescription={heroDescription}
      heroImageSrc={heroImageSrc}
      backTo="/login"
      backLabel="Back to Log In"
    >
      {step === 'request' && (
        <>
          <div>
            <h1 className="text-[28px] font-bold tracking-[-0.02em] text-[#111514]">
              Forgot Password
            </h1>
            <p className="mt-1.5 text-sm text-[#6b7280]">
              Enter your registered email address to receive a recovery code.
            </p>
          </div>

          {error && (
            <p className="mt-5 rounded-[10px] border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-[13px] font-medium text-danger">
              {error}
            </p>
          )}

          <form onSubmit={requestCode} className="mt-6 flex flex-col gap-4" noValidate>
            <Field label="Email Address" htmlFor={emailId} error={fieldErrors.email}>
              <Input
                id={emailId}
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                invalid={Boolean(fieldErrors.email)}
                required
              />
            </Field>

            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={loading}
              icon={<KeyRound className="h-4 w-4" aria-hidden />}
              className="mt-1"
            >
              Send Recovery Code
            </Button>
          </form>

          <div className="mt-7 border-t border-line pt-5 text-center text-sm text-[#6b7280]">
            Remembered your password?{' '}
            <Link to="/login" className="font-semibold text-brand transition-colors hover:text-brand-deep">
              Log In
            </Link>
          </div>
        </>
      )}

      {step === 'reset' && (
        <>
          <div>
            <h1 className="text-[28px] font-bold tracking-[-0.02em] text-[#111514]">
              Reset Password
            </h1>
            <p className="mt-1.5 text-sm text-[#6b7280]">
              Enter the 6-digit code sent to{' '}
              <strong className="font-semibold text-[#111514]">{email}</strong> and pick a strong
              new password.
            </p>
          </div>

          {error && (
            <p className="mt-5 rounded-[10px] border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-[13px] font-medium text-danger">
              {error}
            </p>
          )}

          <form onSubmit={resetPassword} className="mt-6 flex flex-col gap-4" noValidate>
            <Field
              label="Verification Code"
              htmlFor={codeId}
              error={fieldErrors.code}
              trailing={
                <button
                  type="button"
                  onClick={() => void resend()}
                  disabled={resending || cooldown > 0}
                  className="text-xs font-semibold text-brand transition-colors hover:text-brand-deep disabled:cursor-not-allowed disabled:text-faint"
                >
                  {resending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                </button>
              }
            >
              <Input
                id={codeId}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                className="h-[52px] text-center text-xl font-bold tracking-[0.4em]"
                invalid={Boolean(fieldErrors.code)}
                required
              />
            </Field>

            <Field
              label="New Password"
              htmlFor={passwordId}
              error={fieldErrors.password}
              hint={
                <span className="flex flex-wrap gap-x-3 gap-y-1">
                  {RULES.map((rule) => {
                    const passed = rule.test(password);

                    return (
                      <span
                        key={rule.label}
                        className={passed ? 'font-medium text-brand-strong' : 'text-faint'}
                      >
                        {passed ? '✓' : '·'} {rule.label}
                      </span>
                    );
                  })}
                </span>
              }
            >
              <Input
                id={passwordId}
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                invalid={Boolean(fieldErrors.password)}
                required
              />
            </Field>

            <Field
              label="Confirm Password"
              htmlFor={confirmId}
              error={fieldErrors.password_confirmation}
            >
              <Input
                id={confirmId}
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter your new password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                invalid={Boolean(fieldErrors.password_confirmation)}
                required
              />
            </Field>

            <Button type="submit" size="lg" fullWidth loading={loading} className="mt-1">
              Save New Password
            </Button>
          </form>

          <div className="mt-5 border-t border-line pt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setStep('request');
                setCode('');
                setPassword('');
                setConfirmation('');
                setError(null);
                setFieldErrors({});
              }}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6b7280] transition-colors hover:text-[#111514]"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Use a different email
            </button>
          </div>
        </>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center py-4 text-center">
          <img
            src={badgeSecurityImg}
            alt="Security Updated"
            className="h-[72px] w-[72px] object-contain drop-shadow-md"
          />
          <h1 className="mt-5 text-[26px] font-bold tracking-[-0.02em] text-[#111514]">
            Password Changed
          </h1>
          <p className="mt-2.5 max-w-[340px] text-sm leading-6 text-[#6b7280]">
            Your password has been reset successfully. You can now sign in using your new password.
          </p>

          <Button
            size="lg"
            fullWidth
            className="mt-7"
            onClick={() => navigate('/login?reset=1', { replace: true })}
          >
            Log In with New Password
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}
