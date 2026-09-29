import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import type { Level } from '../lib/types';
import { LEVEL_LABEL, LEVEL_RANK } from '../lib/format';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'reel' | 'light';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand-500 text-white hover:bg-brand-400 active:bg-brand-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_8px_20px_-10px_rgba(53,102,240,0.9)] disabled:bg-brand-500/40 disabled:shadow-none',
  secondary:
    'border border-white/10 bg-white/[0.04] text-slate-100 hover:border-white/20 hover:bg-white/[0.08]',
  ghost: 'text-slate-300 hover:bg-white/[0.06] hover:text-white',
  danger: 'border border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20',
  success: 'bg-emerald-500 font-semibold text-ink-950 hover:bg-emerald-400',
  reel:
    'bg-reel-400 font-semibold text-ink-950 hover:bg-reel-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_20px_-10px_rgba(242,173,43,0.8)]',
  light: 'bg-white font-semibold text-ink-950 hover:bg-slate-200',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-11 gap-2 px-5 text-[0.9375rem]',
};

const BASE =
  'inline-flex select-none items-center justify-center whitespace-nowrap rounded-lg font-medium transition duration-150';

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
      className={`${BASE} disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]}
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
    <Link to={to} className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${block ? 'w-full' : ''} ${className}`}>
      {icon ? <Icon name={icon} size={size === 'sm' ? 14 : 16} /> : null}
      {children}
      {iconAfter ? <Icon name={iconAfter} size={size === 'sm' ? 14 : 16} /> : null}
    </Link>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function Badge({
  children,
  tone = 'border-white/10 bg-white/[0.04] text-slate-300',
  icon,
}: {
  children: ReactNode;
  tone?: string;
  icon?: IconName;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-2xs font-semibold ${tone}`}
    >
      {icon ? <Icon name={icon} size={12} /> : null}
      {children}
    </span>
  );
}

/** Difficulty shown as signal bars beside the label, like a connection meter. */
export function LevelIndicator({ level, className = 'text-slate-300' }: { level: Level; className?: string }) {
  const rank = LEVEL_RANK[level];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${className}`}>
      <span className="flex items-end gap-[2px]" aria-hidden="true">
        {[1, 2, 3].map((bar) => (
          <span
            key={bar}
            className={`w-[3px] rounded-[1px] ${bar <= rank ? 'bg-current' : 'bg-white/15'}`}
            style={{ height: 3 + bar * 3 }}
          />
        ))}
      </span>
      {LEVEL_LABEL[level]}
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
        {required ? <span className="ml-0.5 text-slate-500">*</span> : null}
      </label>
      {children}
      {error ? <p className="field-error">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export function TextInput({ invalid, className = '', ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={`input ${invalid ? 'input-error' : ''} ${className}`} {...rest} />;
}

export function PasswordInput({
  invalid,
  className = '',
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { invalid?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        className={`input pr-11 ${invalid ? 'input-error' : ''} ${className}`}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-slate-500 transition hover:text-slate-200"
      >
        <Icon name={visible ? 'eye-off' : 'eye'} size={16} />
      </button>
    </div>
  );
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

export function ProgressBar({
  value,
  tone = 'bg-brand-500',
  className = 'h-1.5',
}: {
  value: number;
  tone?: string;
  className?: string;
}) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-white/[0.08] ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(safe)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`h-full rounded-full transition-[width] duration-500 ${tone}`} style={{ width: `${safe}%` }} />
    </div>
  );
}

/** Circular progress with an optional centred label. */
export function ProgressRing({
  value,
  size = 56,
  stroke = 5,
  tone = 'text-brand-400',
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: string;
  children?: ReactNode;
}) {
  const safe = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - safe / 100)}
          className={`transition-[stroke-dashoffset] duration-700 ${tone}`}
        />
      </svg>
      {children ? <div className="absolute inset-0 flex items-center justify-center">{children}</div> : null}
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
    info: { box: 'border-brand-400/25 bg-brand-500/[0.08] text-brand-100', icon: 'info' as IconName },
    warning: { box: 'border-amber-400/25 bg-amber-500/[0.08] text-amber-100', icon: 'alert' as IconName },
    danger: { box: 'border-rose-400/25 bg-rose-500/[0.08] text-rose-100', icon: 'alert' as IconName },
    success: { box: 'border-emerald-400/25 bg-emerald-500/[0.08] text-emerald-100', icon: 'check-circle' as IconName },
  }[tone];

  return (
    <div className={`flex gap-3 rounded-lg border px-4 py-3.5 text-sm ${styles.box}`} role="status">
      <Icon name={styles.icon} size={18} className="mt-0.5 shrink-0 opacity-80" />
      <div className="min-w-0">
        {title ? <p className="mb-0.5 font-semibold">{title}</p> : null}
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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-6 py-14 text-center">
      <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-ink-800 text-slate-400">
        <Icon name={icon} size={20} />
      </span>
      <p className="text-[0.95rem] font-semibold text-slate-100">{title}</p>
      {description ? <p className="mt-1.5 max-w-sm text-sm leading-6 text-slate-500">{description}</p> : null}
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
    <header className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

/** A compact tab strip for switching between a handful of views or filters. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="no-scrollbar inline-flex max-w-full overflow-x-auto rounded-lg border border-white/[0.07] bg-ink-950 p-1"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`h-8 shrink-0 rounded-md px-3.5 text-sm font-medium transition ${
              active ? 'bg-ink-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-progress-pulse rounded-lg bg-white/[0.04] ${className}`} />;
}
