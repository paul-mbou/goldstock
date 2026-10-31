# HANDOFF — GOLDSTOCK

> Short session bridge. Update at end of every work session. Keep ≤ 1 screen.
> Last updated: 2026-10-30 · By: Cursor agent

## Goal of current work

Connect the merchant dashboard to Supabase in batches of 3 features + tests. Batch 2 (ADR 0007): **ventes + caisse + reçus/factures**. Batch 1 catalogue (ADR 0006) is on `main` (`448f70d`).

## Done since last handoff

- **Batch 1** pushed: migration `20261030100000_merchant_catalog.sql`, `src/lib/catalog/`, hydrate + dual-write, Vitest.
- **Batch 2 (ready, uncommitted until owner asks):** ADR `0007-sales-on-supabase.md`; migration `20261030120000_sales.sql` (`sales`, `sale_lines`, RPCs `record_sale` / `set_sale_cancelled` / `return_sale_items`); `src/lib/sales/` (types, api, Vitest); `demo.ts` hydrates sales with the catalogue and dual-writes till / cancel / return / invoice; Pos / Sales / Invoice await those writes. Demo mode (no env) stays local-only.
- Auth hardening still on `main` (`fffad9b`). Production may still be test mode until Vercel `PUBLIC_*` (or `NEXT_PUBLIC_*` fallback) is set at build time.

## In progress

- Owner must **apply** catalog + sales migrations on project `snwlfrnlcamxyaqvqyye` before live till works; hydrate soft-fails (empty sales) if sales tables are missing.
- Next batches (proposal): 3) fournisseurs + réceptions + dépenses ; 4) équipe + versements + notifications.
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
- Latest sales ADR: `docs/decisions/0007-sales-on-supabase.md`
