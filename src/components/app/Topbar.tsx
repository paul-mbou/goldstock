import {
  Bell,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  ExternalLink,
  LogOut,
  Menu,
  Moon,
  Package,
  Search,
  Settings,
  ShoppingBag,
  Sun,
  TriangleAlert,
  User,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { business, formatAgo, formatFcfa, notices, products, sales, team, type Notice } from '../../data/dashboard';
import { applyTheme } from '../../lib/theme';
import { LogoMark } from '../brand/Logo';
import { AppNav } from './AppNav';
import { ShopCard } from './ShopCard';
import { Avatar, useDismiss } from './ui';

const iconButton =
  'relative grid size-10 place-items-center rounded-xl text-ink-soft transition hover:bg-sunken hover:text-ink aria-expanded:bg-sunken aria-expanded:text-ink';

export default function Topbar({ current }: { current: string }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[96rem] items-center gap-3 px-4 sm:px-6 lg:px-10">
        <button
          type="button"
          className={`${iconButton} -ml-2 lg:hidden`}
          onClick={() => setMenuOpen(true)}
          aria-label="Ouvrir le menu"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
        <a href="/app" className="lg:hidden" aria-label="GOLDSTOCK, tableau de bord">
          <LogoMark className="size-7" />
        </a>

        <GlobalSearch />

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          <span className="mr-1 hidden rounded-full bg-gold-100 px-2.5 py-1 text-xs font-bold text-gold-700 sm:inline dark:bg-gold-400/10 dark:text-gold-300">
            Démo
          </span>
          <ThemeToggle />
          <Notifications />
          <UserMenu />
        </div>
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} current={current} />
    </header>
  );
}

/* ------------------------------------------------------------------ search */

type Result = { id: string; group: string; title: string; meta: string; href: string; icon: typeof Package };

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

function searchEverything(query: string): Result[] {
  const q = normalize(query.trim());
  if (q.length < 2) return [];
  const matches = (...fields: string[]) => fields.some((field) => normalize(field).includes(q));
  return [
    ...products
      .filter((p) => matches(p.name, p.sku, p.category))
      .slice(0, 4)
      .map((p) => ({
        id: p.id,
        group: 'Produits',
        title: p.name,
        meta: `${p.sku} · ${p.stock} en stock`,
        href: `/app/produits?q=${encodeURIComponent(p.name)}`,
        icon: Package,
      })),
    ...sales
      .filter((s) => matches(s.id, s.customer))
      .slice(0, 4)
      .map((s) => ({
        id: s.id,
        group: 'Ventes',
        title: `${s.id} · ${s.customer}`,
        meta: formatFcfa(s.total),
        href: `/app/ventes?q=${encodeURIComponent(s.id)}`,
        icon: ShoppingBag,
      })),
    ...team
      .filter((m) => matches(m.name, m.role))
      .slice(0, 3)
      .map((m) => ({
        id: m.id,
        group: 'Équipe',
        title: m.name,
        meta: m.role,
        href: `/app/equipe?q=${encodeURIComponent(m.name)}`,
        icon: User,
      })),
  ];
}

function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapper = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const results = useMemo(() => searchEverything(query), [query]);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(wrapper, open, close);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === '/' && !target.closest('input, textarea, select, [contenteditable]')) {
        event.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const showList = open && query.trim().length >= 2;

  return (
    <div ref={wrapper} className="relative hidden w-full max-w-md md:block">
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 size-[1.125rem] -translate-y-1/2 text-ink-mute"
        aria-hidden="true"
      />
      <input
        ref={input}
        type="search"
        role="combobox"
        aria-label="Rechercher un produit, une vente ou un membre"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && results[active] ? `${listId}-${active}` : undefined}
        value={query}
        placeholder="Rechercher un produit, une vente, un membre…"
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActive((index) => Math.min(index + 1, results.length - 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
          } else if (event.key === 'Enter' && results[active]) {
            window.location.href = results[active].href;
          } else if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
        className="h-10 w-full rounded-xl border border-line bg-panel pr-10 pl-10 text-sm text-ink transition placeholder:text-ink-mute/80 hover:border-navy-200 focus:border-gold-500 focus:ring-4 focus:ring-gold-400/25 focus-visible:outline-none dark:hover:border-white/20"
      />
      {!query && (
        <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded-md border border-line px-1.5 text-xs font-semibold text-ink-mute">
          /
        </kbd>
      )}

      {showList && (
        <div
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-12 overflow-hidden rounded-2xl border border-line bg-panel p-2 shadow-2xl"
        >
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-ink-mute">Aucun résultat pour « {query.trim()} ».</p>
          ) : (
            results.map((result, index) => {
              const Icon = result.icon;
              const firstOfGroup = index === 0 || results[index - 1].group !== result.group;
              return (
                <div key={`${result.group}-${result.id}`}>
                  {firstOfGroup && (
                    <p className="px-3 pt-2 pb-1 text-[0.6875rem] font-bold tracking-[0.12em] text-ink-mute uppercase">
                      {result.group}
                    </p>
                  )}
                  <a
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={index === active}
                    href={result.href}
                    onMouseEnter={() => setActive(index)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${index === active ? 'bg-sunken' : ''}`}
                  >
                    <Icon className="size-4 shrink-0 text-ink-mute" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{result.title}</span>
                    <span className="shrink-0 text-xs text-ink-mute">{result.meta}</span>
                  </a>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ theme */

function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
    const onChange = (event: Event) => setDark((event as CustomEvent<boolean>).detail);
    window.addEventListener('gs-theme-change', onChange);
    return () => window.removeEventListener('gs-theme-change', onChange);
  }, []);

  return (
    <button
      type="button"
      className={iconButton}
      onClick={() => setDark(applyTheme(dark ? 'light' : 'dark'))}
      aria-label={dark ? 'Passer au thème clair' : 'Passer au thème sombre'}
    >
      {dark ? <Sun className="size-5" aria-hidden="true" /> : <Moon className="size-5" aria-hidden="true" />}
    </button>
  );
}

/* ------------------------------------------------------------------ notifications */

const noticeIcon: Record<Notice['tone'], { icon: typeof Bell; className: string }> = {
  danger: { icon: CircleAlert, className: 'bg-red-50 text-red-600 dark:bg-red-400/10 dark:text-red-300' },
  warning: { icon: TriangleAlert, className: 'bg-gold-50 text-gold-700 dark:bg-gold-400/10 dark:text-gold-300' },
  success: {
    icon: CircleCheck,
    className: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300',
  },
};

function Notifications() {
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);
  const unread = notices.filter((notice) => !read.includes(notice.id)).length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className={iconButton}
        aria-expanded={open}
        aria-label={unread ? `Notifications, ${unread} non lues` : 'Notifications'}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell className="size-5" aria-hidden="true" />
        {unread > 0 && <span className="absolute top-2 right-2 size-2 rounded-full bg-red-500 ring-2 ring-canvas" />}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-[4.25rem] w-auto animate-dialog-in overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl sm:absolute sm:inset-x-auto sm:top-12 sm:right-0 sm:w-96">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <p className="font-bold text-ink">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-sm font-semibold text-gold-700 transition hover:bg-sunken dark:text-gold-300"
                onClick={() => setRead(notices.map((notice) => notice.id))}
              >
                Tout marquer comme lu
              </button>
            )}
          </div>
          <ul className="divide-y divide-line">
            {notices.map((notice) => {
              const { icon: Icon, className } = noticeIcon[notice.tone];
              const isUnread = !read.includes(notice.id);
              return (
                <li key={notice.id}>
                  <a
                    href={notice.href}
                    onClick={() => setRead((list) => [...list, notice.id])}
                    className="flex gap-3 px-4 py-3.5 transition hover:bg-sunken"
                  >
                    <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${className}`}>
                      <Icon className="size-[1.125rem]" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-bold text-ink">
                        {notice.title}
                        {isUnread && (
                          <span className="size-1.5 shrink-0 rounded-full bg-gold-500" aria-label="non lue" />
                        )}
                      </span>
                      <span className="mt-0.5 block text-sm leading-snug text-ink-mute">{notice.body}</span>
                      <span className="mt-1 block text-xs text-ink-mute/80">{formatAgo(notice.at)}</span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ account */

function UserMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);
  const item =
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-soft transition hover:bg-sunken hover:text-ink';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label="Mon compte"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2.5 rounded-xl py-1 pr-2 pl-1 transition hover:bg-sunken aria-expanded:bg-sunken"
      >
        <Avatar name={business.owner.name} initials={business.owner.initials} size="sm" />
        <span className="hidden text-left leading-tight md:block">
          <span className="block text-sm font-bold text-ink">{business.owner.name}</span>
          <span className="block text-xs text-ink-mute">Propriétaire</span>
        </span>
        <ChevronDown className="hidden size-4 text-ink-mute md:block" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute top-12 right-0 w-64 animate-dialog-in rounded-2xl border border-line bg-panel p-2 shadow-2xl">
          <div className="border-b border-line px-3 pt-2 pb-3">
            <p className="font-bold text-ink">{business.owner.name}</p>
            <p className="text-sm text-ink-mute">{business.owner.phone}</p>
          </div>
          <div className="pt-2">
            <a href="/app/parametres" className={item}>
              <Settings className="size-4" aria-hidden="true" />
              Paramètres
            </a>
            <a href="/" className={item}>
              <ExternalLink className="size-4" aria-hidden="true" />
              Voir le site GOLDSTOCK
            </a>
            <a href="/connexion" className={`${item} text-red-600 hover:text-red-700 dark:text-red-400`}>
              <LogOut className="size-4" aria-hidden="true" />
              Se déconnecter
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ mobile navigation */

function MobileMenu({ open, onClose, current }: { open: boolean; onClose: () => void; current: string }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label="Menu"
      onClose={onClose}
      onClick={(event) => event.target === ref.current && onClose()}
      className="m-0 h-dvh max-h-dvh w-[min(20rem,calc(100%-3rem))] max-w-none animate-drawer-in bg-navy-950 p-0 text-white backdrop:bg-navy-950/60 backdrop:backdrop-blur-[2px] open:flex lg:hidden"
    >
      <div className="flex w-full flex-col overflow-y-auto px-4 pt-5 pb-6">
        <div className="flex items-center justify-between px-2">
          <a href="/app" className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight">
            <LogoMark />
            <span>
              <span className="text-gold-400">GOLD</span>STOCK
            </span>
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le menu"
            className="grid size-10 place-items-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-6">
          <ShopCard />
        </div>
        <div className="mt-6">
          <AppNav current={current} />
        </div>
      </div>
    </dialog>
  );
}
