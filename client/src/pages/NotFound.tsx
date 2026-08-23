import { LinkButton } from '../components/ui';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="eyebrow mb-3">Error 404</p>
      <h1 className="text-3xl font-bold tracking-tight text-white">This page does not exist</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
        The link may be out of date, or the page may have moved. Head back to the dashboard to pick up
        where you left off.
      </p>
      <div className="mt-7 flex gap-3">
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
