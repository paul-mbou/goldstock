import {
  BanknoteArrowDown,
  Bell,
  ChartColumn,
  CreditCard,
  HandCoins,
  LayoutDashboard,
  LifeBuoy,
  Package,
  ReceiptText,
  Settings,
  ShoppingCart,
  Tags,
  Truck,
  Users,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import { navGroups, type ScreenId } from '../../data/dashboard';
import { stockAlerts, useSession } from '../../lib/demo';
import { useSidebarCollapsed } from '../../lib/sidebar';

export const screenIcons: Record<ScreenId, LucideIcon> = {
  dash: LayoutDashboard,
  pos: ShoppingCart,
  sales: ReceiptText,
  products: Package,
  categories: Tags,
  stock: Warehouse,
  suppliers: Truck,
  reports: ChartColumn,
  deposits: HandCoins,
  expenses: BanknoteArrowDown,
  team: Users,
  subscription: CreditCard,
  settings: Settings,
  support: LifeBuoy,
  notifications: Bell,
};

export const isCurrent = (href: string, current: string) =>
  href === '/app' ? current === '/app' : current === href || current.startsWith(`${href}/`);

/** Counts shown next to menu items; only what needs action. */
export function useNavBadges(): Partial<Record<ScreenId, number>> {
  const { demo } = useSession();
  return {
    stock: stockAlerts(demo).length,
    deposits: demo.deposits.filter((deposit) => deposit.status === 'pending').length,
  };
}

/** `collapsible`: follows the desktop sidebar when it is folded to an icon rail. */
export function AppNav({
  current,
  onNavigate,
  collapsible = false,
}: {
  current: string;
  onNavigate?: () => void;
  collapsible?: boolean;
}) {
  const { can } = useSession();
  const badges = useNavBadges();
  const collapsed = useSidebarCollapsed() && collapsible;
  const rail = (classes: string) => (collapsible ? classes : '');

  return (
    <nav aria-label="Navigation de l’espace commerçant" className="space-y-5">
      {navGroups.map((group, index) => {
        const items = group.items.filter((item) => can(item.id));
        if (!items.length) return null;
        return (
          <div key={group.title}>
            <p
              className={`mb-1.5 px-3 text-[0.6875rem] font-bold tracking-[0.14em] whitespace-nowrap text-white/40 uppercase ${rail('rail:sr-only')}`}
            >
              {group.title}
            </p>
            {index > 0 && (
              <span aria-hidden="true" className={`mx-auto mb-3 hidden h-px w-8 bg-white/10 ${rail('rail:block')}`} />
            )}
            <ul className="space-y-0.5">
              {items.map(({ id, label, href }) => {
                const Icon = screenIcons[id];
                const active = isCurrent(href, current);
                const badge = badges[id];
                return (
                  <li key={id}>
                    <a
                      href={href}
                      onClick={onNavigate}
                      data-tour={`nav-${id}`}
                      aria-current={active ? 'page' : undefined}
                      title={collapsed ? (badge ? `${label} · ${badge} à traiter` : label) : undefined}
                      className={`relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${rail(
                        'rail:justify-center rail:px-0',
                      )} ${
                        active
                          ? 'bg-linear-to-b from-gold-300 to-gold-500 text-navy-950 shadow-[0_8px_20px_-10px_rgb(232_157_18/0.8)]'
                          : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <Icon className="size-[1.125rem] shrink-0" strokeWidth={active ? 2.25 : 2} aria-hidden="true" />
                      <span className={`flex-1 truncate whitespace-nowrap ${rail('rail:sr-only')}`}>{label}</span>
                      {badge ? (
                        <>
                          <span
                            className={`grid min-w-6 place-items-center rounded-full px-1.5 text-xs font-bold tabular-nums ${rail(
                              'rail:sr-only',
                            )} ${active ? 'bg-navy-950/15 text-navy-950' : 'bg-gold-400/15 text-gold-300'}`}
                          >
                            {badge}
                            <span className="sr-only"> à traiter</span>
                          </span>
                          <span
                            aria-hidden="true"
                            className={`absolute top-2 right-3.5 hidden size-2 rounded-full ring-2 ${rail('rail:block')} ${
                              active ? 'bg-navy-950 ring-gold-400' : 'bg-gold-400 ring-navy-950'
                            }`}
                          />
                        </>
                      ) : null}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
