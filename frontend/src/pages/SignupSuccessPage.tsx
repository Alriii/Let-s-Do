import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import badgeSuccessImg from '../assets/badge-success.png';
import heroSignupSuccessImg from '../assets/hero-signup-success.png';
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
          Create your space,
          <br />
          stay in flow.
        </>
      }
      heroDescription="Set up your workspace in seconds. Build organized daily habits and track your progress with calm, focused clarity."
      heroImageSrc={heroSignupSuccessImg}
      backTo="/login"
      backLabel="Back to Log In"
    >
      <div className="flex flex-col items-center py-4 text-center">
        <img
          src={badgeSuccessImg}
          alt="Success"
          className="h-[72px] w-[72px] object-contain drop-shadow-md"
        />

        <h1 className="mt-5 text-[26px] font-bold tracking-[-0.02em] text-[#111514]">
          Account Created Successfully!
        </h1>

        <p className="mt-2.5 max-w-[380px] text-sm leading-6 text-[#6b7280]">
          Your Let&rsquo;s Do! account has been created successfully.
          {email ? (
            <>
              {' '}
              A 6-digit verification code was sent to{' '}
              <strong className="font-semibold text-[#111514]">{email}</strong>.
            </>
          ) : (
            ' You can now verify your email or log in to access your dashboard.'
          )}
        </p>

        <div className="mt-7 flex w-full flex-col gap-3">
          <Button
            size="lg"
            fullWidth
            onClick={() =>
              navigate(
                email
                  ? `/verify?email=${encodeURIComponent(email)}`
                  : '/login',
              )
            }
          >
            {email ? 'Verify Email with 6-Digit Code' : 'Continue to Log In'}
          </Button>

          <Link
            to="/login"
            className="text-sm font-semibold text-brand transition-colors hover:text-brand-deep text-center py-1"
          >
            Skip to Log In
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
