import { Banknote, Download, Percent, Receipt, ShoppingBasket } from 'lucide-react';
import { useState } from 'react';
import {
  formatFcfa,
  formatNumber,
  formatShortDate,
  formatTime,
  payLabel,
  percentChange,
  saleNet,
  saleState,
} from '../../data/dashboard';
import {
  PERIODS,
  between,
  chartPoints,
  flatItems,
  marginRate,
  periodRange,
  summarize,
  useSession,
  visibleSales,
  type Period,
} from '../../lib/demo';
import { PaymentMix } from './insights';
import { SalesChart } from './SalesChart';
import { Screen } from './Screen';
import { BarList, Card, CategoryLabel, Delta, PageHeader, Segmented, StatCard, statusLabel, toneStyles } from './ui';

export default function ReportsPage() {
  return (
    <Screen id="reports">
      <Reports />
    </Screen>
  );
}

const csvCell = (value: string | number) => {
  const text = String(value);
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

function Reports() {
  const session = useSession();
  const { demo, role } = session;
  const [period, setPeriod] = useState<Period>('30d');
  const meta = PERIODS.find((item) => item.id === period)!;
  const sales = visibleSales(session);
  const range = periodRange(period);
  const inPeriod = between(sales, range.from, range.to);
  const current = summarize(inPeriod);
  const previous = summarize(between(sales, range.previousFrom, range.previousTo));
  const basket = current.count ? current.revenue / current.count : 0;
  const previousBasket = previous.count ? previous.revenue / previous.count : 0;
  const category = (id: string) => demo.categories.find((item) => item.id === id);

  const byCategory = Object.entries(current.byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([id, value]) => ({
      id,
      label: category(id)?.name ?? id,
      value,
      color: toneStyles[category(id)?.tone ?? 'navy'].hex,
      meta: current.revenue ? `${Math.round((value / current.revenue) * 100)} %` : undefined,
    }));

  const bySeller = Object.entries(current.bySeller)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .map(([name, entry]) => ({
      id: name,
      label: name,
      value: entry.revenue,
      color: toneStyles.gold.hex,
      meta: `${entry.count} ventes`,
    }));

  const topProducts = Object.entries(current.byProduct)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 8);

  const stockByCategory = demo.categories
    .map((item) => ({
      id: item.id,
      label: item.name,
      value: flatItems(demo)
        .filter((entry) => entry.product.cat === item.id)
        .reduce((sum, entry) => sum + entry.variant.stock * entry.variant.cost, 0),
      color: toneStyles[item.tone].hex,
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);

  const exportCsv = () => {
    const header = [
      'Vente',
      'Date',
      'Heure',
      'Boutique',
      'Vendeur',
      'Client',
      'Articles',
      'Paiement',
      'Montant',
      'Statut',
    ];
    const rows = inPeriod.map((sale) => [
      sale.id,
      formatShortDate(sale.at),
      formatTime(sale.at),
      sale.shop,
      sale.seller,
      sale.customer,
      sale.lines.reduce((sum, line) => sum + line.qty - line.returned, 0),
      payLabel(sale.pay),
      saleNet(sale),
      statusLabel('sale', saleState(sale)),
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `goldstock-ventes-${period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rapports"
        description={role.allSales ? 'Les chiffres de toutes vos boutiques.' : 'Le bilan de vos ventes.'}
        actions={
          <>
            <Segmented label="Période" options={PERIODS} value={period} onChange={setPeriod} />
            <button type="button" className="btn-quiet h-11 px-4" onClick={exportCsv}>
              <Download className="size-[1.125rem]" aria-hidden="true" />
              Exporter
            </button>
          </>
        }
      />

      <section aria-label="Indicateurs clés" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Chiffre d’affaires" value={formatFcfa(current.revenue)} icon={Banknote} tone="gold">
          {previous.count > 0 && (
            <Delta value={percentChange(current.revenue, previous.revenue)} suffix={meta.compare} />
          )}
        </StatCard>
        <StatCard label="Ventes" value={formatNumber(current.count)} icon={Receipt}>
          <p className="text-sm text-ink-mute">{formatNumber(current.items)} articles vendus</p>
        </StatCard>
        <StatCard label="Panier moyen" value={formatFcfa(basket)} icon={ShoppingBasket}>
          {previous.count > 0 && <Delta value={percentChange(basket, previousBasket)} suffix={meta.compare} />}
        </StatCard>
        {role.margins ? (
          <StatCard label="Marge brute" value={formatFcfa(current.margin)} icon={Percent}>
            <p className="text-sm text-ink-mute">
              Taux de marge {current.revenue ? Math.round((current.margin / current.revenue) * 100) : 0}&nbsp;%
            </p>
          </StatCard>
        ) : (
          <StatCard
            label="Articles par vente"
            value={current.count ? (current.items / current.count).toFixed(1).replace('.', ',') : '0'}
            icon={Percent}
          />
        )}
      </section>

      <Card
        title="Évolution du chiffre d’affaires"
        description={period === 'today' ? 'Heure par heure' : `Jour par jour, ${meta.label}`}
      >
        <SalesChart points={chartPoints(period, sales)} compareLabel={meta.compare} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Ventes par catégorie">
          {byCategory.length ? (
            <BarList rows={byCategory} format={formatFcfa} />
          ) : (
            <p className="py-6 text-center text-sm text-ink-mute">Aucune vente sur la période.</p>
          )}
        </Card>
        {role.allSales ? (
          <Card title="Ventes par vendeur">
            {bySeller.length ? (
              <BarList rows={bySeller} format={formatFcfa} />
            ) : (
              <p className="py-6 text-center text-sm text-ink-mute">Aucune vente sur la période.</p>
            )}
          </Card>
        ) : (
          <PaymentMix totals={current} />
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Produits les plus vendus" className="overflow-hidden xl:col-span-2" bodyClassName="">
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="bg-sunken/60 text-left text-xs text-ink-mute">
                <tr>
                  <th scope="col" className="py-3 pr-3 pl-5 font-semibold sm:pl-6">
                    Produit
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">
                    Quantité
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">
                    Chiffre d’affaires
                  </th>
                  {role.margins && (
                    <th scope="col" className="py-3 pr-5 pl-3 text-right font-semibold sm:pr-6">
                      Marge
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {topProducts.map(([id, entry]) => (
                  <tr key={id}>
                    <td className="py-3 pr-3 pl-5 sm:pl-6">
                      <p className="font-semibold text-ink">{entry.name}</p>
                      <CategoryLabel category={category(entry.cat)} />
                    </td>
                    <td className="px-3 py-3 text-right text-ink-soft tabular-nums">{formatNumber(entry.qty)}</td>
                    <td className="px-3 py-3 text-right font-semibold whitespace-nowrap text-ink tabular-nums">
                      {formatFcfa(entry.revenue)}
                    </td>
                    {role.margins && (
                      <td className="py-3 pr-5 pl-3 text-right text-ink-soft tabular-nums sm:pr-6">
                        {marginRate(entry.revenue, entry.cost)}&nbsp;%
                      </td>
                    )}
                  </tr>
                ))}
                {!topProducts.length && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-ink-mute">
                      Aucune vente sur la période.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="space-y-6">
          {role.allSales && <PaymentMix totals={current} />}
          {role.costs && (
            <Card title="Valeur du stock" description="Au prix d’achat, par catégorie">
              <BarList rows={stockByCategory} format={formatFcfa} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
