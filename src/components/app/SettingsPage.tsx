import { KeyRound, Monitor, Moon, Store, Sun } from 'lucide-react';
import { useEffect, useState, type ReactNode, type SubmitEvent } from 'react';
import { PLAN_LIMITS, ROLES, SHOPS, type Settings, type Shop } from '../../data/dashboard';
import { cities } from '../../data/site';
import { logActivity, setDemo, useSession } from '../../lib/demo';
import { applyTheme, getThemePreference, type ThemePreference } from '../../lib/theme';
import { Receipt } from './PosPage';
import {
  Avatar,
  Card,
  FormField,
  PageHeader,
  SelectBox,
  Switch,
  Tabs,
  inputClass,
  linkClass,
  textareaClass,
  useQueryParam,
  useToasts,
} from './ui';

type TabId = 'company' | 'shops' | 'pos' | 'alerts' | 'appearance' | 'profile';

const allTabs: { id: TabId; label: string; manage: boolean }[] = [
  { id: 'company', label: 'Entreprise', manage: true },
  { id: 'shops', label: 'Boutiques', manage: true },
  { id: 'pos', label: 'Caisse et reçus', manage: true },
  { id: 'alerts', label: 'Alertes', manage: true },
  { id: 'appearance', label: 'Apparence', manage: false },
  { id: 'profile', label: 'Mon profil', manage: false },
];

const presets: Record<string, TabId> = {
  entreprise: 'company',
  boutiques: 'shops',
  caisse: 'pos',
  alertes: 'alerts',
  apparence: 'appearance',
  profil: 'profile',
};

const saveSettings = (patch: Partial<Settings>) =>
  setDemo((demo) => ({ ...demo, settings: { ...demo.settings, ...patch } }));

export default function SettingsPage() {
  const { can } = useSession();
  const manage = can('settings');
  const tabs = allTabs.filter((tab) => manage || !tab.manage);
  const [tab, setTab] = useState<TabId>(tabs[0].id);
  const { notify, region } = useToasts();

  const preset = useQueryParam('onglet');
  useEffect(() => {
    const target = preset ? presets[preset] : undefined;
    if (target && tabs.some((item) => item.id === target)) setTab(target);
  }, [preset, manage]);

  useEffect(() => {
    if (!tabs.some((item) => item.id === tab)) setTab(tabs[0].id);
  }, [manage]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paramètres"
        description={
          manage ? 'Votre entreprise, vos boutiques et vos préférences.' : 'Votre profil et vos préférences.'
        }
      />
      <Tabs label="Rubriques" tabs={tabs} value={tab} onChange={setTab} />
      <div className="max-w-4xl">
        {tab === 'company' && <CompanyForm onSaved={() => notify('Informations de l’entreprise enregistrées.')} />}
        {tab === 'shops' && <ShopsForm onSaved={() => notify('Adresses des boutiques enregistrées.')} />}
        {tab === 'pos' && <PosSettings onSaved={notify} />}
        {tab === 'alerts' && <AlertSettings onSaved={notify} />}
        {tab === 'appearance' && <Appearance />}
        {tab === 'profile' && <Profile onNotify={notify} />}
      </div>
      {region}
    </div>
  );
}

function SaveBar({ children }: { children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-5 sm:col-span-2">
      {children}
      <button type="submit" className="btn-navy h-11 px-5 dark:bg-white/10 dark:hover:bg-white/15">
        Enregistrer
      </button>
    </div>
  );
}

function CompanyForm({ onSaved }: { onSaved: () => void }) {
  const { demo, member } = useSession();
  const [form, setForm] = useState(() => {
    const { company, niu, rccm, shopName, city, phone } = demo.settings;
    return { company, niu, rccm, shopName, city, phone };
  });
  const [error, setError] = useState('');
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.shopName.trim().length < 2) return setError('Indiquez le nom affiché de votre commerce.');
    setError('');
    saveSettings({ ...form, shopName: form.shopName.trim() });
    logActivity(member.name, 'a modifié les informations de l’entreprise', 'edit');
    onSaved();
  };

  return (
    <Card title="Entreprise" description="Affichée sur vos reçus et dans les messages envoyés à vos clients.">
      <form noValidate onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
        <FormField id="set-shop" label="Nom commercial" error={error}>
          <input
            id="set-shop"
            className={inputClass(Boolean(error))}
            value={form.shopName}
            onChange={set('shopName')}
          />
        </FormField>
        <FormField id="set-company" label="Raison sociale">
          <input id="set-company" className={inputClass()} value={form.company} onChange={set('company')} />
        </FormField>
        <FormField id="set-niu" label="NIU" hint="Numéro d’identifiant unique (impôts).">
          <input id="set-niu" className={inputClass()} value={form.niu} onChange={set('niu')} />
        </FormField>
        <FormField id="set-rccm" label="RCCM">
          <input id="set-rccm" className={inputClass()} value={form.rccm} onChange={set('rccm')} />
        </FormField>
        <FormField id="set-city" label="Ville">
          <SelectBox id="set-city" value={form.city} onChange={set('city')}>
            {cities.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </SelectBox>
        </FormField>
        <FormField id="set-phone" label="Téléphone sur les reçus">
          <input id="set-phone" type="tel" className={inputClass()} value={form.phone} onChange={set('phone')} />
        </FormField>
        <FormField id="set-currency" label="Devise">
          <input id="set-currency" className={inputClass()} value="Franc CFA (FCFA)" readOnly />
        </FormField>
        <SaveBar />
      </form>
    </Card>
  );
}

function ShopsForm({ onSaved }: { onSaved: () => void }) {
  const { demo, roleId } = useSession();
  const [addresses, setAddresses] = useState(demo.settings.addresses);
  const limit = PLAN_LIMITS[demo.plan.id].shops;

  return (
    <Card
      title="Boutiques"
      description={`${SHOPS.length} boutiques sur ${limit ?? 'un nombre illimité'} incluses dans votre formule.`}
      action={
        roleId === 'owner' && (
          <a href="/app/abonnement" className={linkClass}>
            Ajouter une boutique
          </a>
        )
      }
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          saveSettings({ addresses });
          onSaved();
        }}
        className="space-y-4"
      >
        {SHOPS.map((shop: Shop) => (
          <div key={shop} className="flex flex-col gap-3 rounded-xl border border-line p-4 sm:flex-row sm:items-center">
            <span className="flex items-center gap-3 sm:w-44">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-50 text-gold-700 dark:bg-gold-400/10 dark:text-gold-300">
                <Store className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-bold text-ink">{shop}</span>
                <span className="block text-xs text-ink-mute">
                  {demo.team.filter((member) => member.shop === shop).length} membres
                </span>
              </span>
            </span>
            <label className="flex-1">
              <span className="sr-only">Adresse de la boutique {shop}</span>
              <input
                className={inputClass()}
                value={addresses[shop]}
                onChange={(event) => setAddresses((current) => ({ ...current, [shop]: event.target.value }))}
              />
            </label>
          </div>
        ))}
        <SaveBar />
      </form>
    </Card>
  );
}

function PosSettings({ onSaved }: { onSaved: (message: string) => void }) {
  const { demo } = useSession();
  const [message, setMessage] = useState(demo.settings.receiptMessage);
  const sample = demo.sales.find((sale) => !sale.cancelled && sale.lines.length > 1) ?? demo.sales[0];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-6">
        <Card title="Caisse">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p id="set-negative" className="font-semibold text-ink">
                Vendre sans stock
              </p>
              <p className="mt-0.5 text-sm text-ink-mute">
                Autorise l’encaissement d’un article même si le stock affiche zéro. À éviter, sauf si vos réceptions ne
                sont pas encore saisies.
              </p>
            </div>
            <Switch
              checked={demo.settings.negativeStock}
              labelledBy="set-negative"
              onChange={(value) => {
                saveSettings({ negativeStock: value });
                onSaved(value ? 'Vente sans stock autorisée.' : 'Vente sans stock bloquée.');
              }}
            />
          </div>
        </Card>
        <Card title="Message du reçu" description="Imprimé en bas du reçu et ajouté au message WhatsApp.">
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              saveSettings({ receiptMessage: message.trim() });
              onSaved('Message du reçu enregistré.');
            }}
            className="space-y-5"
          >
            <label className="block">
              <span className="sr-only">Message du reçu</span>
              <textarea
                rows={3}
                maxLength={160}
                className={textareaClass}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
              <span className="mt-1.5 block text-right text-xs text-ink-mute">{message.length} / 160</span>
            </label>
            <SaveBar />
          </form>
        </Card>
      </div>
      {sample && (
        <div className="lg:sticky lg:top-24">
          <p className="mb-2 text-sm font-semibold text-ink-mute">Aperçu</p>
          <div className="rounded-2xl bg-sunken p-4">
            <Receipt sale={sample} />
          </div>
        </div>
      )}
    </div>
  );
}

const alertOptions = [
  { id: 'stock', label: 'Stock faible et ruptures', description: 'Dès qu’un article passe sous son seuil d’alerte.' },
  {
    id: 'deposit',
    label: 'Écart sur un versement',
    description: 'Quand le montant remis ne correspond pas aux ventes.',
  },
  { id: 'daily', label: 'Résumé du soir sur WhatsApp', description: 'Chiffre d’affaires, marge et versements à 21h.' },
  { id: 'cancel', label: 'Ventes annulées', description: 'Chaque annulation, avec le nom du vendeur.' },
] as const;

function AlertSettings({ onSaved }: { onSaved: (message: string) => void }) {
  const { demo } = useSession();
  return (
    <Card title="Alertes" description="Choisissez ce qui mérite d’interrompre votre journée.">
      <ul className="divide-y divide-line">
        {alertOptions.map((option) => {
          const on = demo.settings.alerts[option.id];
          return (
            <li key={option.id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
              <div>
                <p id={`alert-${option.id}`} className="font-semibold text-ink">
                  {option.label}
                </p>
                <p className="mt-0.5 text-sm text-ink-mute">{option.description}</p>
              </div>
              <Switch
                checked={on}
                labelledBy={`alert-${option.id}`}
                onChange={(value) => {
                  saveSettings({ alerts: { ...demo.settings.alerts, [option.id]: value } });
                  onSaved(`${option.label} : ${value ? 'activé' : 'désactivé'}.`);
                }}
              />
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Appearance() {
  const [theme, setTheme] = useState<ThemePreference>('system');
  useEffect(() => setTheme(getThemePreference()), []);

  return (
    <Card title="Apparence" description="Le thème sombre repose les yeux en fin de journée.">
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
    </Card>
  );
}

function Profile({ onNotify }: { onNotify: (message: string) => void }) {
  const { member, role } = useSession();

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center gap-4">
          <Avatar name={member.name} size="lg" />
          <div>
            <p className="text-lg font-bold text-ink">{member.name}</p>
            <p className="text-sm text-ink-mute">
              {role.label} · {member.shop === 'Toutes' ? 'Toutes les boutiques' : member.shop}
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-5 border-t border-line pt-6 sm:grid-cols-2">
          <FormField id="profile-phone" label="Téléphone" hint="Sert d’identifiant de connexion.">
            <input id="profile-phone" className={inputClass()} value={member.phone} readOnly />
          </FormField>
          <FormField id="profile-role" label="Rôle" hint={ROLES[member.role].summary}>
            <input id="profile-role" className={inputClass()} value={role.label} readOnly />
          </FormField>
        </div>
        {member.role !== 'owner' && (
          <p className="mt-4 text-sm text-ink-mute">Pour changer de nom ou de rôle, adressez-vous au propriétaire.</p>
        )}
      </Card>
      <Card title="Sécurité">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-mute">
            Votre code secret protège l’accès à la caisse. Changez-le si vous pensez qu’il a été vu.
          </p>
          <button
            type="button"
            className="btn-quiet h-11 shrink-0 px-4"
            onClick={() => onNotify(`Un code de vérification a été envoyé au ${member.phone}.`)}
          >
            <KeyRound className="size-[1.125rem]" aria-hidden="true" />
            Changer mon code
          </button>
        </div>
      </Card>
    </div>
  );
}
