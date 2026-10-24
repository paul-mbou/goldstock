import { ArrowLeft, ArrowRight, LoaderCircle, MailCheck } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode, type SubmitEvent } from 'react';
import { sendEmailCode, signOut, verifyEmailCode, type CodeError } from '../../lib/auth';
import { FormAlert, TextField } from './fields';

const CODE_LENGTH = 6;

const codeMessages: Record<CodeError, string> = {
  'invalid-code': 'Code incorrect. Vérifiez les 6 chiffres reçus par email.',
  expired: 'Ce code a expiré. Demandez-en un nouveau.',
  'too-many-attempts': 'Trop d’essais avec ce code. Demandez-en un nouveau.',
  'rate-limited': 'Trop de codes demandés. Patientez avant d’en redemander un.',
  'email-failed': 'L’email n’a pas pu être envoyé. Réessayez dans un instant.',
  'not-signed-in': 'Votre session a expiré. Reconnectez-vous.',
  network: 'Impossible de joindre GOLDSTOCK. Vérifiez votre connexion internet puis réessayez.',
  unknown: 'Une erreur est survenue. Réessayez dans un instant.',
};

type Props = {
  email: string;
  onVerified: () => void;
  /** Back to the previous form, after the half-open session has been signed out. */
  onCancel: () => void;
  cancelLabel: string;
};

export function EmailCodeStep({ email, onVerified, onCancel, cancelLabel }: Props) {
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [notice, setNotice] = useState<ReactNode>(null);
  const [error, setError] = useState<CodeError | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const sentOnce = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function send(first: boolean) {
    setSending(true);
    setError(null);
    setNotice(null);
    const result = await sendEmailCode();
    setSending(false);
    if (result.ok) {
      setCooldown(result.retryAfter ?? 60);
      if (!first) setNotice('Nouveau code envoyé. Le précédent ne fonctionne plus.');
    } else if (result.error === 'rate-limited') {
      setCooldown(result.retryAfter ?? 60);
      // A code sent moments ago (page reloaded, or the user came back) is still valid.
      if (first) setNotice('Un code vous a déjà été envoyé il y a quelques instants.');
      else setError('rate-limited');
    } else if (result.error === 'not-signed-in') {
      await cancel();
      return;
    } else {
      setError(result.error);
    }
    inputRef.current?.focus();
  }

  useEffect(() => {
    if (sentOnce.current) return;
    sentOnce.current = true;
    void send(true);
  }, []);

  async function cancel() {
    await signOut();
    onCancel();
  }

  async function verify(value: string) {
    if (verifying) return;
    setVerifying(true);
    setError(null);
    setNotice(null);
    const result = await verifyEmailCode(value);
    if (result.ok) {
      onVerified();
      return;
    }
    setVerifying(false);
    if (result.error === 'not-signed-in') {
      await cancel();
      return;
    }
    setError(result.error);
    setAttemptsLeft(result.attemptsLeft ?? null);
    if (result.error !== 'invalid-code') setCode('');
    inputRef.current?.select();
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.length === CODE_LENGTH) void verify(code);
    else {
      setError('invalid-code');
      inputRef.current?.focus();
    }
  }

  const fieldError =
    error === 'invalid-code'
      ? codeMessages['invalid-code'] +
      (attemptsLeft
        ? ` ${attemptsLeft} essai${attemptsLeft > 1 ? 's' : ''} restant${attemptsLeft > 1 ? 's' : ''}.`
        : '')
      : undefined;
  const alert = error && error !== 'invalid-code' ? codeMessages[error] : null;

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-5" aria-busy={sending || verifying}>
      <div>
        <span className="grid size-12 place-items-center rounded-2xl bg-gold-50 text-gold-700">
          <MailCheck className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-xl font-extrabold text-navy-950">Vérifiez votre email</h2>
        <p className="mt-2 leading-relaxed text-navy-500">
          {sending ? 'Envoi d’un code à 6 chiffres à ' : 'Saisissez le code à 6 chiffres envoyé à '}
          <strong className="font-semibold wrap-anywhere text-navy-800">{email}</strong>. Il expire dans 10 minutes.
        </p>
      </div>

      {alert && <FormAlert>{alert}</FormAlert>}
      {notice && !alert && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {notice}
        </p>
      )}

      <TextField
        ref={inputRef}
        id="email-code"
        name="code"
        label="Code de vérification"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={CODE_LENGTH}
        placeholder="••••••"
        autoFocus
        required
        value={code}
        error={fieldError}
        className="text-center text-2xl font-bold tracking-[0.5em] placeholder:tracking-[0.5em]"
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH);
          setCode(digits);
          if (error === 'invalid-code') setError(null);
          if (digits.length === CODE_LENGTH) void verify(digits);
        }}
      />

      <button
        type="submit"
        disabled={verifying || sending}
        className="btn-gold h-12 w-full text-base disabled:opacity-70"
      >
        {verifying ? (
          <>
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            Vérification…
          </>
        ) : (
          <>
            Vérifier et continuer
            <ArrowRight className="size-5" aria-hidden="true" />
          </>
        )}
      </button>

      <div className="space-y-1 text-center text-sm text-navy-500">
        <p>
          Rien reçu&nbsp;? Regardez dans les spams, ou{' '}
          {cooldown > 0 ? (
            <span className="font-semibold text-navy-400" aria-live="polite">
              renvoyez un code dans {cooldown}&nbsp;s
            </span>
          ) : (
            <button
              type="button"
              disabled={sending}
              onClick={() => void send(false)}
              className="font-semibold text-gold-700 underline-offset-2 hover:text-gold-600 hover:underline disabled:opacity-60"
            >
              renvoyez un code
            </button>
          )}
          .
        </p>
      </div>

      <button
        type="button"
        onClick={() => void cancel()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-navy-600 transition hover:text-navy-900"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {cancelLabel}
      </button>
    </form>
  );
}
