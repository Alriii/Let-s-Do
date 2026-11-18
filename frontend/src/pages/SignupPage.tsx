import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import heroSignupImg from '../assets/hero-signup.png';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/ui/Button';
import { Field, Input, useFieldId } from '../components/ui/Field';
import { ApiError } from '../lib/api';
import { useAuth } from '../stores/auth';

const RULES = [
  { label: '8+ characters', test: (value: string) => value.length >= 8 },
  { label: 'Upper & lowercase', test: (value: string) => /[a-z]/.test(value) && /[A-Z]/.test(value) },
  { label: 'A number', test: (value: string) => /\d/.test(value) },
  { label: 'A symbol', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

export function SignupPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const firstNameId = useFieldId('signup-first-name');
  const lastNameId = useFieldId('signup-last-name');
  const emailId = useFieldId('signup-email');
  const passwordId = useFieldId('signup-password');
  const confirmId = useFieldId('signup-confirm');

  const passedRules = useMemo(
    () => RULES.filter((rule) => rule.test(password)).length,
    [password],
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const nextErrors: Record<string, string> = {};

    if (!firstName.trim()) {
      nextErrors.first_name = 'Enter your first name.';
    }

    if (!lastName.trim()) {
      nextErrors.last_name = 'Enter your last name.';
    }

    if (!email.trim()) {
      nextErrors.email = 'Enter your email address.';
    }

    if (passedRules < RULES.length) {
      nextErrors.password = 'Use 8+ characters with upper & lowercase letters, a number, and a symbol.';
    }

    if (password !== confirmation) {
      nextErrors.password_confirmation = 'The passwords do not match.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError(
        nextErrors.first_name ??
          nextErrors.last_name ??
          nextErrors.email ??
          nextErrors.password ??
          nextErrors.password_confirmation ??
          null,
      );
      return;
    }

    setLoading(true);

    try {
      await register(
        email.trim(),
        password,
        confirmation,
        firstName.trim(),
        lastName.trim(),
      );
      navigate(`/signup/success?email=${encodeURIComponent(email.trim())}`);
    } catch (caught) {
      if (caught instanceof ApiError) {
        const next: Record<string, string> = {};

        for (const [key, messages] of Object.entries(caught.errors)) {
          if (messages[0]) {
            next[key] = messages[0];
          }
        }

        setFieldErrors(next);
        setError(next.first_name ?? next.last_name ?? next.email ?? next.password ?? caught.message);
      } else {
        setError('Unable to create your account right now. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      heroTitle={
        <>
          Create your space,
          <br />
          stay in flow.
        </>
      }
      heroDescription="Set up your workspace in seconds. Build organized daily habits and track your progress with calm, focused clarity."
      heroImageSrc={heroSignupImg}
      backTo="/login"
      backLabel="Back to Log In"
    >
      <div>
        <h1 className="text-[28px] font-bold tracking-[-0.02em] text-[#111514]">Sign Up</h1>
        <p className="mt-1.5 text-sm text-[#6b7280]">
          Create an account to start managing your daily tasks.
        </p>
      </div>

      {error && (
        <p className="mt-5 rounded-[10px] border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-[13px] font-medium text-danger">
          {error}
        </p>
      )}

      <form onSubmit={submit} className="mt-6 flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="First Name" htmlFor={firstNameId} error={fieldErrors.first_name}>
            <Input
              id={firstNameId}
              type="text"
              autoComplete="given-name"
              placeholder="e.g. Alex"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              invalid={Boolean(fieldErrors.first_name)}
              required
            />
          </Field>

          <Field label="Last Name" htmlFor={lastNameId} error={fieldErrors.last_name}>
            <Input
              id={lastNameId}
              type="text"
              autoComplete="family-name"
              placeholder="e.g. Morgan"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              invalid={Boolean(fieldErrors.last_name)}
              required
            />
          </Field>
        </div>

        <Field label="Email" htmlFor={emailId} error={fieldErrors.email}>
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

        <Field
          label="Password"
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
          <div className="relative">
            <Input
              id={passwordId}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="pr-11"
              invalid={Boolean(fieldErrors.password)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded text-muted transition-colors hover:text-ink"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>
          <div className="mt-0.5 flex gap-1" aria-hidden>
            {RULES.map((rule, index) => (
              <span
                key={rule.label}
                className={
                  index < passedRules
                    ? 'h-1 flex-1 rounded-full bg-brand'
                    : 'h-1 flex-1 rounded-full bg-line'
                }
              />
            ))}
          </div>
        </Field>

        <Field
          label="Confirm Password"
          htmlFor={confirmId}
          error={fieldErrors.password_confirmation}
        >
          <Input
            id={confirmId}
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Re-enter your password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            invalid={Boolean(fieldErrors.password_confirmation)}
            required
          />
        </Field>

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={loading}
          icon={<UserPlus className="h-4 w-4" aria-hidden />}
          className="mt-1"
        >
          Sign Up
        </Button>
      </form>

      <div className="mt-7 border-t border-line pt-5 text-center text-sm text-[#6b7280]">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand transition-colors hover:text-brand-deep">
          Log In
        </Link>
      </div>
    </AuthLayout>
  );
}
