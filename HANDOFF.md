# HANDOFF — GOLDSTOCK

> Short session bridge. Update at end of every work session. Keep ≤ 1 screen.
> Last updated: 2026-10-31 · By: Cursor agent

## Goal of current work

Dashboard → Supabase batches 1–4 are **done and on `main`**. Next work only when the owner asks (staff auth, password reset, multi-shop rows, payments…).

## Done since last handoff

| Lot | Commit    | Scope                                           |
| --- | --------- | ----------------------------------------------- |
| 1   | `448f70d` | Catalogue (ADR 0006)                            |
| 2   | `f7de8c9` | Ventes / caisse / factures (ADR 0007)           |
| 3   | `4ebcaeb` | Fournisseurs / réceptions / dépenses (ADR 0008) |
| 4   | `0ca2f36` | Équipe / versements / notifications (ADR 0009)  |

Shared store still feeds islands; live mode hydrates + dual-writes. Demo mode (no env) unchanged.

## In progress

- Migrations sales + supply + staff **applied** on `snwlfrnlcamxyaqvqyye` (2026-10-31 `db push`; catalogue was already there).
- Owner still: Vercel `PUBLIC_SUPABASE_*` (or `NEXT_PUBLIC_*`) at build time + redeploy if production is still test mode; Confirm email on; Secure password change; Redirect URLs; email template; SMTP/domain when ready for real customers.

## Do not touch

- `src/data/site.ts` prices, phone and WhatsApp number.
- `.env.local`, `.vercel/`.

## Blockers / open questions

- No sending domain → built-in mailer rate-limits.
- Fixed dashboard clock (`NOW` in `dashboard.ts`).
- Invited staff cannot sign in yet (roster only).

## How to validate

```bash
npm test && npm run check && npm run build && npx prettier --check .
```

## Pointers

- Contract: `AGENTS.md` · Product: `docs/PRODUCT.md` · ADRs: `docs/decisions/` (0006–0009)
