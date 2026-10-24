import { ArrowRight, CircleCheck, LinkIcon, LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { site } from '../../data/site';
import {
  completeEmailConfirmation,
  isAuthLive,
  normalizeEmail,
  resendConfirmation,
  type ConfirmError,
  type ResendError,
} from '../../lib/auth';
import { CheckEmailStep } from './CheckEmailStep';
import { FormAlert, TextField } from './fields';

type State = { step: 'working' } | { step: 'done' } | { step: 'failed'; error: ConfirmError };

const failureText: Record<ConfirmError, { title: string; text: string }> = {
  expired: {
    title: 'Ce lien a expiré',
    text: 'Pour votre sécurité, les liens de confirmation ne servent qu’une fois et pendant un temps limité. Recevez-en un nouveau ci-dessous.',
  },
  invalid: {
    title: 'Ce lien ne fonctionne plus',
    text: 'Il a peut-être déjà été utilisé ou a été copié de façon incomplète. Si votre adresse est déjà confirmée, connectez-vous. Sinon, recevez un nouveau lien.',
  },
  network: {
    title: 'Connexion impossible',
    text: 'Impossible de joindre GOLDSTOCK. Vérifiez votre connexion internet puis rouvrez le lien reçu par email.',
  },
  unknown: {
    title: 'La confirmation a échoué',
    text: 'Une erreur est survenue. Rouvrez le lien reçu par email, ou recevez-en un nouveau.',
  },
};

const resendMessages: Record<ResendError, string> = {
  'rate-limited': 'Trop d’emails demandés. Patientez quelques minutes avant de réessayer.',
  network: 'Impossible de joindre GOLDSTOCK. Vérifiez votre connexion internet puis réessayez.',
  unknown: 'L’email n’a pas pu être envoyé. Réessayez dans un instant.',
};

export default function EmailConfirmation() {
  const [state, setState] = useState<State>({ step: 'working' });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!isAuthLive) {
      window.location.replace(site.appUrl);
      return;
    }
    void completeEmailConfirmation().then((result) => {
      if (!result.ok) {
        setState({ step: 'failed', error: result.error });
        return;
      }
      setState({ step: 'done' });
      // With the emailed code back on, the login page asks for it before the merchant space.
      window.location.replace(result.next === 'app' ? site.appUrl : site.loginUrl);
    });
  }, []);

  if (state.step === 'failed') return <ConfirmationFailed error={state.error} />;

  const done = state.step === 'done';
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <span
        className={`grid size-12 place-items-center rounded-2xl ${done ? 'bg-emerald-50 text-emerald-600' : 'bg-gold-50 text-gold-700'}`}
      >
        {done ? (
          <CircleCheck className="size-6" aria-hidden="true" />
        ) : (
          <LoaderCircle className="size-6 animate-spin" aria-hidden="true" />
        )}
      </span>
      <h2 className="text-xl font-extrabold text-navy-950">
        {done ? 'Adresse confirmée' : 'Confirmation de votre adresse…'}
      </h2>
      <p className="leading-relaxed text-navy-500">
        {done ? 'Bienvenue sur GOLDSTOCK. Ouverture de votre boutique…' : 'Un instant, nous activons votre compte.'}
      </p>
    </div>
  );
}

function ConfirmationFailed({ error }: { error: ConfirmError }) {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const [resendError, setResendError] = useState<ResendError | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { title, text } = failureText[error];

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeEmail(email);
    if (!normalized) {
      setFieldError(email.trim() ? 'Adresse email invalide. Ex. awa@exemple.com' : 'Entrez votre adresse email.');
      document.getElementById('confirm-email')?.focus();
      return;
    }
    setPending(true);
    setResendError(null);
    const result = await resendConfirmation(normalized);
    setPending(false);
    if (result.ok) setSentTo(normalized);
    else setResendError(result.error);
  }

  if (sentTo !== null)
    return (
      <CheckEmailStep
        email={sentTo}
        justSent
        backLabel="Aller à la page de connexion"
        onBack={() => window.location.assign(site.loginUrl)}
      />
    );

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-5">
      <div>
        <span className="grid size-12 place-items-center rounded-2xl bg-red-50 text-red-600">
          <LinkIcon className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-xl font-extrabold text-navy-950">{title}</h2>
        <p className="mt-2 leading-relaxed text-navy-500">{text}</p>
      </div>

      {resendError && <FormAlert>{resendMessages[resendError]}</FormAlert>}

      <TextField
        id="confirm-email"
        name="email"
        type="email"
        label="Adresse email du compte"
        autoComplete="email"
        inputMode="email"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="Ex. awa@exemple.com"
        required
        value={email}
        error={fieldError}
        onChange={(event) => {
          setEmail(event.target.value);
          setFieldError(undefined);
          setResendError(null);
        }}
      />

      <button type="submit" disabled={pending} className="btn-gold h-12 w-full text-base disabled:opacity-70">
        {pending ? (
          <>
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            Envoi…
          </>
        ) : (
          <>
            Recevoir un nouveau lien
            <ArrowRight className="size-5" aria-hidden="true" />
          </>
        )}
      </button>

      <p className="text-center text-sm text-navy-500">
        Adresse déjà confirmée&nbsp;?{' '}
        <a href={site.loginUrl} className="font-semibold text-gold-700 hover:text-gold-600">
          Se connecter
        </a>
      </p>
    </form>
  );
}
