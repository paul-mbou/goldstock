import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
import { Logo } from './brand/Logo';
import type { NavLink } from '../data/site';

type HeaderProps = {
  nav: NavLink[];
  resources: (NavLink & { description: string })[];
  loginUrl: string;
  signupUrl: string;
};

function useDismiss(open: boolean, onClose: () => void, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    const onPointer = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open, onClose, ref]);
}

function ResourcesMenu({ items }: { items: HeaderProps['resources'] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();
  useDismiss(open, () => setOpen(false), ref);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-white/85 transition hover:text-white"
      >
        Ressources
        <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      <div
        id={menuId}
        hidden={!open}
        className="absolute top-full left-1/2 mt-3 w-80 -translate-x-1/2 rounded-2xl border border-navy-100 bg-white p-2 shadow-2xl"
      >
        <ul>
          {items.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                onClick={() => setOpen(false)}
                {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="block rounded-xl px-4 py-3 transition hover:bg-navy-50"
              >
                <span className="block text-sm font-semibold text-navy-900">{item.label}</span>
                <span className="block text-sm text-navy-500">{item.description}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function Header({ nav, resources, loginUrl, signupUrl }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileRef = useRef<HTMLDivElement>(null);
  const mobileId = useId();
  useDismiss(mobileOpen, () => setMobileOpen(false), mobileRef);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 80rem)');
    const close = () => desktop.matches && setMobileOpen(false);
    desktop.addEventListener('change', close);
    return () => desktop.removeEventListener('change', close);
  }, []);

  return (
    <header
      ref={mobileRef}
      className={`sticky top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-300 ${
        scrolled || mobileOpen
          ? 'bg-navy-950/85 shadow-[0_1px_0_rgb(255_255_255/0.08)] backdrop-blur-xl'
          : 'bg-navy-950'
      }`}
    >
      <div className="container-page flex h-[4.5rem] items-center justify-between gap-6">
        <a href="/" aria-label="GOLDSTOCK, accueil" className="shrink-0 rounded-lg">
          <Logo />
        </a>

        <nav aria-label="Navigation principale" className="hidden xl:block">
          <ul className="flex items-center gap-1">
            {nav.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-white/85 transition hover:text-white"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <ResourcesMenu items={resources} />
            </li>
          </ul>
        </nav>

        <div className="hidden items-center gap-3 xl:flex">
          <a
            href={loginUrl}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white/85 transition hover:text-white"
          >
            Connexion
          </a>
          <a href={signupUrl} className="btn-gold px-5 py-2.5 text-sm">
            Essai gratuit 7 jours
          </a>
        </div>

        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-xl text-white transition hover:bg-white/10 xl:hidden"
          aria-expanded={mobileOpen}
          aria-controls={mobileId}
          aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          onClick={() => setMobileOpen((value) => !value)}
        >
          {mobileOpen ? <X className="size-6" aria-hidden="true" /> : <Menu className="size-6" aria-hidden="true" />}
        </button>
      </div>

      <div id={mobileId} hidden={!mobileOpen} className="border-t border-white/10 xl:hidden">
        <nav aria-label="Navigation mobile" className="container-page py-4">
          <ul className="space-y-1">
            {[...nav, ...resources].map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="block rounded-xl px-3 py-3 text-base font-medium text-white/90 transition hover:bg-white/5"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
            <a href={loginUrl} className="btn-ghost-dark">
              Connexion
            </a>
            <a href={signupUrl} className="btn-gold">
              Essai gratuit 7 jours
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}
