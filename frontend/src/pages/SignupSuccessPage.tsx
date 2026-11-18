import { MailCheck } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/ui/Button';

export function SignupSuccessPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const email = params.get('email') ?? '';

  return (
    <AuthLayout
      heroTitle={
        <>
          Account ready,
          <br />
          welcome aboard.
        </>
      }
      heroDescription="Your account has been set up successfully. One quick verification step and you can start organizing your day."
      backTo="/login"
      backLabel="Back to Log In"
    >
      <div className="flex flex-col items-center py-2 text-center">
        <span className="grid h-[72px] w-[72px] place-items-center rounded-full bg-brand-tint text-brand-strong">
          <MailCheck className="h-9 w-9" aria-hidden />
        </span>
        <h1 className="mt-5 text-[26px] font-bold tracking-[-0.02em] text-ink">Account Created</h1>
        <p className="mt-2 max-w-[340px] text-sm leading-6 text-muted">
          Your Let&rsquo;s Do! account has been created successfully. We sent a 6-digit verification
          code{email ? ' to ' : ''}
          {email && <span className="font-medium text-ink">{email}</span>}.
        </p>

        <Button
          size="lg"
          fullWidth
          className="mt-6"
          onClick={() => navigate(`/verify?email=${encodeURIComponent(email)}`)}
        >
          Verify Your Email
        </Button>

        <Link
          to="/login"
          className="mt-4 text-sm font-semibold text-brand transition-colors hover:text-brand-deep"
        >
          Back to Log In
        </Link>
      </div>
    </AuthLayout>
  );
}
