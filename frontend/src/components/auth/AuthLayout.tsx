import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import logoImg from '../../assets/logo.png';

interface AuthLayoutProps {
  children: ReactNode;
  heroTitle: ReactNode;
  heroDescription: string;
  heroImageSrc?: string;
  backTo?: string;
  backLabel?: string;
}

export function AuthLayout({
  children,
  heroTitle,
  heroDescription,
  heroImageSrc,
  backTo,
  backLabel,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f4f6f4]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1920px] flex-col px-6 py-8 sm:px-10 lg:px-20 xl:px-32">
        <header className="flex items-center justify-between gap-4">
          <Link to="/login" className="flex items-center gap-3 group">
            <img
              src={logoImg}
              alt="Let's Do!"
              className="h-11 w-11 rounded-[10px] object-contain shadow-[0_4px_12px_rgba(75,168,110,0.25)] transition-transform group-hover:scale-105"
            />
            <span className="text-[28px] font-bold tracking-[-0.02em] text-[#111514]">
              Let&rsquo;s Do!
            </span>
          </Link>

          {backTo && backLabel && (
            <Link
              to={backTo}
              className="inline-flex items-center gap-2 text-sm font-medium text-[#6b7280] transition-colors hover:text-[#111514]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {backLabel}
            </Link>
          )}
        </header>

        <div className="grid flex-1 items-center gap-12 py-10 lg:grid-cols-[580px_1fr] lg:gap-16 xl:gap-28">
          <section className="flex flex-col justify-center max-w-[580px]">
            <h1 className="text-[36px] font-bold leading-[1.15] tracking-[-0.025em] text-[#111514] sm:text-[44px] lg:text-[52px] lg:leading-[64px]">
              {heroTitle}
            </h1>
            <p className="mt-5 text-[15px] leading-7 text-[#6b7280] sm:text-[17px] sm:leading-7">
              {heroDescription}
            </p>
            {heroImageSrc && (
              <div className="mt-8 hidden overflow-hidden rounded-[16px] border border-[#eaeeeb] bg-white shadow-[0_16px_40px_rgba(17,21,20,0.06)] lg:block">
                <img
                  src={heroImageSrc}
                  alt="Let's Do! preview"
                  className="h-[320px] w-full max-w-[580px] object-cover"
                />
              </div>
            )}
          </section>

          <section className="w-full flex justify-center lg:justify-end">
            <div className="w-full max-w-[520px] rounded-[20px] border border-[#eaeeeb] bg-white p-7 shadow-[0_20px_50px_rgba(17,21,20,0.06)] sm:p-10">
              {children}
            </div>
          </section>
        </div>

        <footer className="pb-3 pt-6 text-center text-xs text-[#9ca3af]">
          Let&rsquo;s Do! &middot; Calm focus, steady progress.
        </footer>
      </div>
    </div>
  );
}
