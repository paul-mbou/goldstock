import {
  ArrowLeft,
  Check,
  ExternalLink,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MailCheck,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { site } from '../../data/site';
import { getAuthState, resendConfirmation, type ResendError } from '../../lib/auth';
import { FormAlert } from './fields';

const RESEND_COOLDOWN_SECONDS = 60;

type StepState = 'done' | 'current' | 'locked';

const steps: { label: string; state: StepState; Icon: LucideIcon }[] = [
  { label: 'Compte créé', state: 'done', Icon: Check },
  { label: 'Adresse email confirmée', state: 'current', Icon: Mail },
  { label: 'Accès au tableau de bord', state: 'locked', Icon: LockKeyhole },
];

const stateLabels: Record<StepState, string> = {
  done: 'Fait',
  current: 'En attente',
  locked: 'Après confirmation',
};

const stateColors: Record<StepState, string> = {
  done: 'text-emerald-700',
  current: 'text-gold-700',
  locked: 'text-navy-400',
};

const resendMessages: Record<ResendError, string> = {
  'rate-limited': 'Trop d’emails demandés. Patientez quelques minutes avant de réessayer.',
  network: 'Impossible de joindre GOLDSTOCK. Vérifiez votre connexion internet puis réessayez.',
  unknown: 'L’email n’a pas pu être renvoyé. Réessayez dans un instant.',
};

const webmails: { pattern: RegExp; label: string; url: string }[] = [
  { pattern: /^(gmail|googlemail)\.com$/, label: 'Ouvrir Gmail', url: 'https://mail.google.com/mail/u/0/#inbox' },
  { pattern: /^(outlook|hotmail|live|msn)\./, label: 'Ouvrir Outlook', url: 'https://outlook.live.com/mail/' },
  { pattern: /^(yahoo\.|ymail\.com$)/, label: 'Ouvrir Yahoo Mail', url: 'https://mail.yahoo.com/' },
  { pattern: /^(icloud|me|mac)\.com$/, label: 'Ouvrir iCloud Mail', url: 'https://www.icloud.com/mail' },
];

const webmailOf = (email: string) => {
  const domain = email.split('@')[1] ?? '';
  return webmails.find((webmail) => webmail.pattern.test(domain));
};

type Props = {
  email: string;
  /** False when the user arrives from the login form: the link may have been sent long ago. */
  justSent: boolean;
  onBack: () => void;
  backLabel: string;
};

export function CheckEmailStep({ email, justSent, onBack, backLabel }: Props) {
  const [cooldown, setCooldown] = useState(justSent ? RESEND_COOLDOWN_SECONDS : 0);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<ResendError | null>(null);
  const webmail = webmailOf(email);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Link opened in another tab of this browser: the session lands in shared storage.
  useEffect(() => {
    const onStorage = () =>
      void getAuthState().then((state) => {
        if (state.status === 'granted') window.location.assign(site.appUrl);
      });
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  async function resend() {
    setSending(true);
    setError(null);
    setNotice(null);
    const result = await resendConfirmation(email);
    setSending(false);
    if (result.ok) {
      setNotice('Nouveau lien envoyé. Utilisez le plus récent.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } else {
      setError(result.error);
      if (result.error === 'rate-limited') setCooldown(RESEND_COOLDOWN_SECONDS);
    }
  }

  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <div>
        <span className="grid size-12 place-items-center rounded-2xl bg-gold-50 text-gold-700">
          <MailCheck className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-xl font-extrabold text-navy-950">Confirmez votre adresse email</h2>
        <p className="mt-2 leading-relaxed text-navy-500">
          {justSent
            ? 'Nous venons d’envoyer un lien de confirmation à '
            : 'Votre adresse n’est pas encore confirmée. Le lien a été envoyé à '}
          <strong className="font-semibold wrap-anywhere text-navy-800">{email}</strong>. Ouvrez-le&nbsp;: votre compte
          s’active et votre boutique s’ouvre automatiquement.
        </p>
      </div>

      <ol className="grid gap-2 text-sm" aria-label="Étapes d’activation">
        {steps.map(({ label, state, Icon }) => (
          <li
            key={label}
            className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${
              state === 'current' ? 'border-gold-300 bg-gold-50' : 'border-navy-100'
            }`}
          >
            <span
              className={`grid size-7 shrink-0 place-items-center rounded-full ${
                state === 'done'
                  ? 'bg-emerald-50 text-emerald-600'
                  : state === 'current'
                    ? 'bg-gold-400 text-navy-950'
                    : 'bg-navy-50 text-navy-400'
              }`}
            >
              <Icon className="size-3.5" aria-hidden="true" />
            </span>
            <span className={`flex-1 font-semibold ${state === 'locked' ? 'text-navy-400' : 'text-navy-800'}`}>
              {label}
            </span>
            <span className={`text-xs font-medium ${stateColors[state]}`}>{stateLabels[state]}</span>
          </li>
        ))}
      </ol>

      {error && <FormAlert>{resendMessages[error]}</FormAlert>}
      {notice && !error && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{notice}</p>
      )}

      {webmail && (
        <a href={webmail.url} target="_blank" rel="noopener noreferrer" className="btn-gold h-12 w-full text-base">
          {webmail.label}
          <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      )}

      <ul className="space-y-1.5 rounded-xl bg-navy-50 px-4 py-3 text-sm leading-relaxed text-navy-600">
        <li>L’email vient de GOLDSTOCK et peut mettre une minute à arriver.</li>
        <li>Pas dans la boîte de réception&nbsp;? Regardez dans les spams ou l’onglet Promotions.</li>
        <li>Vous pouvez ouvrir le lien sur votre téléphone ou sur cet ordinateur.</li>
      </ul>

      <p className="text-center text-sm text-navy-500">
        Rien reçu&nbsp;?{' '}
        {cooldown > 0 ? (
          <span className="font-semibold text-navy-400">Renvoyer le lien dans {cooldown}&nbsp;s</span>
        ) : (
          <button
            type="button"
            disabled={sending}
            onClick={() => void resend()}
            className="inline-flex items-center gap-1.5 font-semibold text-gold-700 underline-offset-2 hover:text-gold-600 hover:underline disabled:opacity-60"
          >
            {sending && <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />}
            Renvoyer le lien
          </button>
        )}
      </p>

      <button
        type="button"
        onClick={onBack}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-navy-600 transition hover:text-navy-900"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {backLabel}
      </button>
    </div>
  );
}
