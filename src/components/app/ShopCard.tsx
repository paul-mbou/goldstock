import { initials } from '../../data/dashboard';
import { plans } from '../../data/site';
import { useSession } from '../../lib/demo';
import { useSidebarCollapsed } from '../../lib/sidebar';

/** The shop's logo, or its initials on the gold tile until one is uploaded. */
export function ShopLogo({ className = 'size-10 rounded-xl text-sm' }: { className?: string }) {
  const { demo } = useSession();
  const { logoUrl, shopName } = demo.settings;
  if (logoUrl)
    return (
      <img
        src={logoUrl}
        alt=""
        className={`shrink-0 bg-white object-contain p-1 ring-1 ring-black/5 ring-inset ${className}`}
      />
    );
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center bg-linear-to-b from-gold-300 to-gold-500 font-extrabold text-navy-950 ${className}`}
    >
      {initials(shopName.replace(/^Boutique\s+/i, ''))}
    </span>
  );
}

/** `collapsible`: shrinks to the shop badge when the desktop sidebar is folded. */
export function ShopCard({ collapsible = false }: { collapsible?: boolean }) {
  const { demo, business } = useSession();
  const collapsed = useSidebarCollapsed() && collapsible;
  const plan = plans.find((item) => item.id === demo.plan.id);
  const subtitle = `${business.label} · ${demo.plan.trial ? 'Essai gratuit' : `Formule ${plan?.name}`}`;
  return (
    <div
      title={collapsed ? `${demo.settings.shopName} · ${subtitle}` : undefined}
      className={`flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/[0.08] ring-inset ${
        collapsible ? 'rail:justify-center rail:bg-transparent rail:p-0 rail:ring-0' : ''
      }`}
    >
      <ShopLogo />
      <span className={`min-w-0 ${collapsible ? 'rail:sr-only' : ''}`}>
        <span className="block truncate text-sm font-bold whitespace-nowrap text-white">{demo.settings.shopName}</span>
        <span className="block truncate text-xs whitespace-nowrap text-white/55">{subtitle}</span>
      </span>
    </div>
  );
}
