import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  CircleCheck,
  Footprints,
  LoaderCircle,
  LockKeyhole,
  MailCheck,
  Scissors,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode, type SubmitEvent } from 'react';
import { BUSINESSES, businessOf, type BusinessId } from '../../data/businesses';
import { cities, site, whatsappUrl } from '../../data/site';
import {
  formatPhone,
  isAuthLive,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  normalizePhone,
  signup,
  type AuthError,
} from '../../lib/auth';
import { WhatsAppIcon } from '../brand/WhatsAppIcon';
import { CheckEmailStep } from './CheckEmailStep';
import { EmailCodeStep } from './EmailCodeStep';
import { FormAlert, PasswordField, PhoneField, SelectField, TextField } from './fields';

type Values = {
  fullName: string;
  shopName: string;
  business: BusinessId | '';
  email: string;
  phone: string;
  city: string;
  password: string;
};

type FieldName = keyof Values;
type Errors = Partial<Record<FieldName, string>>;

const fieldOrder: FieldName[] = ['fullName', 'shopName', 'business', 'email', 'phone', 'city', 'password'];

const businessIcons: Record<BusinessId, LucideIcon> = {
  phones: Smartphone,
  hair: Scissors,
  clothing: Shirt,
  shoes: Footprints,
  cosmetics: Sparkles,
  grocery: ShoppingBasket,
};

const validate = (values: Values): Errors => {
  const errors: Errors = {};
  if (values.fullName.trim().length < 2) errors.fullName = 'Entrez votre nom et prénom.';
  if (values.shopName.trim().length < 2) errors.shopName = 'Entrez le nom de votre boutique.';
  if (!values.business) errors.business = 'Choisissez l’activité de votre boutique.';
  if (!values.email.trim()) errors.email = 'Entrez votre adresse email.';
  else if (!normalizeEmail(values.email)) errors.email = 'Adresse email invalide. Ex. awa@exemple.com';
  if (values.phone.trim() && !normalizePhone(values.phone))
    errors.phone = 'Numéro invalide : 9 chiffres, commençant par 6 ou 2.';
  if (!values.city) errors.city = 'Choisissez votre ville.';
  if (isAuthLive && values.password.length < MIN_PASSWORD_LENGTH)
    errors.password = `Au moins ${MIN_PASSWORD_LENGTH} caractères.`;
  return errors;
};

const passwordStrength = (password: string) => {
  if (!password) return 0;
  return [
    password.length >= MIN_PASSWORD_LENGTH,
    /\d/.test(password) && /[a-z]/i.test(password),
    password.length >= 12 || /[^a-z0-9]/i.test(password),
  ].filter(Boolean).length;
};

const strengthLabels = ['Trop court', 'Moyen', 'Bon', 'Excellent'];
const strengthColors = ['bg-red-400', 'bg-gold-400', 'bg-emerald-400', 'bg-emerald-500'];

const serverMessages: Partial<Record<AuthError, ReactNode>> = {
  'account-exists': (
    <>
      Un compte existe déjà avec cet email.{' '}
      <a href={site.loginUrl} className="font-semibold underline">
        Se connecter
      </a>
    </>
  ),
  'weak-password': 'Mot de passe trop faible. Mélangez lettres, chiffres et au moins 8 caractères.',
  'rate-limited': 'Trop de demandes en peu de temps. Patientez quelques minutes puis réessayez.',
  network: 'Impossible de joindre GOLDSTOCK. Vérifiez votre connexion internet puis réessayez.',
  unknown: 'Une erreur est survenue. Réessayez dans un instant.',
};

function whatsappRequest(values: Values) {
  return whatsappUrl(
    [
      `Bonjour GOLDSTOCK, je souhaite démarrer mon essai gratuit de ${site.trialDays} jours.`,
      '',
      `Nom : ${values.fullName.trim()}`,
      `Boutique : ${values.shopName.trim()}`,
      `Activité : ${values.business ? businessOf(values.business).label : ''}`,
      `Ville : ${values.city}`,
      `Email : ${values.email.trim()}`,
      ...(values.phone.trim() ? [`Téléphone : +237 ${values.phone}`] : []),
    ].join('\n'),
  );
}

export default function SignupForm() {
  const [values, setValues] = useState<Values>({
    fullName: '',
    shopName: '',
    business: '',
    email: '',
    phone: '',
    city: '',
    password: '',
  });
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<AuthError | null>(null);
  const [handoff, setHandoff] = useState(false);
  const [codeEmail, setCodeEmail] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);

  const errors = validate(values);
  const visibleError = (field: FieldName) => (submitted || touched[field] ? errors[field] : undefined);
  const touch = (field: FieldName) => () => setTouched((current) => ({ ...current, [field]: true }));

  const update = <K extends keyof Values>(field: K, value: Values[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setServerError(null);
  };

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    const firstInvalid = fieldOrder.find((field) => errors[field]);
    if (firstInvalid) {
      document.getElementById(`signup-${firstInvalid}`)?.focus();
      return;
    }

    setPending(true);
    const email = normalizeEmail(values.email)!;
    const result = await signup({
      fullName: values.fullName.trim(),
      shopName: values.shopName.trim(),
      business: values.business as BusinessId,
      email,
      phone: normalizePhone(values.phone) ?? undefined,
      city: values.city,
      password: values.password,
    });
    if (result.ok && result.next === 'app') {
      window.location.assign(site.appUrl);
      return;
    }
    setPending(false);
    if (result.ok && result.next === 'check-email') setConfirmEmail(email);
    else if (result.ok) setCodeEmail(email);
    else if (result.error === 'unavailable') setHandoff(true);
    else setServerError(result.error);
  }

  if (confirmEmail !== null) {
    return (
      <CheckEmailStep
        email={confirmEmail}
        justSent
        backLabel="Modifier mon adresse email"
        onBack={() => {
          setConfirmEmail(null);
          requestAnimationFrame(() => document.getElementById('signup-email')?.focus());
        }}
      />
    );
  }

  if (codeEmail !== null) {
    return (
      <EmailCodeStep
        email={codeEmail}
        cancelLabel="Aller à la page de connexion"
        onVerified={() => window.location.assign(site.appUrl)}
        onCancel={() => window.location.assign(site.loginUrl)}
      />
    );
  }

  if (handoff) {
    return (
      <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-card sm:p-8" role="status">
        <span className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CircleCheck className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-xl font-extrabold text-navy-950">Votre demande est prête</h2>
        <p className="mt-2 leading-relaxed text-navy-500">
          Envoyez-la sur WhatsApp en un clic&nbsp;: notre équipe active votre essai de {site.trialDays} jours et vous
          aide à configurer <strong className="font-semibold text-navy-800">{values.shopName.trim()}</strong>.
        </p>
        <a
          href={whatsappRequest(values)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn mt-6 h-12 w-full bg-[#25d366] text-base text-white hover:brightness-95"
        >
          <WhatsAppIcon className="size-5" />
          Envoyer ma demande sur WhatsApp
        </a>
        <button
          type="button"
          onClick={() => setHandoff(false)}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-navy-600 transition hover:text-navy-900"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Modifier mes informations
        </button>
      </div>
    );
  }

  const strength = passwordStrength(values.password);

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-5">
      {serverError && <FormAlert>{serverMessages[serverError] ?? serverMessages.unknown}</FormAlert>}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="signup-fullName"
          name="fullName"
          label="Nom et prénom"
          autoComplete="name"
          placeholder="Ex. Awa Ngono"
          required
          value={values.fullName}
          error={visibleError('fullName')}
          onChange={(event) => update('fullName', event.target.value)}
          onBlur={touch('fullName')}
        />
        <TextField
          id="signup-shopName"
          name="shopName"
          label="Nom de la boutique"
          autoComplete="organization"
          placeholder="Ex. Boutique Diva"
          required
          value={values.shopName}
          error={visibleError('shopName')}
          onChange={(event) => update('shopName', event.target.value)}
          onBlur={touch('shopName')}
        />
      </div>

      <BusinessPicker
        value={values.business}
        error={visibleError('business')}
        onChange={(business) => update('business', business)}
        onBlur={touch('business')}
      />

      <TextField
        id="signup-email"
        name="email"
        type="email"
        label="Adresse email"
        autoComplete="email"
        inputMode="email"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="Ex. awa@exemple.com"
        required
        value={values.email}
        error={visibleError('email')}
        hint={
          isAuthLive
            ? 'Utilisez une adresse que vous consultez : vous y recevrez le lien qui active votre compte.'
            : undefined
        }
        onChange={(event) => update('email', event.target.value)}
        onBlur={touch('email')}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <PhoneField
          id="signup-phone"
          name="phone"
          label="Téléphone"
          aside={<span className="text-xs text-navy-400">Facultatif</span>}
          value={values.phone}
          error={visibleError('phone')}
          onChange={(event) => update('phone', formatPhone(event.target.value))}
          onBlur={touch('phone')}
        />
        <SelectField
          id="signup-city"
          name="city"
          label="Ville"
          autoComplete="address-level2"
          placeholder="Choisir…"
          options={cities}
          required
          value={values.city}
          error={visibleError('city')}
          onChange={(event) => update('city', event.target.value)}
          onBlur={touch('city')}
        />
      </div>

      {isAuthLive && (
        <div>
          <PasswordField
            id="signup-password"
            name="password"
            label="Mot de passe"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={values.password}
            error={visibleError('password')}
            hint={`${MIN_PASSWORD_LENGTH} caractères minimum, avec des lettres et des chiffres.`}
            onChange={(event) => update('password', event.target.value)}
            onBlur={touch('password')}
          />
          {values.password && (
            <div className="mt-2.5 flex items-center gap-3" aria-live="polite">
              <div className="flex flex-1 gap-1.5" aria-hidden="true">
                {[1, 2, 3].map((level) => (
                  <span
                    key={level}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      strength >= level ? strengthColors[strength] : 'bg-navy-100'
                    }`}
                  />
                ))}
              </div>
              <span className="w-20 text-right text-xs font-semibold text-navy-500">{strengthLabels[strength]}</span>
            </div>
          )}
        </div>
      )}

      {isAuthLive && (
        <p className="flex gap-3 rounded-xl bg-navy-50 px-4 py-3 text-sm leading-relaxed text-navy-600">
          <MailCheck className="mt-0.5 size-4 shrink-0 text-gold-600" aria-hidden="true" />
          <span>
            Après ce formulaire, confirmez votre adresse en ouvrant le lien reçu par email.{' '}
            <strong className="font-semibold text-navy-800">
              Votre tableau de bord s’ouvre seulement une fois l’adresse confirmée.
            </strong>
          </span>
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-gold h-12 w-full text-base disabled:opacity-70">
        {pending ? (
          <>
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            Création du compte…
          </>
        ) : (
          <>
            Démarrer mon essai gratuit
            <ArrowRight className="size-5" aria-hidden="true" />
          </>
        )}
      </button>

      <p className="flex items-center justify-center gap-2 text-xs text-navy-500">
        <LockKeyhole className="size-3.5" aria-hidden="true" />
        Sans carte bancaire · Données chiffrées · Annulable à tout moment
      </p>
    </form>
  );
}

function BusinessPicker({
  value,
  error,
  onChange,
  onBlur,
}: {
  value: BusinessId | '';
  error?: string;
  onChange: (business: BusinessId) => void;
  onBlur: () => void;
}) {
  const describedBy = error ? 'signup-business-error signup-business-hint' : 'signup-business-hint';
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-navy-800">Activité de la boutique</legend>
      <p id="signup-business-hint" className="mt-1 mb-3 text-sm text-navy-500">
        Une boutique, une seule activité. Elle définit vos catégories et ne pourra plus être changée.
      </p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {BUSINESSES.map((business, index) => {
          const Icon = businessIcons[business.id];
          const selected = value === business.id;
          return (
            <label
              key={business.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition has-focus-visible:outline-2 has-focus-visible:outline-gold-400 ${
                selected
                  ? 'border-gold-400 bg-gold-50 ring-1 ring-gold-400'
                  : error
                    ? 'border-red-300 bg-white hover:border-red-400'
                    : 'border-navy-200 bg-white hover:border-navy-300'
              }`}
            >
              <input
                type="radio"
                id={index === 0 ? 'signup-business' : undefined}
                name="business"
                value={business.id}
                checked={selected}
                required
                aria-describedby={describedBy}
                onChange={() => onChange(business.id)}
                onBlur={onBlur}
                className="sr-only"
              />
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-lg transition ${
                  selected ? 'bg-gold-400 text-navy-950' : 'bg-navy-50 text-navy-600'
                }`}
              >
                <Icon className="size-[1.125rem]" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-navy-900">{business.label}</span>
                <span className="mt-0.5 block text-xs leading-snug text-navy-500">{business.examples}</span>
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id="signup-business-error" className="mt-2 flex items-center gap-1.5 text-sm font-medium text-red-600">
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
      <p className="mt-2.5 text-sm text-navy-500">
        Votre activité n’est pas dans la liste&nbsp;?{' '}
        <a
          href={whatsappUrl('Bonjour GOLDSTOCK, mon activité n’est pas dans la liste de l’inscription. Je vends : ')}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-gold-700 hover:text-gold-600"
        >
          Écrivez-nous sur WhatsApp
        </a>
      </p>
    </fieldset>
  );
}
