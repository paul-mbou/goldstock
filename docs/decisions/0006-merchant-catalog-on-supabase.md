# ADR 0006: Merchant catalogue on Supabase (categories, products, stock)

- **Status:** Accepted
- **Date:** 2026-10-30
- **Deciders:** Paul Mbou

## Context

Auth, the shop row and its logo already live on Supabase. The merchant space still keeps categories, products and stock in the browser demo store (`src/lib/demo.ts`). The owner asked to connect dashboard features in batches of three, with tests.

## Decision

Persist the **catalogue** on Supabase first:

1. Categories (and their attributes)
2. Products (and their variants)
3. Stock moves (entries / exits / adjustments / inventory), which update variant quantities

While `PUBLIC_SUPABASE_*` (or the Vercel `NEXT_PUBLIC_*` fallbacks) are unset, behaviour stays on the demo store (ADR 0002). When they are set, `/app` hydrates the catalogue from Supabase after a confirmed session, and catalogue writes go to Supabase then update the shared store. Sales, suppliers, team, expenses and deposits stay in the demo store until later batches.

Row access is limited to the shop owner (`shops.owner_id = auth.uid()`), plus the existing restrictive « Email code required » policy (`second_factor_verified()`). Stock quantity changes go through a single RPC so the move and the variant stock stay in sync.

## Alternatives considered

- Connect sales before the catalogue — rejected: the till needs products and stock.
- Replace `demo.ts` entirely in one go — rejected: too large a cut; the shared store still feeds every island.
- Keep stock only as a derived field with no move history — rejected: the Stock screen’s history is already a product requirement.

## Consequences

- Positive: a confirmed account keeps its catalogue across devices; demo mode still works offline.
- Negative / trade-offs: two write paths until every feature is migrated; the owner must apply the new migration on the Supabase project.
- Follow-ups: sales → suppliers → team / deposits / expenses in later batches of three.

## References

- `supabase/migrations/20261030100000_merchant_catalog.sql`
- `src/lib/catalog/`
- `src/lib/demo.ts`, `src/lib/shop.ts`
