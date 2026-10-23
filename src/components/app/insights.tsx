import { ArrowRight, PackageCheck, Truck } from 'lucide-react';
import { PAYMENTS, formatFcfa, formatNumber, formatPercent, type PayId } from '../../data/dashboard';
import { stockAlerts, useSession, type Totals } from '../../lib/demo';
import { Card, CategoryTile, Donut, EmptyState, StatusBadge, linkClass } from './ui';

export function PaymentMix({ totals, className = '' }: { totals: Totals; className?: string }) {
  const rows = PAYMENTS.map((pay) => ({ ...pay, value: totals.byPay[pay.id as PayId] ?? 0 })).filter(
    (row) => row.value > 0,
  );
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return (
    <Card title="Moyens de paiement" description="Répartition des encaissements" className={className}>
      {total === 0 ? (
        <p className="py-6 text-center text-sm text-ink-mute">Aucun encaissement sur la période.</p>
      ) : (
        <div className="flex flex-col items-center gap-5 sm:flex-row xl:flex-col 2xl:flex-row">
          <Donut
            caption="Répartition des encaissements par moyen de paiement"
            segments={rows.map((row) => ({ id: row.id, value: row.value, color: row.color }))}
            center={
              <span>
                <span className="block text-xl font-extrabold text-ink tabular-nums">{formatNumber(totals.count)}</span>
                <span className="block text-xs text-ink-mute">ventes</span>
              </span>
            }
          />
          <ul className="w-full flex-1 space-y-2.5">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center gap-2.5 text-sm">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: row.color }} aria-hidden="true" />
                <span className="flex-1 text-ink-soft">{row.short}</span>
                <span className="text-ink-mute tabular-nums">
                  {formatPercent(Math.round((row.value / total) * 100))}
                </span>
                <span className="w-28 text-right font-semibold text-ink tabular-nums">{formatFcfa(row.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

export function StockAlertsCard({ limit = 5, className = '' }: { limit?: number; className?: string }) {
  const { demo, can } = useSession();
  const alerts = stockAlerts(demo);
  const href = can('stock') ? '/app/stock?filtre=alerte' : '/app/produits?stock=alerte';

  return (
    <Card
      title="Alertes de stock"
      description={alerts.length ? `${alerts.length} articles à réapprovisionner` : undefined}
      className={className}
      bodyClassName="px-2 pb-3 sm:px-3"
      action={
        alerts.length > 0 && (
          <a href={href} className={linkClass}>
            Tout voir
            <ArrowRight className="size-4" aria-hidden="true" />
          </a>
        )
      }
    >
      {alerts.length === 0 ? (
        <EmptyState icon={PackageCheck} title="Stock au complet">
          Aucun article sous son seuil d’alerte.
        </EmptyState>
      ) : (
        <ul>
          {alerts.slice(0, limit).map(({ key, product, variant, category }) => (
            <li key={key} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
              <CategoryTile category={category} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{product.name}</p>
                <p className="truncate text-xs text-ink-mute">
                  {variant.label ? `${variant.label} · ` : ''}seuil {product.min}
                </p>
              </div>
              {variant.stock <= 0 ? (
                <StatusBadge kind="stock" status="out" />
              ) : (
                <span className="text-sm font-bold text-gold-700 tabular-nums dark:text-gold-300">
                  {variant.stock} restant{variant.stock > 1 ? 's' : ''}
                </span>
              )}
              {can('suppliers') && (
                <a
                  href={`/app/fournisseurs?onglet=reception&article=${variant.id}`}
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-mute transition hover:bg-sunken hover:text-ink"
                  aria-label={`Réapprovisionner ${product.name}`}
                  title="Réapprovisionner"
                >
                  <Truck className="size-4" aria-hidden="true" />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
