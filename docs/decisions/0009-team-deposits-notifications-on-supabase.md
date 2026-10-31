# ADR 0009: Team, deposits and notifications on Supabase

- **Status:** Accepted
- **Date:** 2026-10-31
- **Deciders:** Paul Mbou

## Context

Batches 1–3 put catalogue, sales and supply on Supabase. The team roster, manager cash deposits and in-app notifications still live only in the browser demo store. The owner asked for batch 4: équipe + versements + notifications.

Staff do **not** get their own auth accounts in this batch: members are roster rows the owner manages (invite / role / suspend). Role preview in the UI stays a front-end switch. Real multi-user login remains a later decision.

## Decision

Persist **shop_members**, **deposits** and **notifications** on Supabase under owner RLS (plus the restrictive email-code policy). Declaring a deposit runs in one RPC (`declare_deposit`) that inserts the deposit and the owner-only notification. Withdrawing a pending declaration deletes both. The shared store still feeds the islands; after auth, staff data hydrates with the catalogue. Demo mode stays local-only.

On first load of an empty roster, seed one owner row from the shop profile so the Équipe screen is never blank for a live account.

## Alternatives considered

- Create auth users per invite — rejected for this batch: no SMS/email domain, and role preview already covers demos.
- Keep notifications only in `sessionStorage` — rejected: deposit alerts must survive across devices for the owner.

## Consequences

- Positive: team, deposits and alerts follow the confirmed account across devices.
- Negative / trade-offs: invited members cannot sign in yet; notification ids stay client-chosen text keys (`n-welcome`, `n-<deposit-uuid>`).
- Follow-ups: staff auth / shop_members linked to `auth.users`, multi-shop as real rows.

## References

- `supabase/migrations/20261031120000_staff.sql`
- `src/lib/staff/`
