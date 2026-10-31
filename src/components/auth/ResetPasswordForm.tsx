import { ArrowRight, CircleCheck, LinkIcon, LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { site } from '../../data/site';
import {
  completePasswordRecovery,
  isAuthLive,
  MIN_PASSWORD_LENGTH,
  passwordIssue,
  setRecoveredPassword,
  type ConfirmError,
  type PasswordError,
} from '../../lib/auth';
import { FormAlert, PasswordField } from './fields';

type Phase = 'working' | 'form' | 'done' | { failed: ConfirmError };

const failureText: Record<ConfirmError, { title: string; text: string }> = {
  expired: {
    title: 'Ce lien a expiré',
    text: 'Pour votre sécurité, les liens de réinitialisation ne servent qu’une fois et pendant un temps limité. Demandez-en un nouveau depuis la page de connexion.',
  },
  invalid: {
    title: 'Ce lien ne fonctionne plus',
    text: 'Il a peut-être déjà été utilisé ou a été copié de façon incomplète. Demandez un nouveau lien depuis « Mot de passe oublié ».',
  },
  network: {
    title: 'Connexion impossible',
    text: 'Impossible de joindre GOLDSTOCK. Vérifiez votre connexion internet puis rouvrez le lien reçu par email.',
  },
  unknown: {
    title: 'La réinitialisation a échoué',
    text: 'Une erreur est survenue. Rouvrez le lien reçu par email, ou demandez-en un nouveau.',
  },
};

const passwordErrors: Record<PasswordError, string> = {
  'wrong-password': 'Mot de passe actuel incorrect.',
  'same-password': 'Choisissez un mot de passe différent de l’actuel.',
  'weak-password': `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`,
  'rate-limited': 'Trop de tentatives. Patientez quelques minutes puis réessayez.',
  network: 'Impossible de joindre GOLDSTOCK. Vérifiez votre connexion internet puis réessayez.',
  unknown: 'Le mot de passe n’a pas pu être enregistré. Réessayez dans un instant.',
};

/** Opens the recovery session from the email link, then lets the owner set a new password. */
export default function ResetPasswordForm() {
  const [phase, setPhase] = useState<Phase>('working');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<PasswordError | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void completePasswordRecovery().then((result) => {
      if (!result.ok) setPhase({ failed: result.error });
      else setPhase('form');
    });
  }, []);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: typeof errors = {};
    const issue = passwordIssue(password);
    if (issue === 'empty') next.password = 'Entrez un nouveau mot de passe.';
    else if (issue === 'short') next.password = `Au moins ${MIN_PASSWORD_LENGTH} caractères.`;
    if (!confirm) next.confirm = 'Confirmez le nouveau mot de passe.';
    else if (confirm !== password) next.confirm = 'Les deux mots de passe ne sont pas identiques.';
    setErrors(next);
    setServerError(null);
    if (next.password || next.confirm) {
      document.getElementById(next.password ? 'reset-password' : 'reset-confirm')?.focus();
      return;
    }

    setPending(true);
    const result = await setRecoveredPassword(password);
    setPending(false);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    setPhase('done');
  }

  if (typeof phase === 'object' && 'failed' in phase) {
    const { title, text } = failureText[phase.failed];
    return (
      <div className="space-y-5">
        <div>
          <span className="grid size-12 place-items-center rounded-2xl bg-red-50 text-red-600">
            <LinkIcon className="size-6" aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-xl font-extrabold text-navy-950">{title}</h2>
          <p className="mt-2 leading-relaxed text-navy-500">{text}</p>
        </div>
        <a href={site.loginUrl} className="btn-gold inline-flex h-12 w-full text-base">
          Retour à la connexion
          <ArrowRight className="size-5" aria-hidden="true" />
        </a>
      </div>
    );
  }

  if (phase === 'working') {
    return (
      <div className="space-y-4" role="status" aria-live="polite">
        <span className="grid size-12 place-items-center rounded-2xl bg-gold-50 text-gold-700">
          <LoaderCircle className="size-6 animate-spin" aria-hidden="true" />
        </span>
        <h2 className="text-xl font-extrabold text-navy-950">Vérification du lien…</h2>
        <p className="leading-relaxed text-navy-500">Un instant, nous préparons la réinitialisation.</p>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="space-y-5">
        <div>
          <span className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CircleCheck className="size-6" aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-xl font-extrabold text-navy-950">Mot de passe mis à jour</h2>
          <p className="mt-2 leading-relaxed text-navy-500">
            Vous pouvez vous connecter avec votre nouveau mot de passe. Les autres appareils ont été déconnectés.
          </p>
        </div>
        <a href={site.loginUrl} className="btn-gold inline-flex h-12 w-full text-base">
          Se connecter
          <ArrowRight className="size-5" aria-hidden="true" />
        </a>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-navy-950">Nouveau mot de passe</h2>
        <p className="mt-2 leading-relaxed text-navy-500">
          Choisissez un mot de passe d’au moins {MIN_PASSWORD_LENGTH} caractères pour protéger votre boutique.
        </p>
      </div>

      {!isAuthLive && (
        <FormAlert tone="info">Version de test&nbsp;: le nouveau mot de passe n’est pas enregistré en ligne.</FormAlert>
      )}
      {serverError && <FormAlert>{passwordErrors[serverError]}</FormAlert>}

      <PasswordField
        id="reset-password"
        name="password"
        label="Nouveau mot de passe"
        autoComplete="new-password"
        required
        value={password}
        error={errors.password}
        onChange={(event) => {
          setPassword(event.target.value);
          setErrors((current) => ({ ...current, password: undefined }));
          setServerError(null);
        }}
      />
      <PasswordField
        id="reset-confirm"
        name="confirm"
        label="Confirmer le mot de passe"
        autoComplete="new-password"
        required
        value={confirm}
        error={errors.confirm}
        onChange={(event) => {
          setConfirm(event.target.value);
          setErrors((current) => ({ ...current, confirm: undefined }));
        }}
      />

      <button type="submit" disabled={pending} className="btn-gold h-12 w-full text-base disabled:opacity-70">
        {pending ? (
          <>
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            Enregistrement…
          </>
        ) : (
          <>
            Enregistrer le mot de passe
            <ArrowRight className="size-5" aria-hidden="true" />
          </>
        )}
      </button>
    </form>
  );
}
