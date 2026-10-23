import { ArrowRight, LoaderCircle } from 'lucide-react';
import { useState, type SubmitEvent, type ReactNode } from 'react';
import { site, whatsappUrl } from '../../data/site';
import { formatPhone, isApiConfigured, login, normalizePhone, type AuthError } from '../../lib/auth';
import { FormAlert, PasswordField, PhoneField } from './fields';

type Values = { phone: string; password: string; remember: boolean };
type Errors = Partial<Record<'phone' | 'password', string>>;

const validate = ({ phone, password }: Values): Errors => {
  const errors: Errors = {};
  if (!phone.trim()) errors.phone = 'Entrez votre numéro de téléphone.';
  else if (!normalizePhone(phone)) errors.phone = 'Numéro invalide : 9 chiffres, commençant par 6 ou 2.';
  if (!password) errors.password = 'Entrez votre mot de passe.';
  return errors;
};

const supportLink = (message: string) => (
  <a href={whatsappUrl(message)} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
    Contactez-nous sur WhatsApp
  </a>
);

const serverMessages: Record<AuthError, ReactNode> = {
  'invalid-credentials': 'Numéro de téléphone ou mot de passe incorrect.',
  'phone-taken': 'Une erreur est survenue. Réessayez dans un instant.',
  unavailable: (
    <>
      La connexion en ligne ouvre très bientôt. {supportLink("Bonjour, j'ai besoin d'accéder à mon compte GOLDSTOCK.")}{' '}
      et notre équipe vous donne accès à votre espace.
    </>
  ),
  network: 'Impossible de joindre GOLDSTOCK. Vérifiez votre connexion internet puis réessayez.',
  unknown: 'Une erreur est survenue. Réessayez dans un instant.',
};

export default function LoginForm() {
  const [values, setValues] = useState<Values>({ phone: '', password: '', remember: true });
  const [touched, setTouched] = useState<Partial<Record<keyof Errors, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<AuthError | null>(null);

  const errors = validate(values);
  const visibleError = (field: keyof Errors) => (submitted || touched[field] ? errors[field] : undefined);

  const update = <K extends keyof Values>(field: K, value: Values[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setServerError(null);
  };

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    const firstInvalid = (Object.keys(errors) as (keyof Errors)[])[0];
    if (firstInvalid) {
      document.getElementById(`login-${firstInvalid}`)?.focus();
      return;
    }

    setPending(true);
    const result = await login({ ...values, phone: normalizePhone(values.phone)! });
    if (result.ok) {
      window.location.assign(result.redirectUrl);
      return;
    }
    setPending(false);
    setServerError(result.error);
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-5">
      {!isApiConfigured && !serverError && (
        <FormAlert tone="info">
          La connexion en ligne ouvre très bientôt. Vous n’avez pas encore de compte&nbsp;?{' '}
          <a href={site.signupUrl} className="font-semibold underline">
            Demandez votre essai gratuit
          </a>{' '}
          ou{' '}
          <a href={site.appUrl} className="font-semibold underline">
            découvrez le tableau de bord de démonstration
          </a>
          .
        </FormAlert>
      )}
      {serverError && <FormAlert>{serverMessages[serverError]}</FormAlert>}

      <PhoneField
        id="login-phone"
        name="phone"
        label="Numéro de téléphone"
        required
        value={values.phone}
        error={visibleError('phone')}
        onChange={(event) => update('phone', formatPhone(event.target.value))}
        onBlur={() => setTouched((current) => ({ ...current, phone: true }))}
      />

      <PasswordField
        id="login-password"
        name="password"
        label="Mot de passe"
        autoComplete="current-password"
        required
        value={values.password}
        error={visibleError('password')}
        onChange={(event) => update('password', event.target.value)}
        onBlur={() => setTouched((current) => ({ ...current, password: true }))}
        aside={
          <a
            href={whatsappUrl("Bonjour, j'ai oublié mon mot de passe GOLDSTOCK.")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-gold-700 hover:text-gold-600"
          >
            Mot de passe oublié&nbsp;?
          </a>
        }
      />

      <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm text-navy-600">
        <input
          type="checkbox"
          name="remember"
          checked={values.remember}
          onChange={(event) => update('remember', event.target.checked)}
          className="size-4 rounded accent-gold-500"
        />
        Rester connecté sur cet appareil
      </label>

      <button type="submit" disabled={pending} className="btn-gold h-12 w-full text-base disabled:opacity-70">
        {pending ? (
          <>
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            Connexion…
          </>
        ) : (
          <>
            Se connecter
            <ArrowRight className="size-5" aria-hidden="true" />
          </>
        )}
      </button>
    </form>
  );
}
