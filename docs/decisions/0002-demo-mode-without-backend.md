# ADR 0002: Front-end demo mode until the API exists

- **Status:** Accepted, amended by ADR 0004 (Supabase replaces `PUBLIC_API_URL`; test mode applies while the Supabase variables are unset)
- **Date:** 2026-10-23
- **Deciders:** Paul Mbou

## Context

The backend API is not live yet, but the merchant space must be demonstrable and testable end to end: signup, login, till, sales, stock.

## Decision

`PUBLIC_API_URL` (declared in `astro.config.mjs` env schema) is optional. When it is unset, `src/lib/auth.ts` treats every valid login or signup as successful and redirects to `/app`. The merchant space reads and writes a single shared store (`src/lib/demo.ts`) seeded from `src/data/dashboard.ts` and persisted in `sessionStorage`, so a sale rung up at the till appears in the sales list and stock on the next page. When the variable is set, the forms call `POST /auth/login` and `POST /auth/signup` with a cookie session.

## Alternatives considered

- Mock server (MSW or similar) — rejected: more moving parts for a static site.
- Hide the merchant space until the API is ready — rejected: blocks demos and UI work.

## Consequences

- Positive: full product demo with no backend; one store shared by all islands.
- Negative / trade-offs: demo data resets with the browser session; the store must stay in sync with the server-rendered seed to avoid hydration mismatches.
- Follow-ups: when the API goes live, replace the store's data source without changing island APIs.

## References

- `src/lib/auth.ts`, `src/lib/demo.ts`, `.env.example`
