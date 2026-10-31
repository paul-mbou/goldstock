# HANDOFF — GOLDSTOCK

> Short session bridge. Update at end of every work session. Keep ≤ 1 screen.
> Last updated: 2026-10-31 · By: Cursor agent

## Goal of current work

Lot 5 **password reset** (ADR 0010) ready to push. Next when asked: staff auth accounts, multi-shop rows.

## Done since last handoff

- Lots 1–4 on `main`; sales/supply/staff migrations applied.
- **Lot 5:** forgot-password on `/connexion`, `/reinitialiser-mot-de-passe`, `recovery.html`, helpers in `credentials.ts` + Vitest (29). Browser QA (dev, auth live): oublié → email sent screen; reset without token → « lien ne fonctionne plus ».

## In progress

- Owner: Redirect URLs + Reset password template in Supabase; SMTP/domain for real mail; Vercel env if prod still demo.

## Do not touch

- `src/data/site.ts` prices / phone / WhatsApp.
- `.env.local`, `.vercel/`.

## How to validate

```bash
npm test && npm run check && npm run build && npx prettier --check .
# /connexion → Mot de passe oublié ; /reinitialiser-mot-de-passe (lien email)
```

## Pointers

- ADR 0010 · `src/lib/auth.ts` · `src/lib/credentials.ts`
