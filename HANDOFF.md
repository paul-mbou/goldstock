# HANDOFF — GOLDSTOCK

> Short session bridge. Update at end of every work session. Keep ≤ 1 screen.
> Last updated: 2026-10-24 · By: Cursor agent

## Goal of current work

Real signup and login on Supabase. Until a sending domain exists, the emailed sign-in code is paused and signup requires an email confirmation link instead (ADR 0005). The merchant space still runs in the browser store, but now **starts empty** with a guided tour.

## Done since last handoff

- **Fictional data removed** (`DEMO_VERSION` 6): the seed in `createSeed` (`dashboard.ts`) only keeps the categories of the chosen activity (`catalogs.ts` = `CATEGORIES`), one shop, the owner (`ownerMember`, name and phone from signup or the Supabase `profiles` row via `fetchOwner`), a trial plan (`Plan.trial`, `site.trialDays`) and a welcome notification. No sample products, sales, team, suppliers, deposits, expenses, invoices or tickets. « Voir l'espace en tant que » uses `memberFor` in `demo.ts` (first real member with that role, else a stand-in). « Repartir de zéro » (ex « Réinitialiser la démo ») asks for confirmation and keeps the owner.
- **Guided tour** (`GuidedTour.tsx`, steps in `src/data/tour.ts`, helpers in `src/lib/tour.ts`, mounted in `AppLayout`): 17 steps filtered by role, spotlight on `data-tour` targets (sidebar, bottom bar, search, notifications, account), card docked top/bottom under 640 px, hint « Dans le menu… » when the entry is hidden. Opens on first `/app` visit (`localStorage gs-tour`); signup calls `resetTour()`; « Voir la page » leaves a « Reprendre la visite » pill (`sessionStorage gs-tour-resume`); relaunch from the account menu or the dashboard « Premiers pas » card (hidden flag `localStorage gs-checklist`).
- Empty states for an empty shop: Produits, Stock, Caisse, Ventes, Fournisseurs, Versements, Rapports, Abonnement (invoices), dashboard (« Premiers pas » checklist, deposits intro).

- Supabase project « Gold Stock » (`snwlfrnlcamxyaqvqyye`) linked; migrations `20261024100000` → `20261024150000` applied; `email-otp` deployed but unused. Google sign-in was **cancelled** by the owner: `20261024120000` added it, `20261024140000` undoes it (keep both files, they are in the remote history).
- Account editing for the owner (Paramètres): « Mon profil » → Mot de passe (`changePassword` in `auth.ts`: re-checks the current password, then signs other devices out); « Entreprise » → Logo (`src/lib/shop.ts`, public bucket `shop-logos/<shop id>/…`, `shops.logo_path`, migration `20261024150000`). The logo shows in the sidebar `ShopCard` and on receipts (switch « Logo sur le reçu »); `AppLayout` re-reads it from Supabase on every `/app` load. Tested in test mode only — no confirmed live account to sign in with.
- `EMAIL_CODE_ENABLED = false` in `src/lib/auth.ts`; signup / unconfirmed login show `CheckEmailStep` (resend with 60 s cooldown, webmail shortcut, auto-redirect when confirmed in another tab); `/confirmer-email` opens the session from the link (token_hash, `#access_token` or `?code=`) and goes to `/app`, or offers a new link if expired.
- Browser checks: `/app` redirects when signed out; expired link page; unconfirmed login → check-email screen.
- Catégories: characteristics can now be edited (pencil → dialog with the add-form fields) besides added and deleted (delete offers « Annuler »). Edits keep the attribute `id`, so product values stay linked; once products use a characteristic its type and variant/descriptive usage are locked, and removing a value in use shows how many products keep it. `ProductFormPage` still displays a stored value that is no longer in the list.
- Stock: « Entrée » / « Sortie » buttons open `MoveDialog` (article, quantity, provenance or motif + detail, date ≤ today, author from the team, note) → `recordMove` in `demo.ts` (new move types `entry` / `exit`, optional `Move.source` / `Move.destination`, back-dated moves filed at their date). Receptions and customer returns now fill `source`. History tab: Entrées / Sorties filter, search on article, author, provenance.
- Prices set by the owner: 10 000 / 15 000 / 25 000 FCFA (`site.ts`, JSON-LD in `Layout.astro`).
- Shops are now store data (`demo.shops`, `ShopInfo` with address; `SHOPS` and `settings.addresses` removed). Paramètres → Boutiques: « Ajouter une boutique » only while `shopQuota(demo)` allows it (`PLAN_LIMITS`), otherwise an upgrade banner. No rename or delete yet.
- New screen Dépenses (`/app/depenses`, `ExpensesPage.tsx`, `recordExpense` / `deleteExpense` / `visibleExpenses` in `demo.ts`, seed in `dashboard.ts`). « Bénéfice après dépenses » = month margin − expenses, on that screen only; Rapports and Versements ignore expenses for now.
- Invoice from a sale (Ventes sheet and till receipt → « Facture »): `Invoice.tsx` + `src/lib/invoice.ts` (company block with legal name, NIU, RCCM, shop address; amount in French words). « Imprimer ou PDF » prints it; « Envoyer sur WhatsApp » opens `wa.me` with a text version (a link cannot attach a PDF) and saves the client on the sale. The client's phone or email is required (both allowed: `customerPhone`, `customerEmail`); the invoice date is fixed at the first print or send (`invoicedAt`, `invoiceDate()` in `dashboard.ts`) and shown next to the sale date.
- Versements: the manager declares a deposit to the owner (« Déclarer un versement », `declareDeposit` / `withdrawDeposit` / `undeclaredDays` in `demo.ts`). One per shop and day over the last 14 days; expected cash comes from `cashSalesTotal`; a gap needs an explanation (`comment`), Mobile Money or transfer needs a transaction number (`reference`). It lands « À vérifier » with a notification for the owner only (`Notification.roles`), who sees both in the review dialog.
- Price agreed at the till: in the Caisse cart each line's price can be changed for that sale only (`PriceEditor` in `PosPage.tsx`, `recordSale` takes `lines[].price`). The catalogue price (`Variant.price`) never changes; a changed line keeps it in `SaleLine.listPrice`, shown in the Ventes sale sheet (« Prix changé à la vente »). Anyone with Caisse access may go up or down; below the purchase cost only roles with `Role.sellBelowCost` (owner). Remise limits per role are unchanged. No `DEMO_VERSION` bump (still 6), so entered data survives.
- Dev tip: a long-running `astro dev` can keep serving a stale module after edits (watcher missed it); if behaviour doesn't match the code, fetch `/src/...tsx` from the server to check, and restart.

## In progress

- Everything is **uncommitted**. Owner to do in Supabase: keep « Confirm email » **on**; URL Configuration (Site URL + `http://localhost:*/confirmer-email` + production `/confirmer-email` in Redirect URLs); paste `supabase/templates/confirm-signup.html` into the Confirm signup template; delete test users `test-agent-goldstock@mailinator.com` (and `…2@gmail.com` if it exists). Then test signup → link → `/app` with a Supabase team member's address.
- Live test still to do with a confirmed account: change password (wrong current password, then success), upload / replace / remove the logo, reload `/app` on another browser to see it.

## Do not touch

- `src/data/site.ts` prices, phone and WhatsApp number — reason: owner-controlled business values.
- `.env.local`, `.vercel/` — reason: local secrets and Vercel link.

## Blockers / open questions

- No domain: Supabase's built-in mailer only reaches team members (few emails per hour, already rate-limited once today). Real customers need custom SMTP (e.g. Gmail app password) or a domain.
- The dashboard clock is still fixed (`NOW` = 23 Oct 2026 14:30 in `dashboard.ts`) so server and client renders match; new records are timed just after it (`nextTime` in `demo.ts`). Moving to the real clock needs hydration-safe rendering.
- No password reset yet ("Mot de passe oublié" still opens WhatsApp).
- Vercel still needs `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## How to validate

```bash
npm run check
npm run build
npx prettier --check .
```

## Pointers

- Contract: `AGENTS.md`
- Product: `docs/PRODUCT.md`
- Knowledge: `docs/knowledge/INDEX.md`
- Latest ADR: `docs/decisions/0005-email-confirmation-instead-of-code.md`
