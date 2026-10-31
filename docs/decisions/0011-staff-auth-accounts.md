# ADR 0011: Staff auth accounts linked to shop_members

- **Status:** Accepted
- **Date:** 2026-10-31
- **Deciders:** Paul Mbou

## Context

Batch 4 stored the team as roster rows without `auth.users` (ADR 0009). Invites only toasted a fake SMS. The owner asked for staff who can sign in. Creating users needs the service-role key, which must not ship to the browser.

## Decision

1. Add `user_id` and `email` on `shop_members`; link the owner row to `shops.owner_id`.
2. Expand `is_shop_owner()` to mean **shop access** (account owner **or** non-suspended member) so existing RLS/RPCs keep working. Add `is_account_owner()` for true ownership (team writes, billing-sensitive later).
3. Invite via Edge Function `invite-member` (service role + `inviteUserByEmail`); the client only invokes it with the owner's JWT.
4. After login, hydrate the session role from the signed-in member's row. Role preview (« Voir l’espace en tant que ») stays owner-only.

## Alternatives considered

- Client-side `signUp` for staff — rejected: would create a second shop via `handle_new_user`.
- Per-role RLS on every table — deferred: UI roles already gate screens; shared shop access is enough for v1.

## Consequences

- Positive: managers/sellers can sign in with email; invites use Supabase mail (same SMTP limits as confirmation).
- Negative / trade-offs: `is_shop_owner` name now means access; staff share data-plane access within the shop.
- Follow-ups: multi-shop rows, finer RLS by role, resend-invite polish.

## References

- `supabase/migrations/20261031140000_staff_auth.sql`
- `supabase/functions/invite-member/`
- `src/lib/staff/`, `src/lib/auth.ts`
