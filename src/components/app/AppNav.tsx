import { HandCoins, LayoutDashboard, Package, Settings, ShoppingBag, Users, type LucideIcon } from 'lucide-react';
import { appNav, type NavIcon } from '../../data/dashboard';

const icons: Record<NavIcon, LucideIcon> = {
  overview: LayoutDashboard,
  sales: ShoppingBag,
  products: Package,
  deposits: HandCoins,
  team: Users,
  settings: Settings,
};

export const isCurrent = (href: string, current: string) =>
  href === '/app' ? current === '/app' : current.startsWith(href);

export function AppNav({ current }: { current: string }) {
  return (
    <nav aria-label="Navigation du tableau de bord">
      <ul className="space-y-1">
        {appNav.map(({ label, href, icon, badge }) => {
          const Icon = icons[icon];
          const active = isCurrent(href, current);
          return (
            <li key={href}>
              <a
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`group flex h-11 items-center gap-3 rounded-xl px-3.5 text-[0.9375rem] font-semibold transition ${
                  active
                    ? 'bg-linear-to-b from-gold-300 to-gold-500 text-navy-950 shadow-[0_8px_20px_-10px_rgb(232_157_18/0.8)]'
                    : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <Icon className="size-5 shrink-0" strokeWidth={active ? 2.25 : 2} aria-hidden="true" />
                <span className="flex-1">{label}</span>
                {badge ? (
                  <span
                    className={`grid min-w-6 place-items-center rounded-full px-1.5 text-xs font-bold tabular-nums ${
                      active ? 'bg-navy-950/15 text-navy-950' : 'bg-gold-400/15 text-gold-300'
                    }`}
                  >
                    {badge}
                    <span className="sr-only"> à traiter</span>
                  </span>
                ) : null}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
