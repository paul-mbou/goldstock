# ADR 0010: Password reset via email recovery link

- **Status:** Accepted
- **Date:** 2026-10-31
- **Deciders:** Paul Mbou

## Context

« Mot de passe oublié » on the login page opened WhatsApp. After batches 1–4, the owner asked for the next work: password reset, staff auth and multi-shop. Password reset is the smallest high-value auth gap and works with the existing Confirm-email / SMTP setup.

## Decision

Replace the WhatsApp shortcut with a real recovery flow:

1. Login → « Mot de passe oublié » → `resetPasswordForEmail` with redirect to `/reinitialiser-mot-de-passe`.
2. That page opens the recovery session (`completePasswordRecovery`) then calls `updateUser({ password })`.
3. French email template `supabase/templates/recovery.html` for Supabase « Reset password ».

Demo mode (no Supabase env) still pretends success and lets the reset page run without a live session (ADR 0002).

## Alternatives considered

- Keep WhatsApp-only recovery — rejected: owners need self-serve access.
- Staff invite auth in the same batch — deferred: needs an Edge Function with the service-role key.

## Consequences

- Positive: owners can regain access without support.
- Negative / trade-offs: recovery emails still need SMTP/domain for real customers; Redirect URLs must include the new path.
- Follow-ups: staff auth accounts, multi-shop rows.

## References

- `src/lib/auth.ts` (`requestPasswordReset`, `completePasswordRecovery`, `setRecoveredPassword`)
- `src/pages/reinitialiser-mot-de-passe.astro`
- `supabase/templates/recovery.html`
