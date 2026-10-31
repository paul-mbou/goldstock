# HANDOFF — GOLDSTOCK

> Short session bridge. Update at end of every work session. Keep ≤ 1 screen.
> Last updated: 2026-10-31 · By: Cursor agent

## Goal of current work

Lot 6 **staff auth** (ADR 0011) ready to commit/push. Next when asked: multi-shop rows.

## Done since last handoff

- Lots 1–5 on `main`.
- **Lot 6:** `shop_members.user_id`/`email`, `is_account_owner`, expanded `is_shop_owner`, `activate_my_membership`, Edge Function `invite-member`, Team invite sheet (email), hydrate role + activate invited, role preview owner-only. Migration `20261031140000_staff_auth.sql` **pushed** to linked project.

## In progress / owner action

- Deploy function (CLI returned 403 ACL): `npx supabase functions deploy invite-member --use-api`
- Live invite QA needs a signed-in owner + SMTP; no local session for browser QA this turn.
- Redirect URLs / recovery template / SMTP / Vercel env as before.

## Do not touch

- `src/data/site.ts` prices / phone / WhatsApp.
- `.env.local`, `.vercel/`.

## How to validate

```bash
npm test && npm run check && npm run build && npx prettier --check .
# Owner: /app/equipe → Inviter (email) → staff opens invite mail → /connexion → role from roster
```

## Pointers

- ADR 0011 · `supabase/functions/invite-member/` · `src/lib/staff/` · `src/lib/demo.ts`
