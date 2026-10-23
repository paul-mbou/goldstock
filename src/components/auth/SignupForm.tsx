import { ArrowLeft, ArrowRight, CircleCheck, LoaderCircle, LockKeyhole } from 'lucide-react';
import { useEffect, useState, type SubmitEvent, type ReactNode } from 'react';
import {
  cities,
  FREE_MONTHS_PER_YEAR,
  formatFcfa,
  plans,
  site,
  whatsappUrl,
  yearlyPerMonth,
  type Billing,
} from '../../data/site';
import {
  formatPhone,
  isApiConfigured,
  MIN_PASSWORD_LENGTH,
  normalizePhone,
  signup,
  type AuthError,
} from '../../lib/auth';
import { WhatsAppIcon } from '../brand/WhatsAppIcon';
import { FormAlert, PasswordField, PhoneField, SelectField, TextField } from './fields';

type Values = {
  fullName: string;
  shopName: string;
  phone: string;
  city: string;
  password: string;
  plan: string;
  billing: Billing;
};

type FieldName = 'fullName' | 'shopName' | 'phone' | 'city' | 'password';
type Errors = Partial<Record<FieldName, string>>;

const fieldOrder: FieldName[] = ['fullName', 'shopName', 'phone', 'city', 'password'];

const validate = (values: Values): Errors => {
  const errors: Errors = {};
  if (values.fullName.trim().length < 2) errors.fullName = 'Entrez votre nom et prénom.';
  if (values.shopName.trim().length < 2) errors.shopName = 'Entrez le nom de votre boutique.';
  if (!values.phone.trim()) errors.phone = 'Entrez votre numéro de téléphone.';
  else if (!normalizePhone(values.phone)) errors.phone = 'Numéro invalide : 9 chiffres, commençant par 6 ou 2.';
  if (!values.city) errors.city = 'Choisissez votre ville.';
  if (isApiConfigured && values.password.length < MIN_PASSWORD_LENGTH)
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
  'phone-taken': (
    <>
      Un compte existe déjà avec ce numéro.{' '}
      <a href={site.loginUrl} className="font-semibold underline">
        Se connecter
      </a>
    </>
  ),
  network: 'Impossible de joindre GOLDSTOCK. Vérifiez votre connexion internet puis réessayez.',
  unknown: 'Une erreur est survenue. Réessayez dans un instant.',
};

const billingLabel = (billing: Billing) => (billing === 'yearly' ? 'annuelle' : 'mensuelle');

function whatsappRequest(values: Values) {
  const plan = plans.find((item) => item.id === values.plan);
  return whatsappUrl(
    [
      `Bonjour GOLDSTOCK, je souhaite démarrer mon essai gratuit de ${site.trialDays} jours.`,
      '',
      `Nom : ${values.fullName.trim()}`,
      `Boutique : ${values.shopName.trim()}`,
      `Ville : ${values.city}`,
      `Téléphone : +237 ${values.phone}`,
      `Formule : ${plan?.name ?? values.plan} (facturation ${billingLabel(values.billing)})`,
    ].join('\n'),
  );
}

export default function SignupForm() {
  const [values, setValues] = useState<Values>({
    fullName: '',
    shopName: '',
    phone: '',
    city: '',
    password: '',
    plan: plans.find((plan) => plan.highlighted)?.id ?? plans[0].id,
    billing: 'monthly',
  });
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<AuthError | null>(null);
  const [handoff, setHandoff] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get('formule');
    const billing = params.get('facturation');
    setValues((current) => ({
      ...current,
      plan: plans.some((item) => item.id === plan) ? plan! : current.plan,
      billing: billing === 'yearly' || billing === 'monthly' ? billing : current.billing,
    }));
  }, []);

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

    if (!isApiConfigured) {
      setHandoff(true);
      return;
    }

    setPending(true);
    const result = await signup({
      ...values,
      fullName: values.fullName.trim(),
      shopName: values.shopName.trim(),
      phone: normalizePhone(values.phone)!,
    });
    if (result.ok) {
      window.location.assign(result.redirectUrl);
      return;
    }
    setPending(false);
    if (result.error === 'unavailable') setHandoff(true);
    else setServerError(result.error);
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

      <div className="grid gap-5 sm:grid-cols-2">
        <PhoneField
          id="signup-phone"
          name="phone"
          label="Téléphone"
          required
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

      {isApiConfigured && (
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

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-navy-800">Formule après l’essai</legend>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {plans.map((plan) => {
            const price = values.billing === 'yearly' ? yearlyPerMonth(plan.monthlyPrice) : plan.monthlyPrice;
            const selected = values.plan === plan.id;
            return (
              <label
                key={plan.id}
                className={`relative flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 transition has-focus-visible:outline-2 has-focus-visible:outline-gold-400 sm:block sm:p-3.5 ${
                  selected
                    ? 'border-gold-400 bg-gold-50 ring-1 ring-gold-400'
                    : 'border-navy-200 bg-white hover:border-navy-300'
                }`}
              >
                <input
                  type="radio"
                  name="plan"
                  value={plan.id}
                  checked={selected}
                  onChange={() => update('plan', plan.id)}
                  className="sr-only"
                />
                <span className="block text-sm font-bold text-navy-900">{plan.name}</span>
                <span className="block text-sm text-navy-500 sm:mt-0.5 sm:text-xs">
                  {formatFcfa(price)}
                  <span className="sr-only"> par mois</span>
                  <span aria-hidden="true">/mois</span>
                </span>
                {plan.highlighted && (
                  <span className="absolute -top-2 left-3 rounded-full sm:right-2 sm:left-auto bg-navy-950 px-1.5 py-px text-[0.625rem] font-bold text-gold-300">
                    Populaire
                  </span>
                )}
              </label>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-navy-600">
          {(['monthly', 'yearly'] as const).map((billing) => (
            <label key={billing} className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="billing"
                value={billing}
                checked={values.billing === billing}
                onChange={() => update('billing', billing)}
                className="size-4 accent-gold-500"
              />
              {billing === 'monthly' ? 'Mensuel' : 'Annuel'}
              {billing === 'yearly' && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                  {FREE_MONTHS_PER_YEAR} mois offerts
                </span>
              )}
            </label>
          ))}
        </div>
        <p className="mt-3 text-sm text-navy-500">
          Rien à payer pendant {site.trialDays} jours. Vous décidez de continuer ou non à la fin de l’essai.
        </p>
      </fieldset>

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
