import { business } from '../../data/dashboard';

export function ShopCard() {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/[0.08] ring-inset">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-linear-to-b from-gold-300 to-gold-500 text-sm font-extrabold text-navy-950">
        {business.initials}
      </span>
      <div className="min-w-0">
        <p className="truncate font-bold text-white">{business.name}</p>
        <p className="truncate text-xs text-white/55">
          Formule {business.plan.name} · {business.shops.length} boutiques
        </p>
      </div>
    </div>
  );
}
