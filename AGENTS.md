# AGENTS.md — GOLDSTOCK

> Portable contract for **any** coding agent (Cursor, Claude Code, Zed, Copilot, …).
> Read this first. Then `HANDOFF.md`, then `docs/PRODUCT.md`, then `docs/knowledge/INDEX.md`.

## Product (one sentence)

GOLDSTOCK is a stock and sales management tool for Cameroonian shops: a static marketing site (landing, login, free trial) plus a merchant space (`/app`) that runs as a front-end demo until the backend exists.

## Stack

| Layer                     | Choice                                                                                                                                                                                                                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language / framework      | TypeScript (strict), Astro 7 static site with React 19 islands                                                                                                                                                                                                                                            |
| State / routing / backend | Astro file routing in `src/pages/`; merchant-space state in one shared store (`src/lib/demo.ts`, kept in `sessionStorage`); login and signup on Supabase Auth with an emailed second-factor code (`src/lib/auth.ts`, `supabase/`), optional via `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| UI / design system        | Tailwind CSS 4 tokens in `src/styles/global.css` (navy + gold brand, dashboard surfaces `canvas` / `panel` / `sunken` / `line` / `ink*`), Plus Jakarta Sans, lucide-react icons                                                                                                                           |
| Hosting                   | Vercel, production deploy on every push to `main`                                                                                                                                                                                                                                                         |

## Hard rules (do not violate)

1. **Everything user-facing is in French for Cameroon**: prices in FCFA, phone numbers in `+237` format via `normalizePhone` / `formatPhone` in `src/lib/auth.ts`.
2. **Static first**: pages render as HTML; only interactive parts are React islands hydrated with `client:*`. Do not turn whole pages into client components.
3. **Use the design tokens**, never raw hex in components. Every dashboard screen must work in light and dark (`.dark` class set by `AppLayout`, preference in `src/lib/theme.ts`). Light is the default theme.
4. **Merchant-space data goes through the shared store** in `src/lib/demo.ts`; the seed must match the server render. Do not keep parallel copies of products, sales or stock inside islands.
5. **A shop has exactly one line of business** (`src/data/businesses.ts`), chosen at signup and never changeable afterwards. See `docs/decisions/0003-one-line-of-business-per-shop.md`.
6. **Test mode must keep working**: while the Supabase variables are unset, login and signup open the demo dashboard (see ADR 0002).
7. **Auth goes through `src/lib/auth.ts`**: forms never call Supabase directly. A session only counts as signed in once `second_factor_verified()` is true; every new Supabase table gets the restrictive "Email code required" policy (ADR 0004). The emailed code is **paused** (`EMAIL_CODE_ENABLED = false`): Supabase "Confirm email" must stay on and the function means "address confirmed" until a sending domain exists (ADR 0005). Never ship the service-role key to the browser.
8. Respect `prefers-reduced-motion` for any new animation.
9. Site copy, links, plans and roles are edited in `src/data/site.ts`; dashboard seed data in `src/data/dashboard.ts` and `src/data/catalogs.ts`.
10. Prefer existing patterns in the codebase over inventing new ones.
11. Never commit secrets (`.env*` is ignored, only `.env.example` is tracked).
12. **Long forms open in the right-hand sheet** (`<Modal variant="sheet">` from `ui.tsx`): anything with about five fields or more, or that would scroll. Centered dialogs are only for short forms, confirmations and choices.

## Layout map

```text
src/
├── pages/            # / (landing), /connexion, /essai-gratuit, /app/* (merchant space)
├── layouts/          # Layout (marketing), AuthLayout, AppLayout (dashboard shell + theme)
├── components/
│   ├── sections/     # Static landing sections (.astro)
│   ├── auth/         # Login / signup islands
│   ├── app/          # Merchant-space islands (one *Page.tsx per screen) + ui.tsx primitives
│   └── brand/        # Logo, flag, WhatsApp icon
├── data/             # site.ts, dashboard.ts (seed, roles, permissions), businesses.ts, catalogs.ts
├── lib/              # auth.ts (Supabase auth + email code + phone helpers), supabase.ts (client), demo.ts (shared store), demo-setup.ts, theme.ts
└── styles/global.css # Tailwind @theme tokens, light/dark surfaces, scroll animations
supabase/             # migrations/ (profiles, shops, email codes, RLS, shop-logos bucket), functions/email-otp (second factor, Deno)
docs/                 # PRODUCT, decisions (ADRs), knowledge, screenshots
```

## How to verify before claiming done

```bash
npm run check                 # astro check (TypeScript + Astro)
npm run build                 # check + static build into dist/
npx prettier --check .        # formatting
```

For UI changes, also open the page in the dev server, in light and dark, desktop and mobile widths.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

Astro documentation: https://docs.astro.build. Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Where deeper truth lives

| Need                            | Path                                    |
| ------------------------------- | --------------------------------------- |
| Product intent                  | `docs/PRODUCT.md`                       |
| Architecture & conventions      | `docs/knowledge/` (start at `INDEX.md`) |
| Why we chose X                  | `docs/decisions/`                       |
| Current WIP / don’t-touch       | `HANDOFF.md`                            |
| Public overview, Supabase setup | `README.md`                             |
| IDE rules                       | `.cursor/rules/`                        |

## Bootstrap order (mandatory)

1. This file
2. `HANDOFF.md`
3. `docs/PRODUCT.md`
4. `docs/knowledge/INDEX.md` → only the sections relevant to the task
5. Matching skill/rule for the domain (UI, payments, …)

## Out of scope for agents

- Real payments, and moving merchant-space data to Supabase, unless the owner asks (only auth, the shop row and its logo are on Supabase today).
- Changing Supabase dashboard settings, secrets or production data.
- Changing prices, plans, support phone or WhatsApp number in `src/data/site.ts` without the owner asking.
- Changing the Vercel project or production environment variables.
