import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import heroLoginImg from '../assets/hero-login.png';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/ui/Button';
import { Field, Input, useFieldId } from '../components/ui/Field';
import { useToast } from '../components/ui/Toast';
import { ApiError } from '../lib/api';
import { useAuth } from '../stores/auth';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const emailId = useFieldId('login-email');
  const passwordId = useFieldId('login-password');

  useEffect(() => {
    if (params.get('verified') === '1') {
      setNotice('Email verified. Log in to open your workspace.');
    } else if (params.get('reset') === '1') {
      setNotice('Password updated. Log in with your new password.');
    }
  }, [params]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    try {
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch (caught) {
      if (caught instanceof ApiError) {
        if (caught.status === 403 && caught.data.requires_verification) {
          const unverifiedEmail =
            typeof caught.data.email === 'string' ? caught.data.email : email.trim();
          toast.info('Please verify your email address to continue.');
          navigate(`/verify?email=${encodeURIComponent(unverifiedEmail)}`);
          return;
        }

        setFieldErrors({
          email: caught.firstError('email') ?? '',
          password: caught.firstError('password') ?? '',
        });
        setError(caught.firstError('email') ?? caught.message);
      } else {
        setError('Unable to log in right now. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      heroTitle={
        <>
          Small steps make
          <br />
          big things happen.
        </>
      }
      heroDescription="Stay organized, focused, and get more done every day. Let's Do! provides a calm, streamlined dashboard to organize your schedule and focus areas."
      heroImageSrc={heroLoginImg}
    >
      <div>
        <h1 className="text-[28px] font-bold tracking-[-0.02em] text-[#111514]">Log In</h1>
        <p className="mt-1.5 text-sm text-[#6b7280]">
          Welcome back! Enter your details to continue.
        </p>
      </div>

      {notice && (
        <p className="mt-5 rounded-[10px] border border-brand/25 bg-brand-tint px-3.5 py-2.5 text-[13px] font-medium text-brand-strong">
          {notice}
        </p>
      )}

      {error && (
        <p className="mt-5 rounded-[10px] border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-[13px] font-medium text-danger">
          {error}
        </p>
      )}

      <form onSubmit={submit} className="mt-6 flex flex-col gap-4" noValidate>
        <Field label="Email" htmlFor={emailId} error={fieldErrors.email}>
          <Input
            id={emailId}
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            invalid={Boolean(fieldErrors.email)}
          />
        </Field>

        <Field
          label="Password"
          htmlFor={passwordId}
          error={fieldErrors.password}
          trailing={
            <Link
              to="/forgot-password"
              className="text-[13px] font-medium text-brand transition-colors hover:text-brand-deep"
            >
              Forgot password?
            </Link>
          }
        >
          <div className="relative">
            <Input
              id={passwordId}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="pr-11"
              required
              invalid={Boolean(fieldErrors.password)}
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
        </Field>

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={loading}
          icon={<LogIn className="h-4 w-4" aria-hidden />}
          className="mt-1"
        >
          Log In
        </Button>
      </form>

      <div className="mt-7 border-t border-line pt-5 text-center text-sm text-[#6b7280]">
        Don&rsquo;t have an account?{' '}
        <Link to="/signup" className="font-semibold text-brand transition-colors hover:text-brand-deep">
          Sign Up
        </Link>
      </div>
    </AuthLayout>
  );
}
