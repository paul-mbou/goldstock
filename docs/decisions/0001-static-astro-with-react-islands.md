# ADR 0001: Static Astro site with React islands

- **Status:** Accepted
- **Date:** 2026-10-23
- **Deciders:** Paul Mbou

## Context

Target users browse on modest Android phones and variable mobile data in Cameroon. The landing page must load fast and rank well, while a few parts (menus, pricing toggle, forms, the merchant space) need interactivity.

## Decision

Build with Astro 7 as a static site. Interactive parts are React 19 islands hydrated with `client:load`, `client:idle` or `client:visible`; everything else is plain HTML. Styling uses Tailwind CSS 4 tokens defined in `src/styles/global.css`. Deploy on Vercel from `main`.

## Alternatives considered

- Full single-page React app (Vite / Next.js client components) — rejected: ships far more JavaScript for mostly static marketing content.
- Plain HTML + vanilla JS — rejected: the merchant space needs component state that React handles well.

## Consequences

- Positive: small JavaScript payload, good SEO, simple hosting.
- Negative / trade-offs: islands do not share React context, so shared merchant-space state needs an external store (see ADR 0002).
- Follow-ups: keep new pages static by default; justify every new `client:*` directive.

## References

- `astro.config.mjs`, `README.md` (Stack technique)
