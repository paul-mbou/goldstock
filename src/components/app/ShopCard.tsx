import { initials } from '../../data/dashboard';
import { useSession } from '../../lib/demo';
import { plans } from '../../data/site';

export function ShopCard() {
  const { demo } = useSession();
  const plan = plans.find((item) => item.id === demo.plan.id);
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/[0.08] ring-inset">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-linear-to-b from-gold-300 to-gold-500 text-sm font-extrabold text-navy-950">
        {initials(demo.settings.shopName.replace(/^Boutique\s+/i, ''))}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-white">{demo.settings.shopName}</span>
        <span className="block truncate text-xs text-white/55">
          {demo.settings.city} · Formule {plan?.name}
        </span>
      </span>
    </div>
  );
}
