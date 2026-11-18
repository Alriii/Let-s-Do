import { KeyRound } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import badgeEnvelopeImg from '../assets/badge-envelope.png';
import heroSignupImg from '../assets/hero-signup.png';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/ui/Button';
import { Field, Input, useFieldId } from '../components/ui/Field';
import { useToast } from '../components/ui/Toast';
import { api, ApiError } from '../lib/api';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const emailId = useFieldId('verify-email');
  const codeId = useFieldId('verify-code');

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!email.trim()) {
      setFieldErrors({ email: 'Enter your email address.' });
      return;
    }

    if (code.length !== 6) {
      setFieldErrors({ code: 'Enter the 6-digit code from your email.' });
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/email/verify', { email: email.trim(), code });
      toast.success('Email verified! You can log in now.');
      navigate('/login?verified=1', { replace: true });
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.firstError('code') ?? caught.message);
        setFieldErrors({
          email: caught.firstError('email') ?? '',
          code: caught.firstError('code') ?? '',
        });
      } else {
        setError('Unable to verify that code right now.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!email.trim()) {
      setFieldErrors({ email: 'Enter your email address first.' });
      return;
    }

    setResending(true);
    setError(null);

    try {
      await api.post('/auth/email/resend', { email: email.trim() });
      toast.success('A fresh verification code has been sent.');
      setCooldown(30);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to resend the code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      heroTitle={
        <>
          One quick code,
          <br />
          then you&rsquo;re in.
        </>
      }
      heroDescription="Enter the 6-digit verification code we emailed you to activate your account. Codes expire after 15 minutes."
      heroImageSrc={heroSignupImg}
      backTo="/login"
      backLabel="Back to Log In"
    >
      <div className="flex flex-col items-center text-center">
        <img
          src={badgeEnvelopeImg}
          alt="Verification Code Sent"
          className="h-[72px] w-[72px] object-contain drop-shadow-md"
        />
        <h1 className="mt-4 text-[24px] font-bold tracking-[-0.02em] text-[#111514] sm:text-[26px]">
          Verification Code Sent
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#6b7280]">
          A 6-digit verification code has been sent to your email.
          <br />
          Please check your inbox to proceed.
        </p>
      </div>

      {error && (
        <p className="mt-5 rounded-[10px] border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-[13px] font-medium text-danger">
          {error}
        </p>
      )}

      <form onSubmit={verify} className="mt-6 flex flex-col gap-4" noValidate>
        <Field label="Email" htmlFor={emailId} error={fieldErrors.email}>
          <Input
            id={emailId}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            invalid={Boolean(fieldErrors.email)}
            required
          />
        </Field>

        <Field label="Verification Code" htmlFor={codeId} error={fieldErrors.code}>
          <Input
            id={codeId}
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Enter 6-digit code"
            className="h-[52px] text-center text-xl font-bold tracking-[0.4em]"
            invalid={Boolean(fieldErrors.code)}
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
          Verify Email
        </Button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-3 border-t border-line pt-5 text-sm">
        <button
          type="button"
          onClick={() => void resend()}
          disabled={resending || cooldown > 0}
          className="font-semibold text-brand transition-colors hover:text-brand-deep disabled:cursor-not-allowed disabled:text-faint"
        >
          {resending
            ? 'Sending a new code…'
            : cooldown > 0
              ? `Resend code in ${cooldown}s`
              : 'Resend verification code'}
        </button>
        <Link to="/signup" className="text-[13px] text-muted transition-colors hover:text-ink">
          Need a different account? Sign up again
        </Link>
      </div>
    </AuthLayout>
  );
}
