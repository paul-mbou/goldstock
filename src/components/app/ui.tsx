import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  CupSoda,
  Droplet,
  FlaskConical,
  Footprints,
  Headphones,
  Minus,
  Plus,
  Scissors,
  Search,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Tablet,
  Tag,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
  type SelectHTMLAttributes,
} from 'react';
import {
  initials as toInitials,
  type Category,
  type CategoryIcon,
  type Tone as CategoryTone,
  type DepositStatus,
  type MemberStatus,
  type ProductStatus,
  type SaleState,
} from '../../data/dashboard';
import type { StockStatus } from '../../lib/demo';

/* ------------------------------------------------------------------ badges */

export type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'navy';

const toneClass: Record<Tone, string> = {
  success:
    'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20',
  warning: 'bg-gold-50 text-gold-700 ring-gold-500/25 dark:bg-gold-400/10 dark:text-gold-300 dark:ring-gold-400/20',
  danger: 'bg-red-50 text-red-700 ring-red-600/15 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-400/20',
  neutral: 'bg-sunken text-ink-mute ring-line',
  navy: 'bg-navy-50 text-navy-700 ring-navy-200 dark:bg-white/5 dark:text-navy-100 dark:ring-white/10',
};

export function Badge({ tone, children, className = '' }: { tone: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset ${toneClass[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

const statusMeta = {
  sale: {
    ok: { label: 'Validée', tone: 'success' },
    partial: { label: 'Retour partiel', tone: 'warning' },
    refunded: { label: 'Remboursée', tone: 'neutral' },
    cancelled: { label: 'Annulée', tone: 'danger' },
  },
  product: {
    active: { label: 'Actif', tone: 'success' },
    draft: { label: 'Brouillon', tone: 'neutral' },
    archived: { label: 'Archivé', tone: 'neutral' },
  },
  stock: {
    ok: { label: 'En stock', tone: 'success' },
    low: { label: 'Stock faible', tone: 'warning' },
    out: { label: 'Rupture', tone: 'danger' },
  },
  deposit: {
    pending: { label: 'À vérifier', tone: 'warning' },
    verified: { label: 'Validé', tone: 'success' },
    flagged: { label: 'Écart signalé', tone: 'danger' },
  },
  member: {
    active: { label: 'Actif', tone: 'success' },
    invited: { label: 'Invitation envoyée', tone: 'warning' },
    suspended: { label: 'Suspendu', tone: 'neutral' },
  },
} satisfies Record<string, Record<string, { label: string; tone: Tone }>>;

type StatusProps =
  | { kind: 'sale'; status: SaleState }
  | { kind: 'product'; status: ProductStatus }
  | { kind: 'stock'; status: StockStatus }
  | { kind: 'deposit'; status: DepositStatus }
  | { kind: 'member'; status: MemberStatus };

export function StatusBadge(props: StatusProps) {
  const meta = (statusMeta[props.kind] as Record<string, { label: string; tone: Tone }>)[props.status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export const statusLabel = (kind: StatusProps['kind'], status: string) =>
  (statusMeta[kind] as Record<string, { label: string }>)[status].label;

/** Signed change in percent; green when the business is doing better. */
export function Delta({ value, suffix }: { value: number; suffix?: string }) {
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span
        className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-bold ${
          up
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300'
            : 'bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-300'
        }`}
      >
        <Icon className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
        {up ? '+' : '−'}
        {Math.abs(value).toLocaleString('fr-FR')}&nbsp;%
      </span>
      {suffix && <span className="text-ink-mute">{suffix}</span>}
    </span>
  );
}

/* ------------------------------------------------------------------ layout pieces */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-[1.75rem]">{title}</h1>
        <p className="mt-1 text-[0.9375rem] text-ink-mute">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  children,
  tone = 'navy',
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  children?: ReactNode;
  tone?: 'navy' | 'gold' | 'danger' | 'warning';
}) {
  const iconTone = {
    navy: 'bg-navy-50 text-navy-700 dark:bg-white/5 dark:text-navy-100',
    gold: 'bg-gold-50 text-gold-700 dark:bg-gold-400/10 dark:text-gold-300',
    warning: 'bg-gold-50 text-gold-700 dark:bg-gold-400/10 dark:text-gold-300',
    danger: 'bg-red-50 text-red-600 dark:bg-red-400/10 dark:text-red-300',
  }[tone];
  return (
    <div className="app-card p-4 sm:p-5">
      <div className="flex min-h-9 items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink-mute">{label}</p>
        <span className={`hidden size-9 shrink-0 place-items-center rounded-xl sm:grid ${iconTone}`}>
          <Icon className="size-[1.125rem]" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 text-base font-extrabold tracking-tight text-ink tabular-nums min-[380px]:text-lg sm:mt-3 sm:text-2xl">
        {value}
      </p>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-sunken text-ink-mute">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <p className="mt-4 font-bold text-ink">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-ink-mute">{children}</div>}
    </div>
  );
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  const sizes = { xs: 'size-7 text-[0.6875rem]', sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-12 text-base' };
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full bg-linear-to-b from-gold-50 to-gold-100 font-semibold tracking-wide text-gold-700 ring-1 ring-gold-200/70 ring-inset dark:from-gold-400/15 dark:to-gold-400/5 dark:text-gold-200 dark:ring-gold-300/20 ${sizes[size]}`}
    >
      {toInitials(name)}
    </span>
  );
}

/** Card with an optional title row; the body keeps its own padding. */
export function Card({
  title,
  description,
  action,
  children,
  className = '',
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`app-card ${className}`}>
      {title && (
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 sm:px-6">
          <div>
            <h2 className="font-bold text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-ink-mute">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={bodyClassName ?? (title ? 'px-5 pb-5 sm:px-6 sm:pb-6' : 'p-5 sm:p-6')}>{children}</div>
    </section>
  );
}

export const linkClass =
  'inline-flex items-center gap-1 text-sm font-semibold text-gold-700 hover:underline dark:text-gold-300';

/* ------------------------------------------------------------------ categories */

export const toneStyles: Record<CategoryTone, { tile: string; dot: string; hex: string }> = {
  gold: { tile: 'bg-gold-50 text-gold-700 dark:bg-gold-400/10 dark:text-gold-300', dot: 'bg-gold-500', hex: '#e89d12' },
  navy: { tile: 'bg-navy-50 text-navy-700 dark:bg-white/5 dark:text-navy-100', dot: 'bg-navy-500', hex: '#5b6680' },
  teal: { tile: 'bg-teal-50 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300', dot: 'bg-teal-500', hex: '#14b8a6' },
  rose: { tile: 'bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300', dot: 'bg-rose-500', hex: '#f43f5e' },
  violet: {
    tile: 'bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300',
    dot: 'bg-violet-500',
    hex: '#8b5cf6',
  },
};

export const categoryIcons: Record<CategoryIcon, LucideIcon> = {
  phone: Smartphone,
  tablet: Tablet,
  headphones: Headphones,
  shoe: Footprints,
  shirt: Shirt,
  bag: ShoppingBag,
  drop: Droplet,
  sparkles: Sparkles,
  flask: FlaskConical,
  scissors: Scissors,
  basket: ShoppingBasket,
  cup: CupSoda,
  tag: Tag,
};

export function CategoryTile({ category, size = 'md' }: { category?: Category; size?: 'sm' | 'md' | 'lg' }) {
  const Icon = categoryIcons[category?.icon ?? 'tag'];
  const sizes = { sm: 'size-8 rounded-lg', md: 'size-10 rounded-xl', lg: 'size-12 rounded-xl' };
  return (
    <span className={`grid shrink-0 place-items-center ${sizes[size]} ${toneStyles[category?.tone ?? 'navy'].tile}`}>
      <Icon className={size === 'sm' ? 'size-4' : 'size-5'} aria-hidden="true" />
    </span>
  );
}

export function CategoryLabel({ category }: { category?: Category }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-ink-soft">
      <span className={`size-2 rounded-full ${toneStyles[category?.tone ?? 'navy'].dot}`} aria-hidden="true" />
      {category?.name ?? '—'}
    </span>
  );
}

/* ------------------------------------------------------------------ controls */

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  selectOnMobile = false,
}: {
  label: string;
  options: readonly { id: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  selectOnMobile?: boolean;
}) {
  return (
    <>
      {selectOnMobile && (
        <div className="relative sm:hidden">
          <select
            aria-label={label}
            value={value}
            onChange={(event) => onChange(event.target.value as T)}
            className={`${selectClass} w-full`}
          >
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.count === undefined ? option.label : `${option.label} (${option.count})`}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-mute"
            aria-hidden="true"
          />
        </div>
      )}
      <SegmentedRadios label={label} options={options} value={value} onChange={onChange} hidden={selectOnMobile} />
    </>
  );
}

function SegmentedRadios<T extends string>({
  label,
  options,
  value,
  onChange,
  hidden,
}: {
  label: string;
  options: readonly { id: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  hidden: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`${hidden ? 'hidden sm:inline-flex' : 'inline-flex'} max-w-full overflow-x-auto rounded-xl bg-sunken p-1 ring-1 ring-line ring-inset`}
    >
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.id)}
            className={`inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold whitespace-nowrap transition ${
              active
                ? 'bg-panel text-ink shadow-[0_1px_3px_rgb(13_24_46/0.12)] dark:bg-navy-700'
                : 'text-ink-mute hover:text-ink'
            }`}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={`rounded-md px-1.5 text-xs tabular-nums ${active ? 'bg-gold-100 text-gold-700 dark:bg-gold-400/15 dark:text-gold-300' : 'bg-panel/70 dark:bg-white/5'}`}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  label,
  placeholder,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 size-[1.125rem] -translate-y-1/2 text-ink-mute"
        aria-hidden="true"
      />
      <input
        type="search"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-line bg-panel pr-4 pl-10 text-[0.9375rem] text-ink transition placeholder:text-ink-mute/80 hover:border-navy-200 focus:border-gold-500 focus:ring-4 focus:ring-gold-400/25 focus-visible:outline-none dark:hover:border-white/20"
      />
    </div>
  );
}

export const selectClass =
  'h-11 appearance-none rounded-xl border border-line bg-panel pr-10 pl-3.5 text-[0.9375rem] font-medium text-ink transition hover:border-navy-200 focus:border-gold-500 focus:ring-4 focus:ring-gold-400/25 focus-visible:outline-none dark:hover:border-white/20';

const controlBase =
  'w-full rounded-xl border bg-panel text-[0.9375rem] text-ink transition placeholder:text-ink-mute/70 focus:ring-4 focus-visible:outline-none';

export const inputClass = (invalid = false) =>
  `${controlBase} h-11 px-3.5 ${
    invalid
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15'
      : 'border-line hover:border-navy-200 focus:border-gold-500 focus:ring-gold-400/25 dark:hover:border-white/20'
  }`;

export const textareaClass = `${controlBase} border-line px-3.5 py-3 hover:border-navy-200 focus:border-gold-500 focus:ring-gold-400/25 dark:hover:border-white/20`;

export function FormField({
  id,
  label,
  hint,
  error,
  children,
  className = '',
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-400"
        >
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-sm text-ink-mute">{hint}</p>
      )}
    </div>
  );
}

export function SelectBox({ className = '', children, ...select }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={`relative ${className}`}>
      <select {...select} className={`${selectClass} w-full`}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-mute"
        aria-hidden="true"
      />
    </div>
  );
}

/** Underlined tabs for switching views inside one page. */
export function Tabs<T extends string>({
  label,
  tabs,
  value,
  onChange,
}: {
  label: string;
  tabs: readonly { id: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`-mb-px inline-flex h-11 items-center gap-2 border-b-2 px-3 text-sm font-semibold whitespace-nowrap transition ${
              active ? 'border-gold-500 text-ink' : 'border-transparent text-ink-mute hover:text-ink'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="rounded-md bg-sunken px-1.5 text-xs text-ink-mute tabular-nums">{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  labelledBy,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  labelledBy?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-gold-500' : 'bg-navy-200 dark:bg-white/15'}`}
    >
      <span
        className={`absolute top-1 left-1 size-5 rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : ''}`}
      />
    </button>
  );
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = Infinity,
  label,
  size = 'md',
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
  size?: 'sm' | 'md';
}) {
  const box = size === 'sm' ? 'size-8' : 'size-10';
  const button = `grid ${box} place-items-center rounded-lg text-ink-soft transition hover:bg-sunken hover:text-ink disabled:opacity-35 disabled:hover:bg-transparent`;
  return (
    <div
      className="inline-flex items-center rounded-xl border border-line bg-panel p-0.5"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        className={button}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Diminuer"
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <span className="min-w-8 text-center text-sm font-bold text-ink tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={button}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Augmenter"
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/** Horizontal bars, one per row, sharing the same scale. */
export function BarList({
  rows,
  format,
}: {
  rows: { id: string; label: ReactNode; value: number; color: string; meta?: ReactNode }[];
  format: (value: number) => ReactNode;
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <ul className="space-y-4">
      {rows.map((row) => (
        <li key={row.id}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-semibold text-ink">{row.label}</span>
            <span className="shrink-0 text-ink-mute tabular-nums">
              {row.meta && <span className="mr-2">{row.meta}</span>}
              <span className="font-bold text-ink">{format(row.value)}</span>
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-sunken">
            <div
              className="h-full rounded-full"
              style={{ width: `${(row.value / max) * 100}%`, background: row.color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Ring chart; the legend lives next to it so the numbers stay readable. */
export function Donut({
  segments,
  center,
  caption,
}: {
  segments: { id: string; value: number; color: string }[];
  center: ReactNode;
  caption: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="relative mx-auto size-40">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-label={caption}>
        <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="12" className="stroke-sunken" />
        {segments.map((segment) => {
          const length = (segment.value / total) * circumference;
          const dash = `${Math.max(0, length - 1.5)} ${circumference}`;
          const circle = (
            <circle
              key={segment.id}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              strokeWidth="12"
              stroke={segment.color}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
            />
          );
          offset += length;
          return circle;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{center}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ dialogs */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = 'center',
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  variant?: 'center' | 'sheet';
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const sheet = variant === 'sheet';
  const openRef = useRef(open);
  openRef.current = open;

  /* While a sheet slides out, keep showing what it showed when it was asked to close. */
  const content = useRef({ title, description, children, footer });
  if (open) content.current = { title, description, children, footer };
  const shown = content.current;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      delete dialog.dataset.closing;
      if (!dialog.open) dialog.showModal();
      return;
    }
    if (!dialog.open) return;
    if (!sheet) {
      dialog.close();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      dialog.close();
      delete dialog.dataset.closing;
    };
    const onEnd = (event: AnimationEvent) => event.animationName === 'sheet-out' && finish();
    dialog.dataset.closing = '';
    dialog.addEventListener('animationend', onEnd);
    const fallback = window.setTimeout(finish, SHEET_EXIT_MS + 80);
    return () => {
      dialog.removeEventListener('animationend', onEnd);
      window.clearTimeout(fallback);
    };
  }, [open, sheet]);

  const frame = sheet
    ? 'mr-0 ml-auto h-dvh max-h-dvh w-full max-w-lg animate-sheet-in rounded-none sm:rounded-l-3xl data-closing:pointer-events-none data-closing:animate-sheet-out data-closing:backdrop:animate-backdrop-out'
    : `m-auto max-h-[calc(100dvh-2rem)] ${wide ? 'w-[min(46rem,calc(100%-2rem))]' : 'w-[min(34rem,calc(100%-2rem))]'} animate-dialog-in rounded-3xl`;

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        if (!sheet) return;
        event.preventDefault();
        onClose();
      }}
      onClose={() => openRef.current && onClose()}
      onClick={(event) => event.target === ref.current && onClose()}
      className={`${frame} flex-col overflow-hidden border border-line bg-panel p-0 text-ink shadow-2xl backdrop:animate-backdrop-in backdrop:bg-navy-950/60 backdrop:backdrop-blur-[2px] open:flex`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
        <div>
          <h2 id={titleId} className="text-lg font-bold">
            {shown.title}
          </h2>
          {shown.description && <p className="mt-0.5 text-sm text-ink-mute">{shown.description}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="-mt-1 -mr-2 grid size-10 shrink-0 place-items-center rounded-full text-ink-mute transition hover:bg-sunken hover:text-ink"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-5">{shown.children}</div>
      {shown.footer && (
        <div className="flex flex-wrap justify-end gap-2.5 border-t border-line bg-sunken/60 px-6 py-4">
          {shown.footer}
        </div>
      )}
    </dialog>
  );
}

const SHEET_EXIT_MS = 200;

/**
 * Open / close state for a sheet that must stay mounted while it slides out.
 * `key` changes on every opening, so the sheet's form starts fresh each time.
 */
export function useSheet<T>() {
  const [state, setState] = useState<{ value: T | null; open: boolean; key: number }>({
    value: null,
    open: false,
    key: 0,
  });
  const show = useCallback((value: T) => setState((current) => ({ value, open: true, key: current.key + 1 })), []);
  const hide = useCallback(() => setState((current) => ({ ...current, open: false })), []);
  return { ...state, show, hide };
}

/** The last non-empty value, so a closing sheet keeps its data until it has slid out. */
export function useLatest<T>(value: T | null | undefined) {
  const last = useRef(value);
  if (value != null) last.current = value;
  return last.current;
}

/* ------------------------------------------------------------------ feedback */

type Toast = { id: number; message: string; tone: 'success' | 'error'; action?: { label: string; run: () => void } };

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((toast) => toast.id !== id)), []);

  const notify = useCallback(
    (message: string, options: { tone?: Toast['tone']; action?: Toast['action'] } = {}) => {
      const id = ++nextId.current;
      setToasts((list) => [
        ...list.slice(-2),
        { id, message, tone: options.tone ?? 'success', action: options.action },
      ]);
      window.setTimeout(() => dismiss(id), options.action ? 7000 : 4500);
    },
    [dismiss],
  );

  const region = (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="pointer-events-auto flex w-full max-w-sm animate-dialog-in items-center gap-3 rounded-2xl bg-navy-900 py-3 pr-3 pl-4 text-sm text-white shadow-2xl ring-1 ring-white/10"
        >
          {toast.tone === 'success' ? (
            <CircleCheck className="size-5 shrink-0 text-emerald-400" aria-hidden="true" />
          ) : (
            <CircleAlert className="size-5 shrink-0 text-red-400" aria-hidden="true" />
          )}
          <p className="flex-1 leading-snug">{toast.message}</p>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.run();
                dismiss(toast.id);
              }}
              className="rounded-lg px-2.5 py-1.5 font-semibold text-gold-300 transition hover:bg-white/10"
            >
              {toast.action.label}
            </button>
          )}
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label="Fermer le message"
            className="grid size-8 place-items-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );

  return { notify, region };
}

/** Closes a popover on outside click or Escape. */
export function useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [ref, open, onClose]);
}

/** Reads `?key=` once on mount, so links from other pages can preset filters. */
export function useQueryParam(key: string) {
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => setValue(new URLSearchParams(window.location.search).get(key)), [key]);
  return value;
}
