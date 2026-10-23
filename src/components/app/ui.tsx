import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  CircleCheck,
  CircleAlert,
  Search,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { DepositStatus, MemberStatus, SaleStatus, StockStatus } from '../../data/dashboard';

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
    paid: { label: 'Payée', tone: 'success' },
    pending: { label: 'En attente', tone: 'warning' },
    cancelled: { label: 'Annulée', tone: 'neutral' },
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
  | { kind: 'sale'; status: SaleStatus }
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
      <p className="mt-2 text-lg font-extrabold tracking-tight text-ink tabular-nums sm:mt-3 sm:text-2xl">{value}</p>
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

export function Avatar({ name, initials, size = 'md' }: { name: string; initials: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-12 text-base' };
  return (
    <span
      title={name}
      className={`grid shrink-0 place-items-center rounded-full bg-linear-to-b from-navy-700 to-navy-900 font-bold text-gold-300 ring-2 ring-panel ${sizes[size]}`}
    >
      {initials}
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

/* ------------------------------------------------------------------ dialogs */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = 'center',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  variant?: 'center' | 'sheet';
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const frame =
    variant === 'sheet'
      ? 'mr-0 ml-auto h-dvh max-h-dvh w-full max-w-lg animate-sheet-in rounded-none sm:rounded-l-3xl'
      : 'm-auto max-h-[calc(100dvh-2rem)] w-[min(34rem,calc(100%-2rem))] animate-dialog-in rounded-3xl';

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      onClose={onClose}
      onClick={(event) => event.target === ref.current && onClose()}
      className={`${frame} flex-col overflow-hidden border border-line bg-panel p-0 text-ink shadow-2xl backdrop:bg-navy-950/60 backdrop:backdrop-blur-[2px] open:flex`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
        <div>
          <h2 id="modal-title" className="text-lg font-bold">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-ink-mute">{description}</p>}
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
      <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      {footer && (
        <div className="flex flex-wrap justify-end gap-2.5 border-t border-line bg-sunken/60 px-6 py-4">{footer}</div>
      )}
    </dialog>
  );
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
