import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/Feedback';

export function NotFoundPage() {
  return (
    <div className="pt-10">
      <EmptyState
        icon={<Compass className="h-5 w-5" aria-hidden />}
        title="This page went off schedule"
        description="The page you're looking for doesn't exist. Head back to your dashboard and keep moving forward."
        action={
          <Link
            to="/"
            className="inline-flex h-10 items-center rounded-[10px] bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-deep"
          >
            Back to Dashboard
          </Link>
        }
      />
    </div>
  );
}
