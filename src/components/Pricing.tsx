import { Check } from 'lucide-react';
import { useState } from 'react';
import { FREE_MONTHS_PER_YEAR, formatFcfa, yearlyPerMonth, yearlyTotal, type Billing, type Plan } from '../data/site';

type PricingProps = {
  plans: Plan[];
  signupUrl: string;
};

export default function Pricing({ plans, signupUrl }: PricingProps) {
  const [billing, setBilling] = useState<Billing>('monthly');

  const options: { value: Billing; label: string; hint?: string }[] = [
    { value: 'monthly', label: 'Mensuel' },
    { value: 'yearly', label: 'Annuel', hint: `${FREE_MONTHS_PER_YEAR} mois offerts` },
  ];

  return (
    <div>
      <fieldset className="mx-auto flex w-fit rounded-full border border-navy-100 bg-navy-50 p-1">
        <legend className="sr-only">Période de facturation</legend>
        {options.map((option) => (
          <label
            key={option.value}
            className={`relative inline-flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition has-focus-visible:outline-2 has-focus-visible:outline-gold-400 ${
              billing === option.value ? 'bg-white text-navy-900 shadow-card' : 'text-navy-500 hover:text-navy-800'
            }`}
          >
            <input
              type="radio"
              name="billing"
              value={option.value}
              checked={billing === option.value}
              onChange={() => setBilling(option.value)}
              className="sr-only"
            />
            {option.label}
            {option.hint && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                {option.hint}
              </span>
            )}
          </label>
        ))}
      </fieldset>

      <ul data-reveal-stagger className="mt-12 grid items-stretch gap-6 [--reveal-step:120ms] lg:grid-cols-3">
        {plans.map((plan) => {
          const price = billing === 'monthly' ? plan.monthlyPrice : yearlyPerMonth(plan.monthlyPrice);
          const dark = plan.highlighted;
          return (
            <li
              key={plan.id}
              className={`relative flex flex-col rounded-3xl p-8 ${
                dark
                  ? 'bg-navy-950 text-white shadow-[0_30px_60px_-30px_rgb(7_15_31/0.7)] ring-1 ring-gold-400/40 lg:-my-4 lg:py-12'
                  : 'border border-navy-100 bg-white text-navy-900 shadow-card'
              }`}
            >
              {dark && (
                <span className="absolute -top-3.5 left-8 rounded-full bg-gold-400 px-3 py-1 text-xs font-bold text-navy-950">
                  Le plus choisi
                </span>
              )}
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className={`mt-1 text-sm ${dark ? 'text-white/65' : 'text-navy-500'}`}>{plan.tagline}</p>

              <p className="mt-6 flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold tracking-tight">{formatFcfa(price)}</span>
                <span className={`text-sm ${dark ? 'text-white/60' : 'text-navy-500'}`}>/ mois</span>
              </p>
              <p className={`mt-1 h-5 text-sm ${dark ? 'text-white/60' : 'text-navy-500'}`}>
                {billing === 'yearly'
                  ? `Soit ${formatFcfa(yearlyTotal(plan.monthlyPrice))} facturés par an`
                  : 'Sans engagement'}
              </p>

              <ul className="mt-7 flex-1 space-y-3 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <Check
                      className={`mt-0.5 size-4 shrink-0 ${dark ? 'text-gold-400' : 'text-emerald-500'}`}
                      strokeWidth={3}
                      aria-hidden="true"
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href={`${signupUrl}?formule=${plan.id}&facturation=${billing}`}
                className={`mt-8 ${dark ? 'btn-gold' : 'btn-navy'}`}
              >
                Commencer l’essai gratuit
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
