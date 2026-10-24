# ADR 0004: Supabase for login and signup, with an emailed code as second factor

- **Status:** Accepted, code paused by ADR 0005 until a sending domain is verified
- **Date:** 2026-10-24
- **Deciders:** Paul Mbou

## Context

Login and signup must work for real, and the owner wants a second factor sent by email. The site stays static on Vercel (ADR 0001); only authentication moves to a database for now, the merchant space keeps its demo data.

Supabase Auth's built-in MFA only offers authenticator apps (TOTP) and SMS. Signing in with a Supabase email OTP (`signInWithOtp`) is a first factor on its own: anyone with access to the inbox could skip the password. It cannot serve as a second factor.

## Decision

- **Supabase Auth** handles email and password (`signUp`, `signInWithPassword`) from the browser with the publishable key (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_PUBLISHABLE_KEY`). The client is created lazily in `src/lib/supabase.ts`, and `src/lib/auth.ts` is the only module the forms talk to.
- Signup metadata (full name, shop name, line of business, city, optional phone) is turned into `public.profiles` and `public.shops` rows by the `handle_new_user` trigger. A trigger forbids changing `shops.business` (ADR 0003).
- **Second factor:** the `email-otp` Edge Function emails a random 6-digit code (Resend), stored as an HMAC bound to the auth session, valid 10 minutes, 5 attempts, 60 s between sends, 5 sends per hour. Once verified, the session is recorded in `public.verified_sessions` (deleted with the session on sign-out).
- `public.second_factor_verified()` is the single check: restrictive RLS policies on every table require it, and `/app` (`AppLayout`) stays hidden until it returns true.
- Login is by email only. The phone number is optional contact data, not an identifier.
- When the Supabase variables are unset, ADR 0002 test mode still applies.

## Alternatives considered

- Supabase `signInWithOtp` after the password: rejected, the code alone opens a session.
- Supabase MFA TOTP with an authenticator app: rejected, the owner asked for email.
- Phone + password login: needs an SMS provider or a server-side lookup that would leak which numbers have accounts; deferred.

## Consequences

- Positive: real accounts with no server to run; the second factor is enforced in the database, not only in the UI.
- Negative / trade-offs: "Confirm email" must stay **off** in Supabase (the emailed code proves the address instead), so someone could register an address they do not own; it stays unusable without the code, but blocks the real owner until a password reset flow exists. Emails depend on Resend and a verified sender domain.
- Follow-ups: password reset by email; move the merchant-space data from the demo store to Supabase tables with the same restrictive policy.

## References

- `supabase/migrations/20261024100000_auth_profiles_and_email_otp.sql`, `supabase/functions/email-otp/index.ts`
- `src/lib/supabase.ts`, `src/lib/auth.ts`, `src/components/auth/EmailCodeStep.tsx`, `src/layouts/AppLayout.astro`
- Supersedes the `PUBLIC_API_URL` part of ADR 0002.
