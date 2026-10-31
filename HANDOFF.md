# HANDOFF — GOLDSTOCK

> Short session bridge. Update at end of every work session. Keep ≤ 1 screen.
> Last updated: 2026-10-31 · By: Cursor agent

## Goal of current work

Connect the merchant dashboard to Supabase in batches of 3 features + tests. Batch 3 (ADR 0008): **fournisseurs + réceptions + dépenses**. Batches 1–2 on `main` (`448f70d`, `f7de8c9`).

## Done since last handoff

- **Batch 2** pushed (`f7de8c9`): sales / till / invoices.
- **Batch 3 (ready, uncommitted until owner asks):** ADR `0008`; migration `20261031100000_supply.sql` (suppliers, receptions, reception_lines, expenses, RPC `receive_goods`); `src/lib/supply/`; hydrate + dual-write in `demo.ts`; Suppliers / Expenses UI await writes; Vitest mappers + codes.

## In progress

- Owner must **apply** catalog + sales + supply migrations on `snwlfrnlcamxyaqvqyye` before live supply works; hydrate soft-fails to empty lists if tables are missing.
- Next batch (proposal): 4) équipe + versements + notifications.
- Owner still: Confirm email on, Secure password change, Redirect URLs, email template, Vercel env + redeploy.

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
- Latest supply ADR: `docs/decisions/0008-suppliers-receptions-expenses-on-supabase.md`
