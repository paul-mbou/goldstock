# HANDOFF — GOLDSTOCK

> Short session bridge. Update at end of every work session. Keep ≤ 1 screen.
> Last updated: 2026-10-31 · By: Cursor agent

## Goal of current work

Connect the merchant dashboard to Supabase in batches of 3 features + tests. Batch 4 (ADR 0009): **équipe + versements + notifications**. Batches 1–3 on `main` (`448f70d`, `f7de8c9`, `4ebcaeb`).

## Done since last handoff

- **Batch 3** pushed (`4ebcaeb`): suppliers / receptions / expenses.
- **Batch 4 (ready, uncommitted until owner asks):** ADR `0009`; migration `20261031120000_staff.sql` (`shop_members`, `deposits`, `notifications`, RPCs `declare_deposit` / `withdraw_deposit`); `src/lib/staff/`; hydrate + dual-write; Team / Deposits / notifications UI; Vitest mappers. Staff = roster only (no auth accounts yet).

## In progress

- Owner must **apply** catalog + sales + supply + staff migrations on `snwlfrnlcamxyaqvqyye`.
- Owner still: Confirm email on, Secure password change, Redirect URLs, email template, Vercel env + redeploy.
- Later: staff auth linked to `auth.users`, multi-shop rows, password reset.

## Do not touch

- `src/data/site.ts` prices, phone and WhatsApp number — reason: owner-controlled business values.
- `.env.local`, `.vercel/` — reason: local secrets and Vercel link.

## Blockers / open questions

- No domain: Supabase built-in mailer rate-limits; real customers need SMTP or a domain.
- Dashboard clock still fixed (`NOW` in `dashboard.ts`).
- No password reset yet.

## How to validate

```bash
npm test
npm run check
npm run build
npx prettier --check .
```

## Pointers

- Contract: `AGENTS.md`
- Product: `docs/PRODUCT.md`
- Knowledge: `docs/knowledge/INDEX.md`
- Latest staff ADR: `docs/decisions/0009-team-deposits-notifications-on-supabase.md`
