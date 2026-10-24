import { CircleAlert, ImageUp, KeyRound, Monitor, Moon, Plus, Store, Sun, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode, type SubmitEvent } from 'react';
import { PLAN_LIMITS, ROLES, type PlanId, type Settings, type ShopInfo } from '../../data/dashboard';
import { cities, plans } from '../../data/site';
import { MIN_PASSWORD_LENGTH, changePassword, type PasswordError } from '../../lib/auth';
import { addShop, logActivity, setDemo, setShopAddresses, shopQuota, useSession } from '../../lib/demo';
import { LOGO_ACCEPT, removeShopLogo, uploadShopLogo, type LogoError } from '../../lib/shop';
import { applyTheme, getThemePreference, type ThemePreference } from '../../lib/theme';
import { Receipt } from './PosPage';
import { ShopLogo } from './ShopCard';
import {
  Avatar,
  Card,
  FormField,
  PageHeader,
  SelectBox,
  Switch,
  Tabs,
  Modal,
  inputClass,
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
  const { can, roleId } = useSession();
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
        {tab === 'company' && (
          <div className="space-y-6">
            {roleId === 'owner' && <LogoCard onNotify={notify} />}
            <CompanyForm onSaved={() => notify('Informations de l’entreprise enregistrées.')} />
          </div>
        )}
        {tab === 'shops' && (
          <ShopsForm onSaved={() => notify('Adresses des boutiques enregistrées.')} onNotify={notify} />
        )}
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

function FormError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-400">
      <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

const logoErrors: Record<LogoError, string> = {
  'not-an-image': 'Choisissez une image PNG, JPG ou WebP.',
  'too-large': 'Cette image dépasse 10 Mo. Choisissez une version plus légère.',
  failed: 'Le logo n’a pas pu être enregistré. Vérifiez votre connexion puis réessayez.',
};

function LogoCard({ onNotify }: { onNotify: (message: string) => void }) {
  const { demo, member } = useSession();
  const picker = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null);
  const [error, setError] = useState('');
  const hasLogo = Boolean(demo.settings.logoUrl);

  const upload = async (file: File) => {
    setBusy('upload');
    setError('');
    const result = await uploadShopLogo(file);
    setBusy(null);
    if (!result.ok) return setError(logoErrors[result.error]);
    saveSettings({ logoUrl: result.logoUrl });
    logActivity(member.name, 'a changé le logo de la boutique', 'edit');
    onNotify('Logo enregistré.');
  };

  const remove = async () => {
    setBusy('remove');
    setError('');
    const { ok } = await removeShopLogo();
    setBusy(null);
    if (!ok) return setError('Le logo n’a pas pu être retiré. Vérifiez votre connexion puis réessayez.');
    saveSettings({ logoUrl: '' });
    logActivity(member.name, 'a retiré le logo de la boutique', 'edit');
    onNotify('Logo retiré.');
  };

  return (
    <Card title="Logo" description="Affiché dans le menu et en haut de vos reçus.">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <ShopLogo className="size-20 rounded-2xl text-xl" />
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => picker.current?.click()}
              className="btn-navy h-11 px-4 disabled:opacity-60 dark:bg-white/10 dark:hover:bg-white/15"
            >
              <ImageUp className="size-[1.125rem]" aria-hidden="true" />
              {busy === 'upload' ? 'Envoi en cours…' : hasLogo ? 'Changer le logo' : 'Ajouter un logo'}
            </button>
            {hasLogo && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={remove}
                className="btn-quiet h-11 px-4 disabled:opacity-60"
              >
                <Trash2 className="size-[1.125rem]" aria-hidden="true" />
                {busy === 'remove' ? 'Retrait…' : 'Retirer'}
              </button>
            )}
          </div>
          <p className="text-sm text-ink-mute">
            PNG, JPG ou WebP. Un logo carré, sur fond blanc ou transparent, rend le mieux.
          </p>
          {error && <FormError>{error}</FormError>}
        </div>
      </div>
      <input
        ref={picker}
        type="file"
        accept={LOGO_ACCEPT}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) upload(file);
        }}
      />
    </Card>
  );
}

function CompanyForm({ onSaved }: { onSaved: () => void }) {
  const { demo, business, member } = useSession();
  const fromSettings = ({ company, niu, rccm, shopName, city, phone }: Settings) => ({
    company,
    niu,
    rccm,
    shopName,
    city,
    phone,
  });
  const [form, setForm] = useState(() => fromSettings(demo.settings));
  useEffect(() => setForm(fromSettings(demo.settings)), [demo.settings]);
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
      <form noValidate onSubmit={submit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField id="set-shop" label="Nom commercial" error={error}>
          <input
            id="set-shop"
            className={inputClass(Boolean(error))}
            value={form.shopName}
            onChange={set('shopName')}
          />
        </FormField>
        <FormField
          id="set-business"
          label="Activité"
          hint="Choisie à l’inscription. Une boutique n’exerce qu’une seule activité."
        >
          <input id="set-business" className={inputClass()} value={business.label} readOnly />
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

const addressesOf = (shops: ShopInfo[]) => Object.fromEntries(shops.map((shop) => [shop.name, shop.address]));

function ShopsForm({ onSaved, onNotify }: { onSaved: () => void; onNotify: (message: string) => void }) {
  const { demo, business, roleId } = useSession();
  const [addresses, setAddresses] = useState(() => addressesOf(demo.shops));
  const [adding, setAdding] = useState(false);
  useEffect(() => setAddresses(addressesOf(demo.shops)), [demo.shops]);
  const { used, limit, canAdd } = shopQuota(demo);
  const plan = plans.find((item) => item.id === demo.plan.id)!;
  const upgrade = plans.find((item) => {
    const next = PLAN_LIMITS[item.id as PlanId].shops;
    return next === null || next > used;
  });
  const owner = roleId === 'owner';

  return (
    <Card
      title="Boutiques"
      description={`${used} boutique${used > 1 ? 's' : ''} sur ${limit ?? 'un nombre illimité'} incluse${used > 1 ? 's' : ''} dans la formule ${plan.name}, toutes en ${business.label.toLowerCase()}.`}
      action={
        owner &&
        canAdd && (
          <button type="button" className="btn-gold h-10 shrink-0 px-4 text-sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
            Ajouter une boutique
          </button>
        )
      }
    >
      {!canAdd && (
        <div className="mb-5 flex flex-col gap-3 rounded-xl bg-gold-50 p-4 text-sm sm:flex-row sm:items-center sm:justify-between dark:bg-gold-400/10">
          <p className="text-ink-soft">
            Votre formule {plan.name} inclut {limit} boutique{limit === 1 ? '' : 's'}, et vous les utilisez toutes.
            {upgrade && ` Passez à la formule ${upgrade.name} pour en ouvrir une autre.`}
          </p>
          {owner && upgrade && (
            <a href="/app/abonnement" className="btn-gold h-10 shrink-0 px-4 text-sm">
              Changer de formule
            </a>
          )}
        </div>
      )}
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setShopAddresses(addresses);
          onSaved();
        }}
        className="space-y-4"
      >
        {demo.shops.map(({ name }) => (
          <div key={name} className="flex flex-col gap-3 rounded-xl border border-line p-4 sm:flex-row sm:items-center">
            <span className="flex items-center gap-3 sm:w-44">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-50 text-gold-700 dark:bg-gold-400/10 dark:text-gold-300">
                <Store className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-bold text-ink">{name}</span>
                <span className="block text-xs text-ink-mute">
                  {demo.team.filter((member) => member.shop === name).length} membres
                </span>
              </span>
            </span>
            <label className="flex-1">
              <span className="sr-only">Adresse de la boutique {name}</span>
              <input
                className={inputClass()}
                value={addresses[name] ?? ''}
                placeholder="Rue, quartier, repère"
                onChange={(event) => setAddresses((current) => ({ ...current, [name]: event.target.value }))}
              />
            </label>
          </div>
        ))}
        <SaveBar />
      </form>
      <AddShopDialog
        open={adding}
        onClose={() => setAdding(false)}
        onAdded={(name) => {
          setAdding(false);
          onNotify(`Boutique ${name} ouverte. Invitez son équipe depuis la page Équipe.`);
        }}
      />
    </Card>
  );
}

function AddShopDialog({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: (name: string) => void;
}) {
  const { demo, business, member } = useSession();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const { used, limit } = shopQuota(demo);

  const close = () => {
    setName('');
    setAddress('');
    setError('');
    onClose();
  };

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) return setError('Indiquez le nom de la boutique, par exemple son quartier.');
    if (demo.shops.some((shop) => shop.name.toLowerCase() === trimmed.toLowerCase()))
      return setError('Vous avez déjà une boutique avec ce nom.');
    addShop(trimmed, address, member.name);
    setName('');
    setAddress('');
    setError('');
    onAdded(trimmed);
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Ajouter une boutique"
      description={
        limit === null
          ? 'Votre formule permet un nombre illimité de boutiques.'
          : `Boutique ${used + 1} sur ${limit} incluses dans votre formule.`
      }
      footer={
        <>
          <button type="button" className="btn-quiet h-11 px-4" onClick={close}>
            Annuler
          </button>
          <button type="submit" form="add-shop" className="btn-gold h-11 px-5">
            Ouvrir la boutique
          </button>
        </>
      }
    >
      <form id="add-shop" noValidate onSubmit={submit} className="space-y-5">
        <FormField id="shop-name" label="Nom de la boutique" hint="Le plus simple : le quartier." error={error}>
          <input
            id="shop-name"
            className={inputClass(Boolean(error))}
            placeholder="Ex. Bonamoussadi"
            autoComplete="off"
            value={name}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? 'shop-name-error' : undefined}
            onChange={(event) => setName(event.target.value)}
          />
        </FormField>
        <FormField id="shop-address" label="Adresse (facultatif)" hint="Imprimée sur les reçus et les factures.">
          <input
            id="shop-address"
            className={inputClass()}
            placeholder="Rue, quartier, repère"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
        </FormField>
        <p className="rounded-xl bg-sunken p-3.5 text-sm text-ink-soft">
          Comme les autres, cette boutique vendra en {business.label.toLowerCase()} avec le même catalogue.
        </p>
      </form>
    </Modal>
  );
}

function PosSettings({ onSaved }: { onSaved: (message: string) => void }) {
  const { demo } = useSession();
  const [message, setMessage] = useState(demo.settings.receiptMessage);
  const sample = demo.sales.find((sale) => !sale.cancelled && sale.lines.length > 1) ?? demo.sales[0];

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
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
          {demo.settings.logoUrl && (
            <div className="mt-5 flex items-start justify-between gap-4 border-t border-line pt-5">
              <div>
                <p id="set-receipt-logo" className="font-semibold text-ink">
                  Logo sur le reçu
                </p>
                <p className="mt-0.5 text-sm text-ink-mute">Imprimé en haut du reçu, au-dessus du nom du commerce.</p>
              </div>
              <Switch
                checked={demo.settings.showLogo}
                labelledBy="set-receipt-logo"
                onChange={(value) => {
                  saveSettings({ showLogo: value });
                  onSaved(value ? 'Logo affiché sur le reçu.' : 'Logo retiré du reçu.');
                }}
              />
            </div>
          )}
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
  const [theme, setTheme] = useState<ThemePreference>('light');
  useEffect(() => setTheme(getThemePreference()), []);

  return (
    <Card title="Apparence" description="Le thème sombre repose les yeux en fin de journée.">
      <div role="radiogroup" aria-label="Thème" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
      {member.role === 'owner' && <PasswordCard onNotify={onNotify} />}
      <Card title="Code de caisse">
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

type PasswordField = 'current' | 'next' | 'confirm';

const passwordErrors: Record<PasswordError, { field?: PasswordField; message: string }> = {
  'wrong-password': { field: 'current', message: 'Mot de passe actuel incorrect.' },
  'same-password': { field: 'next', message: 'Choisissez un mot de passe différent de l’actuel.' },
  'weak-password': {
    field: 'next',
    message: 'Mot de passe trop facile à deviner. Mélangez lettres, chiffres et symboles.',
  },
  'rate-limited': { message: 'Trop de tentatives. Patientez une minute puis réessayez.' },
  network: { message: 'Connexion impossible. Vérifiez votre connexion internet puis réessayez.' },
  unknown: { message: 'Le mot de passe n’a pas pu être modifié. Réessayez dans un instant.' },
};

function PasswordCard({ onNotify }: { onNotify: (message: string) => void }) {
  const empty = { current: '', next: '', confirm: '' };
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<Partial<Record<PasswordField, string>>>({});
  const [formError, setFormError] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const field = (name: PasswordField) => ({
    id: `password-${name}`,
    type: visible ? 'text' : 'password',
    value: values[name],
    className: inputClass(Boolean(errors[name])),
    'aria-invalid': Boolean(errors[name]) || undefined,
    'aria-describedby': errors[name] ? `password-${name}-error` : undefined,
    onChange: (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [name]: event.target.value })),
  });

  const showErrors = (found: Partial<Record<PasswordField, string>>) => {
    setErrors(found);
    const first = (['current', 'next', 'confirm'] as const).find((name) => found[name]);
    if (first) document.getElementById(`password-${first}`)?.focus();
  };

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    const found: Partial<Record<PasswordField, string>> = {};
    if (!values.current) found.current = 'Entrez votre mot de passe actuel.';
    if (values.next.length < MIN_PASSWORD_LENGTH) found.next = `Au moins ${MIN_PASSWORD_LENGTH} caractères.`;
    else if (values.confirm !== values.next) found.confirm = 'Les deux mots de passe ne correspondent pas.';
    if (Object.keys(found).length) return showErrors(found);

    setErrors({});
    setBusy(true);
    const result = await changePassword(values.current, values.next);
    setBusy(false);
    if (result.ok) {
      setValues(empty);
      return onNotify('Mot de passe modifié. Vos autres appareils ont été déconnectés.');
    }
    const { field: target, message } = passwordErrors[result.error];
    if (target) showErrors({ [target]: message });
    else setFormError(message);
  };

  return (
    <Card
      title="Mot de passe"
      description="Après le changement, vos autres appareils sont déconnectés. Reconnectez-les avec le nouveau mot de passe."
    >
      <form noValidate onSubmit={submit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField id="password-current" label="Mot de passe actuel" error={errors.current}>
          <input {...field('current')} autoComplete="current-password" />
        </FormField>
        <span aria-hidden="true" className="hidden sm:block" />
        <FormField
          id="password-next"
          label="Nouveau mot de passe"
          hint={`${MIN_PASSWORD_LENGTH} caractères minimum.`}
          error={errors.next}
        >
          <input {...field('next')} autoComplete="new-password" />
        </FormField>
        <FormField id="password-confirm" label="Confirmez le nouveau mot de passe" error={errors.confirm}>
          <input {...field('confirm')} autoComplete="new-password" />
        </FormField>
        <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm font-medium text-ink-soft sm:col-span-2">
          <input
            type="checkbox"
            checked={visible}
            onChange={(event) => setVisible(event.target.checked)}
            className="size-4 accent-gold-500"
          />
          Afficher les mots de passe
        </label>
        {formError && (
          <div className="sm:col-span-2">
            <FormError>{formError}</FormError>
          </div>
        )}
        <div className="flex justify-end border-t border-line pt-5 sm:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="btn-navy h-11 px-5 disabled:opacity-60 dark:bg-white/10 dark:hover:bg-white/15"
          >
            {busy ? 'Modification…' : 'Changer le mot de passe'}
          </button>
        </div>
      </form>
    </Card>
  );
}
