import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand-500 text-white hover:bg-brand-400 active:bg-brand-600 shadow-[0_8px_24px_-12px_rgba(53,102,240,0.9)] disabled:bg-brand-500/40',
  secondary: 'border border-ink-600 bg-ink-800/70 text-slate-200 hover:border-ink-500 hover:bg-ink-700/70',
  ghost: 'text-slate-300 hover:bg-ink-800/70 hover:text-white',
  danger: 'border border-rose-500/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20',
  success: 'bg-emerald-500 text-ink-950 hover:bg-emerald-400 font-semibold',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2.5 px-6 text-[0.95rem]',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconAfter?: IconName;
  loading?: boolean;
  block?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconAfter,
  loading,
  block,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex select-none items-center justify-center rounded-lg font-medium transition
        disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]}
        ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading ? <Spinner /> : icon ? <Icon name={icon} size={size === 'sm' ? 14 : 16} /> : null}
      {children}
      {iconAfter && !loading ? <Icon name={iconAfter} size={size === 'sm' ? 14 : 16} /> : null}
    </button>
  );
}

interface LinkButtonProps {
  to: string;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconAfter?: IconName;
  block?: boolean;
  className?: string;
  children: ReactNode;
}

export function LinkButton({
  to,
  variant = 'primary',
  size = 'md',
  icon,
  iconAfter,
  block,
  className = '',
  children,
}: LinkButtonProps) {
  return (
    <Link
      to={to}
      className={`inline-flex select-none items-center justify-center rounded-lg font-medium transition
        ${VARIANTS[variant]} ${SIZES[size]} ${block ? 'w-full' : ''} ${className}`}
    >
      {icon ? <Icon name={icon} size={size === 'sm' ? 14 : 16} /> : null}
      {children}
      {iconAfter ? <Icon name={iconAfter} size={size === 'sm' ? 14 : 16} /> : null}
    </Link>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function Badge({
  children,
  tone = 'border-ink-600 bg-ink-800/70 text-slate-300',
  icon,
}: {
  children: ReactNode;
  tone?: string;
  icon?: IconName;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold tracking-wide ${tone}`}
    >
      {icon ? <Icon name={icon} size={12} /> : null}
      {children}
    </span>
  );
}

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, error, required, children }: FieldProps) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-1 text-brand-300">*</span> : null}
      </label>
      {children}
      {error ? <p className="field-error">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export function TextInput({ invalid, className = '', ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={`input ${invalid ? 'input-error' : ''} ${className}`} {...rest} />;
}

export function TextArea({ invalid, className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea className={`input resize-y ${invalid ? 'input-error' : ''} ${className}`} {...rest} />;
}

export function Select({ invalid, className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select className={`input appearance-none pr-9 ${invalid ? 'input-error' : ''} ${className}`} {...rest}>
      {children}
    </select>
  );
}

export function ProgressBar({ value, tone = 'bg-brand-500' }: { value: number; tone?: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-ink-700"
      role="progressbar"
      aria-valuenow={safe}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`h-full rounded-full transition-[width] duration-500 ${tone}`} style={{ width: `${safe}%` }} />
    </div>
  );
}

export function Callout({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success';
  title?: string;
  children: ReactNode;
}) {
  const styles = {
    info: { box: 'border-brand-500/30 bg-brand-500/10 text-brand-100', icon: 'info' as IconName },
    warning: { box: 'border-amber-500/30 bg-amber-500/10 text-amber-100', icon: 'alert' as IconName },
    danger: { box: 'border-rose-500/30 bg-rose-500/10 text-rose-100', icon: 'alert' as IconName },
    success: { box: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100', icon: 'check-circle' as IconName },
  }[tone];

  return (
    <div className={`flex gap-3 rounded-xl border p-4 text-sm ${styles.box}`} role="status">
      <Icon name={styles.icon} size={18} className="mt-0.5 shrink-0 opacity-80" />
      <div className="min-w-0">
        {title ? <p className="mb-1 font-semibold">{title}</p> : null}
        <div className="leading-6 opacity-90">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon = 'document',
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-600 px-6 py-14 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-ink-600 bg-ink-800/60 text-slate-400">
        <Icon name={icon} size={22} />
      </span>
      <p className="text-base font-semibold text-slate-200">{title}</p>
      {description ? <p className="mt-1.5 max-w-sm text-sm text-slate-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-[1.75rem]">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-progress-pulse rounded-lg bg-ink-800/80 ${className}`} />;
}
