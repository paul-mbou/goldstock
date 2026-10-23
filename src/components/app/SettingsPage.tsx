import { ChevronDown, Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useState, type SubmitEvent, type ReactNode } from 'react';
import { business, formatFcfa, formatFullDate } from '../../data/dashboard';
import { cities } from '../../data/site';
import { applyTheme, getThemePreference, type ThemePreference } from '../../lib/theme';
import { TextField } from '../auth/fields';
import { PageHeader, selectClass, useToasts } from './ui';

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid gap-5 border-b border-line py-8 first:pt-0 last:border-0 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-10">
      <div>
        <h2 className="font-bold text-ink">{title}</h2>
        <p className="mt-1 text-sm text-ink-mute">{description}</p>
      </div>
      <div className="app-card p-5 sm:p-6">{children}</div>
    </section>
  );
}

const alertOptions = [
  { id: 'stock', label: 'Stock faible et ruptures', description: 'Dès qu’un produit passe sous son seuil d’alerte.' },
  {
    id: 'deposit',
    label: 'Écart sur un versement',
    description: 'Quand le montant remis ne correspond pas aux ventes.',
  },
  {
    id: 'daily',
    label: 'Résumé du soir sur WhatsApp',
    description: 'Chiffre d’affaires, bénéfice et versements à 21h.',
  },
  { id: 'cancel', label: 'Ventes annulées', description: 'Chaque annulation, avec le nom du vendeur.' },
] as const;

export default function SettingsPage() {
  const { notify, region } = useToasts();
  const [shopName, setShopName] = useState<string>(business.name);
  const [city, setCity] = useState<string>(business.city);
  const [nameError, setNameError] = useState('');
  const [alerts, setAlerts] = useState<Record<string, boolean>>({
    stock: true,
    deposit: true,
    daily: true,
    cancel: false,
  });
  const [theme, setTheme] = useState<ThemePreference>('system');

  useEffect(() => setTheme(getThemePreference()), []);

  const save = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (shopName.trim().length < 2) {
      setNameError('Indiquez le nom de votre commerce.');
      return;
    }
    setNameError('');
    notify('Informations du commerce enregistrées.');
  };

  return (
    <div>
      <PageHeader title="Paramètres" description="Votre commerce, votre abonnement et vos préférences." />

      <div className="mt-8">
        <Section title="Commerce" description="Affiché sur vos reçus et dans les messages envoyés à vos clients.">
          <form onSubmit={save} noValidate className="grid gap-5 sm:grid-cols-2">
            <TextField
              id="shop-name"
              label="Nom du commerce"
              value={shopName}
              onChange={(event) => setShopName(event.target.value)}
              error={nameError}
            />
            <div>
              <label htmlFor="shop-city" className="mb-2 block text-sm font-semibold text-navy-800 dark:text-navy-100">
                Ville
              </label>
              <div className="relative">
                <select
                  id="shop-city"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  className={`${selectClass} h-12 w-full`}
                >
                  {cities.map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-mute"
                  aria-hidden="true"
                />
              </div>
            </div>
            <TextField
              id="shop-phone"
              label="Téléphone du propriétaire"
              value={business.owner.phone}
              readOnly
              hint="Modifiable depuis l’application mobile, avec un code de vérification."
            />
            <TextField id="shop-currency" label="Devise" value="Franc CFA (FCFA)" readOnly />
            <div className="sm:col-span-2">
              <button type="submit" className="btn-navy h-11 px-5 dark:bg-white/10 dark:hover:bg-white/15">
                Enregistrer
              </button>
            </div>
          </form>
        </Section>

        <Section title="Abonnement" description="Payez par Mobile Money ou par carte, sans engagement.">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink-mute">Formule actuelle</p>
              <p className="mt-1 text-xl font-extrabold text-ink">
                {business.plan.name}{' '}
                <span className="text-base font-semibold text-ink-mute">
                  · {formatFcfa(business.plan.price)} / mois
                </span>
              </p>
              <p className="mt-1 text-sm text-ink-mute">
                Prochain prélèvement le {formatFullDate(business.plan.renewsOn).toLowerCase()}, par MTN MoMo.
              </p>
            </div>
            <a href="/#tarifs" className="btn-quiet h-11 px-4">
              Changer de formule
            </a>
          </div>
          <dl className="mt-6 grid gap-3 border-t border-line pt-5 text-sm sm:grid-cols-3">
            {[
              ['Boutiques', `${business.shops.length} sur ${business.plan.shops}`],
              ['Utilisateurs', `jusqu’à ${business.plan.users}`],
              ['Produits', 'illimités'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-ink-mute">{label}</dt>
                <dd className="mt-0.5 font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section title="Alertes" description="Choisissez ce qui mérite d’interrompre votre journée.">
          <ul className="divide-y divide-line">
            {alertOptions.map((option) => {
              const on = alerts[option.id];
              return (
                <li key={option.id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div>
                    <p id={`alert-${option.id}`} className="font-semibold text-ink">
                      {option.label}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-mute">{option.description}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-labelledby={`alert-${option.id}`}
                    onClick={() => {
                      setAlerts((current) => ({ ...current, [option.id]: !on }));
                      notify(`${option.label} : ${on ? 'désactivé' : 'activé'}.`);
                    }}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? 'bg-gold-500' : 'bg-navy-200 dark:bg-white/15'}`}
                  >
                    <span
                      className={`absolute top-1 left-1 size-5 rounded-full bg-white shadow transition ${on ? 'translate-x-5' : ''}`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section title="Apparence" description="Le thème sombre repose les yeux en fin de journée.">
          <div role="radiogroup" aria-label="Thème" className="grid gap-3 sm:grid-cols-3">
            {(
              [
                { id: 'light', label: 'Clair', icon: Sun },
                { id: 'dark', label: 'Sombre', icon: Moon },
                { id: 'system', label: 'Comme l’appareil', icon: Monitor },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={theme === id}
                onClick={() => {
                  setTheme(id);
                  applyTheme(id);
                }}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left font-semibold transition ${
                  theme === id
                    ? 'border-gold-500 bg-gold-50 text-ink dark:bg-gold-400/10'
                    : 'border-line text-ink-soft hover:border-navy-200 dark:hover:border-white/20'
                }`}
              >
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </Section>
      </div>
      {region}
    </div>
  );
}
