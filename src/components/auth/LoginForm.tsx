import { ArrowRight, LoaderCircle } from 'lucide-react';
import { useEffect, useState, type ReactNode, type SubmitEvent } from 'react';
import { site, whatsappUrl } from '../../data/site';
import { getAuthState, isAuthLive, login, normalizeEmail, type AuthError } from '../../lib/auth';
import { CheckEmailStep } from './CheckEmailStep';
import { EmailCodeStep } from './EmailCodeStep';
import { FormAlert, PasswordField, TextField } from './fields';

type Values = { email: string; password: string; remember: boolean };
type Errors = Partial<Record<'email' | 'password', string>>;

const validate = ({ email, password }: Values): Errors => {
  const errors: Errors = {};
  if (!email.trim()) errors.email = 'Entrez votre adresse email.';
  else if (!normalizeEmail(email)) errors.email = 'Adresse email invalide. Ex. awa@exemple.com';
  if (!password) errors.password = 'Entrez votre mot de passe.';
  return errors;
};

const supportLink = (message: string) => (
  <a href={whatsappUrl(message)} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
    Contactez-nous sur WhatsApp
  </a>
);

const serverMessages: Partial<Record<AuthError, ReactNode>> = {
  'invalid-credentials': 'Email ou mot de passe incorrect.',
  'rate-limited': 'Trop de tentatives de connexion. Patientez quelques minutes puis réessayez.',
  unavailable: (
    <>
      La connexion est momentanément indisponible.{' '}
      {supportLink("Bonjour, je n'arrive pas à me connecter à mon compte GOLDSTOCK.")} si cela continue.
    </>
  ),
  network: 'Impossible de joindre GOLDSTOCK. Vérifiez votre connexion internet puis réessayez.',
  unknown: 'Une erreur est survenue. Réessayez dans un instant.',
};

export default function LoginForm() {
  const [values, setValues] = useState<Values>({ email: '', password: '', remember: true });
  const [touched, setTouched] = useState<Partial<Record<keyof Errors, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<AuthError | null>(null);
  /** Set once the password is accepted: the emailed code is the second step. */
  const [codeEmail, setCodeEmail] = useState<string | null>(null);
  /** Set when the password is right but the address was never confirmed. */
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthLive) return;
    getAuthState().then((state) => {
      if (state.status === 'granted') window.location.replace(site.appUrl);
      else if (state.status === 'confirm-email') setConfirmEmail(state.email);
      else if (state.status === 'verify') setCodeEmail(state.email);
    });
  }, []);

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
    const email = normalizeEmail(values.email)!;
    const result = await login({ email, password: values.password, remember: values.remember });
    if (result.ok && result.next === 'app') {
      window.location.assign(site.appUrl);
      return;
    }
    setPending(false);
    if (result.ok && result.next === 'check-email') setConfirmEmail(email);
    else if (result.ok) setCodeEmail(email);
    else setServerError(result.error);
  }

  if (confirmEmail !== null) {
    return (
      <CheckEmailStep
        email={confirmEmail}
        justSent={false}
        backLabel="Retour à la connexion"
        onBack={() => {
          setConfirmEmail(null);
          update('password', '');
        }}
      />
    );
  }

  if (codeEmail !== null) {
    return (
      <EmailCodeStep
        email={codeEmail}
        cancelLabel="Retour à la connexion"
        onVerified={() => window.location.assign(site.appUrl)}
        onCancel={() => {
          setCodeEmail(null);
          update('password', '');
        }}
      />
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-5">
      {!isAuthLive && !serverError && (
        <FormAlert tone="info">
          Version de test&nbsp;: entrez n’importe quel email valide et un mot de passe pour ouvrir le{' '}
          <a href={site.appUrl} className="font-semibold underline">
            tableau de bord de démonstration
          </a>
          .
        </FormAlert>
      )}
      {serverError && <FormAlert>{serverMessages[serverError] ?? serverMessages.unknown}</FormAlert>}

      <TextField
        id="login-email"
        name="email"
        type="email"
        label="Adresse email"
        autoComplete="username"
        inputMode="email"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="Ex. awa@exemple.com"
        required
        value={values.email}
        error={visibleError('email')}
        onChange={(event) => update('email', event.target.value)}
        onBlur={() => setTouched((current) => ({ ...current, email: true }))}
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
