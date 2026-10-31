import { ArrowLeft, ArrowRight, CircleCheck, LoaderCircle } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { site } from '../../data/site';
import { isAuthLive, normalizeEmail, requestPasswordReset, type ResendError } from '../../lib/auth';
import { FormAlert, TextField } from './fields';

const resendMessages: Record<ResendError, string> = {
  'rate-limited': 'Trop d’emails demandés. Patientez quelques minutes avant de réessayer.',
  network: 'Impossible de joindre GOLDSTOCK. Vérifiez votre connexion internet puis réessayez.',
  unknown: 'L’email n’a pas pu être envoyé. Réessayez dans un instant.',
};

/** Asks for the account email and sends the Supabase recovery link (ADR 0010). */
export function ForgotPasswordForm({ initialEmail = '', onBack }: { initialEmail?: string; onBack: () => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<ResendError | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeEmail(email);
    if (!normalized) {
      setFieldError(email.trim() ? 'Adresse email invalide. Ex. awa@exemple.com' : 'Entrez votre adresse email.');
      document.getElementById('forgot-email')?.focus();
      return;
    }
    setPending(true);
    setServerError(null);
    const result = await requestPasswordReset(normalized);
    setPending(false);
    if (result.ok) setSentTo(normalized);
    else setServerError(result.error);
  }

  if (sentTo) {
    return (
      <div className="space-y-5">
        <div>
          <span className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CircleCheck className="size-6" aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-xl font-extrabold text-navy-950">Vérifiez votre boîte mail</h2>
          <p className="mt-2 leading-relaxed text-navy-500">
            Si un compte existe pour <span className="font-semibold text-navy-800">{sentTo}</span>, un lien pour choisir
            un nouveau mot de passe vient d’être envoyé. Le lien ne sert qu’une fois et expire rapidement.
          </p>
        </div>
        {!isAuthLive && (
          <FormAlert tone="info">
            Version de test&nbsp;: aucun email n’est envoyé. Ouvrez{' '}
            <a href={site.resetPasswordUrl} className="font-semibold underline">
              la page de réinitialisation
            </a>{' '}
            pour simuler la suite.
          </FormAlert>
        )}
        <button type="button" className="btn-quiet h-12 w-full text-base" onClick={onBack}>
          <ArrowLeft className="size-5" aria-hidden="true" />
          Retour à la connexion
        </button>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-navy-950">Mot de passe oublié</h2>
        <p className="mt-2 leading-relaxed text-navy-500">
          Indiquez l’adresse email de votre compte. Nous vous enverrons un lien pour en choisir un nouveau.
        </p>
      </div>

      {serverError && <FormAlert>{resendMessages[serverError]}</FormAlert>}

      <TextField
        id="forgot-email"
        name="email"
        type="email"
        label="Adresse email"
        autoComplete="username"
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
          setServerError(null);
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
            Envoyer le lien
            <ArrowRight className="size-5" aria-hidden="true" />
          </>
        )}
      </button>

      <button type="button" className="btn-quiet h-11 w-full text-sm" onClick={onBack}>
        <ArrowLeft className="size-4" aria-hidden="true" />
        Retour à la connexion
      </button>
    </form>
  );
}
