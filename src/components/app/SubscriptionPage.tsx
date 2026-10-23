import { Check, CreditCard, Download, Sparkles } from 'lucide-react';
import { useState } from 'react';
import {
  DAY,
  NOW,
  PLAN_LIMITS,
  SHOPS,
  formatFullDate,
  formatShortDate,
  type BillingCycle,
  type PlanId,
} from '../../data/dashboard';
import { FREE_MONTHS_PER_YEAR, formatFcfa, plans, yearlyPerMonth, yearlyTotal } from '../../data/site';
import { formatPhone, normalizePhone } from '../../lib/auth';
import { setDemo, useSession } from '../../lib/demo';
import { PhoneField } from '../auth/fields';
import { Screen } from './Screen';
import { Badge, Card, Modal, PageHeader, Segmented, useToasts } from './ui';

export default function SubscriptionPage() {
  return (
    <Screen id="subscription">
      <Subscription />
    </Screen>
  );
}

const planName = (id: PlanId) => plans.find((plan) => plan.id === id)!.name;
const price = (id: PlanId, cycle: BillingCycle) => {
  const monthly = plans.find((plan) => plan.id === id)!.monthlyPrice;
  return cycle === 'yearly' ? yearlyTotal(monthly) : monthly;
};

const payMethods = [
  { id: 'MTN MoMo', color: '#f4b52c' },
  { id: 'Orange Money', color: '#f97316' },
] as const;

function Subscription() {
  const { demo } = useSession();
  const [cycle, setCycle] = useState<BillingCycle>(demo.plan.cycle);
  const [checkout, setCheckout] = useState<{ plan: PlanId; cycle: BillingCycle } | null>(null);
  const { notify, region } = useToasts();
  const current = demo.plan;
  const daysLeft = Math.max(0, Math.ceil((current.expires - NOW) / DAY));

  const usage = {
    shops: SHOPS.length,
    users: demo.team.filter((member) => member.status !== 'suspended').length,
    products: demo.products.filter((product) => product.status !== 'archived').length,
  };
  const fits = (id: PlanId) =>
    (Object.keys(usage) as (keyof typeof usage)[]).every((key) => {
      const limit = PLAN_LIMITS[id][key];
      return limit === null || usage[key] <= limit;
    });

  return (
    <div className="space-y-6">
      <PageHeader title="Abonnement" description="Votre formule, son utilisation et vos factures." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section
          aria-labelledby="current-plan"
          className="relative overflow-hidden rounded-2xl bg-navy-950 p-6 text-white ring-1 ring-white/10 dark:bg-linear-to-br dark:from-navy-800 dark:to-navy-950 dark:ring-gold-400/20"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-[radial-gradient(circle,rgb(244_181_44/0.22),transparent_65%)]"
          />
          <p className="relative text-xs font-bold tracking-[0.14em] text-gold-300 uppercase">Formule actuelle</p>
          <h2 id="current-plan" className="relative mt-2 text-3xl font-extrabold tracking-tight">
            {planName(current.id)}
          </h2>
          <p className="relative mt-1 text-white/70">
            {formatFcfa(price(current.id, current.cycle))} {current.cycle === 'yearly' ? 'par an' : 'par mois'}
          </p>
          <div className="relative mt-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-white/60">Valable jusqu’au</p>
              <p className="font-bold">{formatFullDate(current.expires)}</p>
              <p className={`mt-0.5 text-sm ${daysLeft <= 7 ? 'text-gold-300' : 'text-white/60'}`}>
                Encore {daysLeft} jour{daysLeft > 1 ? 's' : ''}
              </p>
            </div>
            <button
              type="button"
              className="btn-gold h-11 px-5"
              onClick={() => setCheckout({ plan: current.id, cycle: current.cycle })}
            >
              Renouveler
            </button>
          </div>
        </section>

        <Card title="Utilisation">
          <ul className="space-y-4">
            {(
              [
                ['shops', 'Boutiques'],
                ['users', 'Utilisateurs'],
                ['products', 'Produits'],
              ] as const
            ).map(([key, label]) => {
              const limit = PLAN_LIMITS[current.id][key];
              return (
                <li key={key}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-ink-soft">{label}</span>
                    <span className="font-semibold text-ink tabular-nums">
                      {usage[key]} <span className="font-normal text-ink-mute">/ {limit ?? 'illimité'}</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sunken">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-gold-300 to-gold-500"
                      style={{ width: `${limit === null ? 12 : Math.min(100, (usage[key] / limit) * 100)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <section aria-labelledby="plans-title" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="plans-title" className="text-lg font-bold text-ink">
            Changer de formule
          </h2>
          <Segmented
            label="Facturation"
            value={cycle}
            onChange={setCycle}
            options={[
              { id: 'monthly', label: 'Mensuel' },
              { id: 'yearly', label: `Annuel · ${FREE_MONTHS_PER_YEAR} mois offerts` },
            ]}
          />
        </div>
        <ul className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const id = plan.id as PlanId;
            const isCurrent = id === current.id;
            const allowed = fits(id);
            return (
              <li key={plan.id} className={`app-card flex flex-col p-5 ${isCurrent ? 'ring-2 ring-gold-400' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-ink">{plan.name}</p>
                  {isCurrent ? (
                    <Badge tone="warning">Actuelle</Badge>
                  ) : (
                    plan.highlighted && (
                      <Badge tone="navy">
                        <Sparkles className="size-3" aria-hidden="true" />
                        Populaire
                      </Badge>
                    )
                  )}
                </div>
                <p className="mt-1 text-sm text-ink-mute">{plan.tagline}</p>
                <p className="mt-4 text-2xl font-extrabold text-ink tabular-nums">
                  {formatFcfa(cycle === 'yearly' ? yearlyPerMonth(plan.monthlyPrice) : plan.monthlyPrice)}
                  <span className="text-sm font-semibold text-ink-mute"> / mois</span>
                </p>
                <p className="text-xs text-ink-mute">
                  {cycle === 'yearly'
                    ? `${formatFcfa(yearlyTotal(plan.monthlyPrice))} facturés par an`
                    : 'Sans engagement'}
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-ink-soft">
                  {plan.features.slice(0, 5).map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" strokeWidth={3} aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={(isCurrent && cycle === current.cycle) || !allowed}
                  onClick={() => setCheckout({ plan: id, cycle })}
                  className={`${isCurrent ? 'btn-quiet' : 'btn-gold'} mt-5 h-11 w-full disabled:opacity-50`}
                >
                  {isCurrent
                    ? cycle === current.cycle
                      ? 'Formule actuelle'
                      : 'Passer en facturation ' + (cycle === 'yearly' ? 'annuelle' : 'mensuelle')
                    : allowed
                      ? `Passer à ${plan.name}`
                      : 'Limites dépassées'}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <Card title="Factures" className="overflow-hidden" bodyClassName="">
        <ul className="divide-y divide-line border-t border-line">
          {demo.invoices.map((invoice) => (
            <li key={invoice.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-3.5 sm:px-6">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">
                  {invoice.plan}
                  <span className="ml-2 font-mono text-xs font-normal text-ink-mute">{invoice.id}</span>
                </p>
                <p className="text-sm text-ink-mute">
                  {formatShortDate(invoice.at)} · {invoice.method}
                </p>
              </div>
              <Badge tone={invoice.status === 'paid' ? 'success' : 'danger'}>
                {invoice.status === 'paid' ? 'Payée' : 'Échec du paiement'}
              </Badge>
              <span className="w-28 text-right font-bold text-ink tabular-nums">{formatFcfa(invoice.amount)}</span>
              <button
                type="button"
                aria-label={`Télécharger la facture ${invoice.id}`}
                disabled={invoice.status !== 'paid'}
                onClick={() => notify(`Facture ${invoice.id} envoyée sur WhatsApp.`)}
                className="grid size-9 place-items-center rounded-lg text-ink-mute transition hover:bg-sunken hover:text-ink disabled:invisible"
              >
                <Download className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <CheckoutDialog
        target={checkout}
        onClose={() => setCheckout(null)}
        onPaid={(message) => {
          setCheckout(null);
          notify(message);
        }}
      />
      {region}
    </div>
  );
}

function CheckoutDialog({
  target,
  onClose,
  onPaid,
}: {
  target: { plan: PlanId; cycle: BillingCycle } | null;
  onClose: () => void;
  onPaid: (message: string) => void;
}) {
  const { demo, member } = useSession();
  const [method, setMethod] = useState<(typeof payMethods)[number]['id']>('MTN MoMo');
  const [phone, setPhone] = useState(() => formatPhone(member.phone.replace('+237', '')));
  const [error, setError] = useState('');
  if (!target) return <Modal open={false} onClose={onClose} title="Paiement" children={null} />;

  const amount = price(target.plan, target.cycle);
  const renewal = target.plan === demo.plan.id;
  const period = target.cycle === 'yearly' ? 365 * DAY : 30 * DAY;

  const pay = () => {
    if (!normalizePhone(phone)) return setError('Numéro à 9 chiffres, par exemple 6 77 12 34 56.');
    setError('');
    setDemo((current) => {
      const start = renewal ? Math.max(current.plan.expires, NOW) : NOW;
      const sequence = String(current.invoices.length + 1001).padStart(4, '0');
      return {
        ...current,
        plan: { id: target.plan, cycle: target.cycle, expires: start + period },
        invoices: [
          { id: `F-2026-${sequence}`, at: NOW, plan: planName(target.plan), amount, method, status: 'paid' },
          ...current.invoices,
        ],
      };
    });
    onPaid(
      renewal
        ? `Paiement reçu. Formule ${planName(target.plan)} prolongée.`
        : `Bienvenue dans la formule ${planName(target.plan)} !`,
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={renewal ? 'Renouveler mon abonnement' : `Passer à ${planName(target.plan)}`}
      description={`${formatFcfa(amount)} ${target.cycle === 'yearly' ? 'pour 12 mois' : 'pour 1 mois'}`}
      footer={
        <>
          <button type="button" className="btn-quiet h-11 px-4" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="btn-gold h-11 px-5" onClick={pay}>
            <CreditCard className="size-[1.125rem]" aria-hidden="true" />
            Payer {formatFcfa(amount)}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">Moyen de paiement</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {payMethods.map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-4 py-3 transition hover:border-navy-200 has-checked:border-gold-500 has-checked:bg-gold-50 dark:hover:border-white/20 dark:has-checked:bg-gold-400/10"
              >
                <input
                  type="radio"
                  name="pay-method"
                  className="sr-only"
                  checked={method === item.id}
                  onChange={() => setMethod(item.id)}
                />
                <span className="size-3 rounded-full" style={{ background: item.color }} aria-hidden="true" />
                <span className="font-semibold text-ink">{item.id}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <PhoneField
          id="pay-phone"
          label="Numéro à débiter"
          value={phone}
          onChange={(event) => setPhone(formatPhone(event.target.value))}
          error={error}
          hint="Vous validerez le paiement avec votre code secret sur votre téléphone."
        />
      </div>
    </Modal>
  );
}
