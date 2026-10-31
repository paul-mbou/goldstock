# ADR 0007: Sales, till and invoices on Supabase

- **Status:** Accepted
- **Date:** 2026-10-30
- **Deciders:** Paul Mbou

## Context

Batch 1 put categories, products and stock moves on Supabase (ADR 0006). The till, sales list and invoices still use the browser demo store. The owner asked for batch 2: ventes + caisse + reçus/factures.

## Decision

Persist **sales** (header + lines) on Supabase. Ringing up a sale deducts variant stock in one RPC (`record_sale`). Cancelling restores stock; partial returns increase stock and add `return` stock moves. Issuing an invoice only updates customer fields and `invoiced_at` on the sale row.

The shared store (`demo.ts`) still feeds the islands: after auth, sales hydrate with the catalogue; writes go to Supabase then update the store. Demo mode (no Supabase env) stays local-only.

## Alternatives considered

- Store only a journal of payments without line items — rejected: returns and margins need lines.
- Soft-delete stock moves for every sale — rejected: sales already own the stock delta; returns already create moves.

## Consequences

- Positive: a confirmed account keeps its sales across devices; till and stock stay consistent.
- Negative / trade-offs: shop name is still denormalised on the sale for the current UI (`Sale.shop`); staff sellers are still free text until the team batch.
- Follow-ups: suppliers, expenses, team, deposits.

## References

- `supabase/migrations/20261030120000_sales.sql`
- `src/lib/sales/`
