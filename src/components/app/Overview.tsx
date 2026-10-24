import {
  ArrowLeftRight,
  ArrowRight,
  Banknote,
  Boxes,
  Circle,
  CircleCheck,
  ClipboardList,
  Compass,
  PackageX,
  Percent,
  Receipt,
  ShoppingBasket,
  Wallet,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  MOVE_LABELS,
  NOW,
  formatAgo,
  formatFcfa,
  formatFullDate,
  formatNumber,
  formatWhen,
  payLabel,
  PAYMENTS,
  percentChange,
  saleNet,
  saleState,
} from '../../data/dashboard';
import {
  PERIODS,
  between,
  chartPoints,
  flatItems,
  periodRange,
  stockAlerts,
  summarize,
  useSession,
  visibleSales,
  type Period,
} from '../../lib/demo';
import { startTour } from '../../lib/tour';
import { PaymentMix, StockAlertsCard } from './insights';
import { SalesChart } from './SalesChart';
import { Screen } from './Screen';
import { Card, Delta, EmptyState, PageHeader, Segmented, StatCard, StatusBadge, linkClass } from './ui';

/** "Bonjour, Awa", or just "Bonjour" for a role preview or an owner whose name is unknown. */
const greeting = (name: string, roleLabel: string) =>
  name === roleLabel ? 'Bonjour' : `Bonjour, ${name.split(' ')[0]}`;

export default function Overview() {
  return (
    <Screen id="dash">
      <Dashboard />
    </Screen>
  );
}

function Dashboard() {
  const session = useSession();
  const { role, member, can, demo } = session;
  const [period, setPeriod] = useState<Period>('today');

  if (!role.revenue) return <StockDashboard />;

  const meta = PERIODS.find((item) => item.id === period)!;
  const sales = visibleSales(session);
  const range = periodRange(period);
  const current = summarize(between(sales, range.from, range.to));
  const previous = summarize(between(sales, range.previousFrom, range.previousTo));
  const basket = current.count ? current.revenue / current.count : 0;
  const previousBasket = previous.count ? previous.revenue / previous.count : 0;
  const compare = previous.count > 0;
  const alerts = stockAlerts(demo);
  const outCount = alerts.filter((item) => item.variant.stock <= 0).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={greeting(member.name, role.label)}
        description={`${formatFullDate(NOW)} · ${
          role.allSales ? `voici l’activité de ${demo.settings.shopName}.` : 'voici vos ventes.'
        }`}
        actions={<Segmented label="Période" options={PERIODS} value={period} onChange={setPeriod} />}
      />

      <GettingStarted />

      <section aria-label="Indicateurs clés" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Chiffre d’affaires" value={formatFcfa(current.revenue)} icon={Banknote} tone="gold">
          {compare && <Delta value={percentChange(current.revenue, previous.revenue)} suffix={meta.compare} />}
        </StatCard>
        <StatCard label="Ventes" value={formatNumber(current.count)} icon={Receipt}>
          {compare && <Delta value={percentChange(current.count, previous.count)} suffix={meta.compare} />}
          {role.margins && <p className="mt-1.5 text-sm text-ink-mute">Panier moyen {formatFcfa(basket)}</p>}
        </StatCard>
        {role.margins ? (
          <StatCard label="Marge brute" value={formatFcfa(current.margin)} icon={Percent}>
            {compare && <Delta value={percentChange(current.margin, previous.margin)} suffix={meta.compare} />}
            <p className="mt-1.5 text-sm text-ink-mute">
              Taux de marge {current.revenue ? Math.round((current.margin / current.revenue) * 100) : 0}&nbsp;%
            </p>
          </StatCard>
        ) : (
          <StatCard label="Panier moyen" value={formatFcfa(basket)} icon={ShoppingBasket}>
            {compare && <Delta value={percentChange(basket, previousBasket)} suffix={meta.compare} />}
          </StatCard>
        )}
        <StatCard label="Stock à surveiller" value={alerts.length} icon={PackageX} tone="danger">
          <p className="text-sm text-ink-mute">
            {outCount} en rupture · {alerts.length - outCount} stock faible
          </p>
          <a
            href={can('stock') ? '/app/stock?filtre=alerte' : '/app/produits?stock=alerte'}
            className={`${linkClass} mt-1.5`}
          >
            Voir les articles
          </a>
        </StatCard>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title="Évolution du chiffre d’affaires"
          description={period === 'today' ? 'Heure par heure depuis l’ouverture' : `Jour par jour, ${meta.label}`}
          action={
            can('reports') && (
              <a href="/app/rapports" className={linkClass}>
                Rapports
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            )
          }
        >
          <div className="mb-4 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-ink-mute">
            <span className="inline-flex items-center gap-2">
              <span className="h-0.5 w-4 rounded-full bg-gold-500" aria-hidden="true" />
              {meta.label}
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="w-4 border-t-2 border-dashed border-navy-300 dark:border-navy-500" aria-hidden="true" />
              Période précédente
            </span>
          </div>
          <SalesChart points={chartPoints(period, sales)} compareLabel={meta.compare} />
        </Card>
        {can('deposits') ? <DepositsCheck /> : <PaymentMix totals={current} />}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <RecentSales />
        <div className="space-y-6">
          {can('deposits') && <PaymentMix totals={current} />}
          <StockAlertsCard limit={4} />
        </div>
      </div>
    </div>
  );
}

const CHECKLIST_KEY = 'gs-checklist';

/** What a new shop still has to set up; disappears once everything is done or the owner hides it. */
function GettingStarted() {
  const { demo, can, role } = useSession();
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try {
      setHidden(localStorage.getItem(CHECKLIST_KEY) === 'hidden');
    } catch {
      /* Private mode: the list stays visible. */
    }
  }, []);

  const steps = [
    {
      id: 'products',
      show: can('products') && role.editCatalog,
      done: demo.products.length > 0,
      title: 'Ajouter vos produits',
      text: 'Nom, prix de vente, prix d’achat, stock et seuil d’alerte.',
      href: '/app/produits/fiche',
    },
    {
      id: 'suppliers',
      show: can('suppliers'),
      done: demo.suppliers.length > 0,
      title: 'Enregistrer un fournisseur',
      text: 'Pour saisir vos livraisons et remonter le stock en un geste.',
      href: '/app/fournisseurs',
    },
    {
      id: 'sale',
      show: can('pos'),
      done: demo.sales.length > 0,
      title: 'Encaisser une première vente',
      text: 'À la caisse : le stock baisse et le reçu part sur WhatsApp.',
      href: '/app/caisse',
    },
    {
      id: 'team',
      show: can('team') && role.manageTeam,
      done: demo.team.length > 1,
      title: 'Inviter votre équipe',
      text: 'Gérants, vendeurs et magasiniers, chacun avec ses droits.',
      href: '/app/equipe',
    },
    {
      id: 'company',
      show: can('settings') && role.manageTeam,
      done: Boolean(demo.settings.logoUrl || demo.settings.niu),
      title: 'Compléter votre entreprise',
      text: 'Logo, NIU et RCCM, repris sur vos reçus et factures.',
      href: '/app/parametres?onglet=entreprise',
    },
  ].filter((step) => step.show);
  const done = steps.filter((step) => step.done).length;
  if (hidden || !steps.length || done === steps.length) return null;

  return (
    <Card
      title="Premiers pas"
      description={`${done} sur ${steps.length} terminé${done > 1 ? 's' : ''} · votre boutique part de zéro, sans données d’exemple.`}
      action={
        <button
          type="button"
          onClick={() => {
            setHidden(true);
            try {
              localStorage.setItem(CHECKLIST_KEY, 'hidden');
            } catch {
              /* Private mode: hidden for this page only. */
            }
          }}
          className="rounded-lg px-2 py-1 text-sm font-semibold text-ink-mute transition hover:bg-sunken hover:text-ink"
        >
          Masquer
        </button>
      }
    >
      <div
        role="progressbar"
        aria-label="Mise en route de la boutique"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={done}
        className="h-2 overflow-hidden rounded-full bg-sunken"
      >
        <div
          className="h-full rounded-full bg-linear-to-r from-gold-300 to-gold-500 transition-[width] duration-500"
          style={{ width: `${(done / steps.length) * 100}%` }}
        />
      </div>
      <ol className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {steps.map((step) => (
          <li key={step.id}>
            <a
              href={step.href}
              className={`group flex h-full items-start gap-3 rounded-xl border p-3.5 transition ${
                step.done
                  ? 'border-transparent bg-sunken/60'
                  : 'border-line hover:border-gold-400 hover:bg-gold-50/60 dark:hover:bg-gold-400/5'
              }`}
            >
              {step.done ? (
                <CircleCheck
                  className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                />
              ) : (
                <Circle className="mt-0.5 size-5 shrink-0 text-ink-mute" aria-hidden="true" />
              )}
              <span className="min-w-0 flex-1">
                <span className={`block font-semibold ${step.done ? 'text-ink-mute line-through' : 'text-ink'}`}>
                  {step.title}
                  {step.done && <span className="sr-only"> (fait)</span>}
                </span>
                <span className="mt-0.5 block text-sm text-ink-mute">{step.text}</span>
              </span>
              {!step.done && (
                <ArrowRight
                  className="mt-0.5 size-4 shrink-0 text-ink-mute transition group-hover:translate-x-0.5 group-hover:text-gold-600"
                  aria-hidden="true"
                />
              )}
            </a>
          </li>
        ))}
      </ol>
      <button type="button" onClick={startTour} className={`${linkClass} mt-4`}>
        <Compass className="size-4" aria-hidden="true" />
        Revoir la visite guidée
      </button>
    </Card>
  );
}

/* The signature card: where every franc of yesterday's cash ended up. */
function DepositsCheck() {
  const { demo } = useSession();
  if (!demo.deposits.length) return <DepositsIntro />;
  const latestDay = Math.max(...demo.deposits.map((deposit) => deposit.day));
  const latest = demo.deposits.filter((deposit) => deposit.day === latestDay);
  const expected = latest.reduce((sum, deposit) => sum + deposit.expected, 0);
  const deposited = latest.reduce((sum, deposit) => sum + deposit.deposited, 0);
  const ratio = expected ? Math.min(100, Math.round((deposited / expected) * 1000) / 10) : 100;
  const gap = deposited - expected;
  const pending = demo.deposits.filter((deposit) => deposit.status === 'pending').length;

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
          {pending ? `Vérifier ${pending} versement${pending > 1 ? 's' : ''}` : 'Voir les versements'}
          <ArrowRight className="size-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

/** Same card before the first deposit: what the check is for and who does what. */
function DepositsIntro() {
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
        Versements des gérants
      </h2>
      <p className="relative mt-3 text-sm leading-relaxed text-white/70">
        Aucun versement pour l’instant. Chaque soir, le gérant déclare l’argent remis ; GOLDSTOCK le compare aux ventes
        en espèces et vous signale le moindre écart.
      </p>
      <ol className="relative mt-5 space-y-2.5 text-sm">
        {['Le gérant déclare le versement du jour', 'GOLDSTOCK calcule l’écart', 'Vous validez ou signalez'].map(
          (text, index) => (
            <li
              key={text}
              className="flex items-center gap-3 rounded-xl bg-white/[0.05] px-3.5 py-3 ring-1 ring-white/[0.06] ring-inset"
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-gold-400/15 text-xs font-bold text-gold-300">
                {index + 1}
              </span>
              {text}
            </li>
          ),
        )}
      </ol>
      <div className="relative mt-auto pt-6">
        <a href="/app/versements" className="btn-gold h-11 w-full">
          Voir les versements
          <ArrowRight className="size-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

function RecentSales() {
  const session = useSession();
  const recent = visibleSales(session).slice(0, 7);
  const color = (id: string) => PAYMENTS.find((pay) => pay.id === id)!.color;

  return (
    <Card
      className="overflow-hidden xl:col-span-2"
      title="Dernières ventes"
      bodyClassName=""
      action={
        <a href="/app/ventes" className={linkClass}>
          Toutes les ventes
          <ArrowRight className="size-4" aria-hidden="true" />
        </a>
      }
    >
      {recent.length === 0 ? (
        <EmptyState icon={Receipt} title="Pas encore de vente">
          Les ventes encaissées en caisse apparaîtront ici.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {recent.map((sale) => {
            const state = saleState(sale);
            const more = sale.lines.length - 1;
            return (
              <li key={sale.id}>
                <a
                  href={`/app/ventes?q=${encodeURIComponent(sale.id)}`}
                  className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-sunken/60 sm:px-6"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">
                      {sale.lines[0].name}
                      {more > 0 && <span className="font-normal text-ink-mute"> + {more}</span>}
                    </p>
                    <p className="truncate text-sm text-ink-mute">
                      {sale.id} · {formatWhen(sale.at)} · {sale.seller} · {sale.shop}
                    </p>
                  </div>
                  <span className="hidden w-32 items-center gap-2 text-sm text-ink-soft md:flex">
                    <span className="size-2 rounded-full" style={{ background: color(sale.pay) }} aria-hidden="true" />
                    {payLabel(sale.pay)}
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <span className="font-bold text-ink tabular-nums">{formatFcfa(saleNet(sale))}</span>
                    {state !== 'ok' && <StatusBadge kind="sale" status={state} />}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* What the storekeeper sees first: stock, not revenue. */
function StockDashboard() {
  const { demo, member, role } = useSession();
  const items = flatItems(demo);
  const units = items.reduce((sum, item) => sum + item.variant.stock, 0);
  const value = items.reduce((sum, item) => sum + item.variant.stock * item.variant.cost, 0);
  const alerts = stockAlerts(demo);

  return (
    <div className="space-y-6">
      <PageHeader
        title={greeting(member.name, role.label)}
        description={`${formatFullDate(NOW)} · voici l’état du stock.`}
        actions={
          <>
            <a href="/app/stock?onglet=inventaire" className="btn-quiet h-11 px-4">
              <ClipboardList className="size-[1.125rem]" aria-hidden="true" />
              Inventaire
            </a>
            <a href="/app/fournisseurs?onglet=reception" className="btn-gold h-11 px-4">
              Nouvelle réception
            </a>
          </>
        }
      />
      <GettingStarted />
      <section aria-label="Indicateurs du stock" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Références actives" value={formatNumber(items.length)} icon={Boxes} />
        <StatCard label="Unités en stock" value={formatNumber(units)} icon={Wallet} />
        <StatCard label="Valeur du stock" value={formatFcfa(value)} icon={Banknote} tone="gold">
          <p className="text-sm text-ink-mute">Au prix d’achat</p>
        </StatCard>
        <StatCard label="À réapprovisionner" value={alerts.length} icon={PackageX} tone="danger" />
      </section>
      <div className="grid gap-6 xl:grid-cols-3">
        <StockAlertsCard limit={8} className="xl:col-span-2" />
        <Card title="Derniers mouvements" bodyClassName="px-2 pb-3 sm:px-3">
          {demo.moves.length === 0 && (
            <EmptyState icon={ArrowLeftRight} title="Aucun mouvement">
              Réceptions, entrées, sorties et inventaires s’afficheront ici.
            </EmptyState>
          )}
          <ul>
            {demo.moves.slice(0, 6).map((move) => (
              <li key={move.id} className="flex items-start gap-3 rounded-xl px-3 py-2.5">
                <span
                  className={`mt-0.5 w-10 shrink-0 text-right text-sm font-bold tabular-nums ${move.qty > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-300'}`}
                >
                  {move.qty > 0 ? '+' : '−'}
                  {Math.abs(move.qty)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{move.item}</p>
                  <p className="truncate text-xs text-ink-mute">
                    {MOVE_LABELS[move.type]} · {move.user} · {formatAgo(move.at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
