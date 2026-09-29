import { Brand } from '../components/Brand';
import { LinkButton } from '../components/ui';

export default function NotFound() {
  return (
    <div className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="bg-grid pointer-events-none absolute inset-0 -z-10" />
      <div className="absolute left-6 top-5">
        <Brand />
      </div>
      <p className="font-display text-[7rem] leading-none text-white/10 sm:text-[10rem]">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">This page does not exist</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
        The link may be out of date, or the page may have moved. Head back to your dashboard to pick up where you
        left off.
      </p>
      <div className="mt-8 flex gap-3">
        <LinkButton to="/app" iconAfter="arrow-right">
          Go to dashboard
        </LinkButton>
        <LinkButton to="/" variant="secondary">
          Home
        </LinkButton>
      </div>
    </div>
  );
}
