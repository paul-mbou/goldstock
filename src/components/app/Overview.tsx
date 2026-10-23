import { ArrowRight, Banknote, PackageX, Plus, Receipt, ShoppingBasket, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  NOW,
  business,
  deposits,
  formatFcfa,
  formatFullDate,
  formatWhen,
  percentChange,
  periodData,
  periods,
  sales,
  stockAlerts,
  stockStatus,
  type Period,
} from '../../data/dashboard';
import { SalesChart } from './SalesChart';
import { Badge, Delta, PageHeader, Segmented, StatCard, StatusBadge } from './ui';

export default function Overview() {
  const [period, setPeriod] = useState<Period>('today');
  const data = useMemo(() => periodData(period), [period]);
  const meta = periods.find((item) => item.id === period)!;
  const { current, previous } = data;
  const basket = current.sales ? Math.round(current.revenue / current.sales) : 0;
  const previousBasket = previous.sales ? Math.round(previous.revenue / previous.sales) : 0;
  const compare = meta.short;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Bonjour, ${business.owner.firstName}`}
        description={`${formatFullDate(NOW)} · voici l’activité de ${business.name}.`}
        actions={
          <>
            <Segmented label="Période" options={periods} value={period} onChange={setPeriod} />
            <a href="/app/ventes?nouvelle=1" className="btn-gold h-11 px-4">
              <Plus className="size-[1.125rem]" strokeWidth={2.5} aria-hidden="true" />
              Nouvelle vente
            </a>
          </>
        }
      />

      <section aria-label="Indicateurs clés" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Chiffre d’affaires" value={formatFcfa(current.revenue)} icon={Banknote} tone="gold">
          <Delta value={percentChange(current.revenue, previous.revenue)} suffix={compare} />
        </StatCard>
        <StatCard label="Bénéfice brut" value={formatFcfa(current.profit)} icon={TrendingUp}>
          <Delta value={percentChange(current.profit, previous.profit)} suffix={compare} />
          <p className="mt-1.5 text-sm text-ink-mute">
            Marge de {Math.round((current.profit / current.revenue) * 100)}&nbsp;%
          </p>
        </StatCard>
        <StatCard label="Ventes" value={current.sales.toLocaleString('fr-FR')} icon={Receipt}>
          <Delta value={percentChange(current.sales, previous.sales)} suffix={compare} />
        </StatCard>
        <StatCard label="Panier moyen" value={formatFcfa(basket)} icon={ShoppingBasket}>
          <Delta value={percentChange(basket, previousBasket)} suffix={compare} />
        </StatCard>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <section aria-labelledby="chart-title" className="app-card p-5 sm:p-6 xl:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="chart-title" className="font-bold text-ink">
                Évolution du chiffre d’affaires
              </h2>
              <p className="mt-0.5 text-sm text-ink-mute">
                {period === 'today'
                  ? 'Heure par heure depuis l’ouverture'
                  : `Jour par jour, ${meta.label.toLowerCase()}`}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold text-ink-mute">
              <span className="flex items-center gap-2">
                <span className="h-0.5 w-5 rounded-full bg-gold-500" />
                {meta.label}
              </span>
              <span className="flex items-center gap-2">
                <span className="w-5 border-t-2 border-dashed border-navy-300 dark:border-navy-500" />
                Période précédente
              </span>
            </div>
          </div>
          <div className="mt-6">
            <SalesChart points={data.points} compareLabel={meta.compare} />
          </div>
        </section>

        <DepositsCheck />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <RecentSales />
        <StockAlerts />
      </div>
    </div>
  );
}

/* The signature card: where every franc of yesterday's cash ended up. */
function DepositsCheck() {
  const latest = deposits.filter((deposit) => deposit.day === deposits[0].day);
  const expected = latest.reduce((sum, deposit) => sum + deposit.expected, 0);
  const deposited = latest.reduce((sum, deposit) => sum + deposit.deposited, 0);
  const ratio = Math.min(100, Math.round((deposited / expected) * 1000) / 10);
  const gap = deposited - expected;

  return (
    <section
      aria-labelledby="deposits-check-title"
      className="relative flex flex-col overflow-hidden rounded-2xl bg-navy-950 p-5 text-white ring-1 ring-white/10 sm:p-6 dark:bg-linear-to-br dark:from-navy-800 dark:to-navy-950 dark:ring-gold-400/20"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-[radial-gradient(circle,rgb(244_181_44/0.22),transparent_65%)]"
      />
      <p className="relative text-xs font-bold tracking-[0.14em] text-gold-300 uppercase">Chaque franc compte</p>
      <h2 id="deposits-check-title" className="relative mt-1.5 text-lg font-bold">
        Versements d’hier
      </h2>

      <div className="relative mt-5">
        <p className="text-sm text-white/60">Versé par les gérants</p>
        <p className="mt-1 text-2xl font-extrabold tracking-tight tabular-nums">
          {formatFcfa(deposited)}
          <span className="ml-1.5 text-sm font-semibold text-white/50">/ {formatFcfa(expected)}</span>
        </p>
        <div
          role="meter"
          aria-label="Part des ventes en espèces versée"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={ratio}
          aria-valuetext={`${ratio.toLocaleString('fr-FR')} %`}
          className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10"
        >
          <div
            className="h-full rounded-full bg-linear-to-r from-gold-300 to-gold-500"
            style={{ width: `${ratio}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-white/60">
          {ratio.toLocaleString('fr-FR')}&nbsp;% des ventes en espèces
          {gap < 0 && (
            <>
              {' '}
              · <span className="font-semibold text-red-300">manque {formatFcfa(-gap)}</span>
            </>
          )}
        </p>
      </div>

      <ul className="relative mt-5 space-y-2.5">
        {latest.map((deposit) => {
          const diff = deposit.deposited - deposit.expected;
          return (
            <li
              key={deposit.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.05] px-3.5 py-3 ring-1 ring-white/[0.06] ring-inset"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{deposit.shop}</p>
                <p className="truncate text-xs text-white/55">{deposit.manager}</p>
              </div>
              {diff === 0 ? (
                <span className="rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/20 ring-inset">
                  Conforme
                </span>
              ) : (
                <span className="rounded-full bg-red-400/10 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-red-300 ring-1 ring-red-400/20 ring-inset tabular-nums">
                  Écart {diff > 0 ? '+' : '−'}
                  {formatFcfa(Math.abs(diff))}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="relative mt-auto pt-6">
        <a href="/app/versements" className="btn-gold h-11 w-full">
          Vérifier les versements
          <ArrowRight className="size-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

function RecentSales() {
  const recent = sales.slice(0, 6);
  return (
    <section aria-labelledby="recent-sales-title" className="app-card overflow-hidden xl:col-span-2">
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4 sm:px-6">
        <h2 id="recent-sales-title" className="font-bold text-ink">
          Dernières ventes
        </h2>
        <a
          href="/app/ventes"
          className="inline-flex items-center gap-1 text-sm font-semibold text-gold-700 hover:underline dark:text-gold-300"
        >
          Toutes les ventes
          <ArrowRight className="size-4" aria-hidden="true" />
        </a>
      </div>

      <table className="w-full text-sm">
        <thead className="hidden border-y border-line bg-sunken/60 text-left text-xs font-semibold text-ink-mute sm:table-header-group">
          <tr>
            <th scope="col" className="py-2.5 pr-3 pl-6 font-semibold">
              Vente
            </th>
            <th scope="col" className="px-3 py-2.5 font-semibold">
              Client
            </th>
            <th scope="col" className="hidden px-3 py-2.5 font-semibold md:table-cell">
              Paiement
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">
              Montant
            </th>
            <th scope="col" className="py-2.5 pr-6 pl-3 font-semibold">
              Statut
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line border-t border-line sm:border-t-0">
          {recent.map((sale) => (
            <tr
              key={sale.id}
              className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 px-5 py-3.5 transition hover:bg-sunken/60 sm:table-row sm:p-0"
            >
              <td className="sm:py-3.5 sm:pr-3 sm:pl-6">
                <a href={`/app/ventes?q=${sale.id}`} className="font-semibold text-ink hover:underline">
                  {sale.id}
                </a>
                <span className="block text-xs text-ink-mute">{formatWhen(sale.date)}</span>
              </td>
              <td className="order-3 text-ink-soft sm:order-none sm:px-3 sm:py-3.5">{sale.customer}</td>
              <td className="hidden text-ink-soft md:table-cell md:px-3 md:py-3.5">{sale.method}</td>
              <td className="text-right font-bold text-ink tabular-nums sm:px-3 sm:py-3.5">{formatFcfa(sale.total)}</td>
              <td className="order-4 text-right sm:order-none sm:py-3.5 sm:pr-6 sm:pl-3 sm:text-left">
                <StatusBadge kind="sale" status={sale.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function StockAlerts() {
  return (
    <section aria-labelledby="stock-alerts-title" className="app-card flex flex-col p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="stock-alerts-title" className="font-bold text-ink">
          Alertes de stock
        </h2>
        <Badge tone="danger">{stockAlerts.length} produits</Badge>
      </div>
      <p className="mt-0.5 text-sm text-ink-mute">À réapprovisionner en priorité.</p>

      <ul className="mt-4 space-y-3">
        {stockAlerts.slice(0, 5).map((product) => {
          const out = stockStatus(product) === 'out';
          return (
            <li key={product.id} className="flex items-center gap-3">
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                  out
                    ? 'bg-red-50 text-red-600 dark:bg-red-400/10 dark:text-red-300'
                    : 'bg-gold-50 text-gold-700 dark:bg-gold-400/10 dark:text-gold-300'
                }`}
              >
                <PackageX className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{product.name}</p>
                <p className="text-xs text-ink-mute">
                  {out ? 'Plus aucun article' : `${product.stock} restants`} · seuil {product.minStock}
                </p>
              </div>
              <StatusBadge kind="stock" status={stockStatus(product)} />
            </li>
          );
        })}
      </ul>

      <div className="mt-auto pt-6">
        <a href="/app/produits?filtre=alerte" className="btn-quiet h-11 w-full">
          Gérer le stock
          <ArrowRight className="size-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
