# ADR 0005: Email confirmation link instead of the sign-in code, until a sending domain exists

- **Status:** Accepted (temporary)
- **Date:** 2026-10-24
- **Deciders:** Paul Mbou

## Context

The emailed 6-digit code of ADR 0004 is sent through Resend. Without a verified domain, Resend only delivers to the Resend account owner, so real customers could never sign in. GOLDSTOCK has no domain yet.

## Decision

- Pause the code: `EMAIL_CODE_ENABLED = false` in `src/lib/auth.ts`. The code step, the `email-otp` Edge Function and its tables stay in place, unused.
- Turn Supabase **"Confirm email" on**. Signup shows a "check your inbox" screen; the link lands on `/confirmer-email`, which opens the session from the link and sends the owner to `/app`.
- The client uses the implicit flow (not PKCE) so the link works on another device than the one used to sign up.
- Migration `20261024130000_pause_email_code.sql` makes `second_factor_verified()` mean "address confirmed", so the restrictive RLS policies keep protecting `profiles` and `shops`.

## Alternatives considered

- Keep the code with `onboarding@resend.dev` — rejected: only the Resend owner receives it.
- Turn off both confirmation and code — rejected: anyone could use an address they do not own.

## Consequences

- Positive: real customers can sign up today; every account has a proven address.
- Negative / trade-offs: no second factor at sign-in. Supabase's built-in mailer only delivers to the Supabase organisation's team members and a few emails per hour, so real customers need custom SMTP (for example a Gmail account with an app password) until the domain exists.
- Follow-ups: when a domain is verified in Resend, point Supabase SMTP and `EMAIL_FROM` at it, set `EMAIL_CODE_ENABLED` back to true and restore `second_factor_verified()` from `20261024100000` in a new migration.

## References

- `src/lib/auth.ts`, `src/components/auth/CheckEmailStep.tsx`, `src/components/auth/EmailConfirmation.tsx`, `src/pages/confirmer-email.astro`, `supabase/templates/confirm-signup.html`
