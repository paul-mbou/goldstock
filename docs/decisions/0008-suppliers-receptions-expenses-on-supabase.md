# ADR 0008: Suppliers, receptions and expenses on Supabase

- **Status:** Accepted
- **Date:** 2026-10-31
- **Deciders:** Paul Mbou

## Context

Batches 1–2 put the catalogue and sales on Supabase (ADR 0006, 0007). Suppliers, goods receptions and shop expenses still live only in the browser demo store. The owner asked for batch 3: fournisseurs + réceptions + dépenses.

## Decision

Persist **suppliers**, **receptions** (header + lines) and **expenses** on Supabase. Receiving goods runs in one RPC (`receive_goods`): stock and purchase cost update together with reception rows and `reception` stock moves; the supplier’s cumulative total increases. Expenses are plain insert/delete under owner RLS. The shared store still feeds the islands; after auth, supply data hydrates with the catalogue; writes go to Supabase then update the store. Demo mode stays local-only.

## Alternatives considered

- Reception as stock moves only, without a reception header — rejected: the Fournisseurs history and supplier totals need a dedicated record.
- Tie expenses to a future multi-shop table — deferred: denormalise `shop_name` like sales until the shops batch.

## Consequences

- Positive: confirmed accounts keep suppliers, deliveries and expenses across devices; receptions stay consistent with stock.
- Negative / trade-offs: supplier `category` stays a free-text label (category name), not a foreign key; expense undo re-inserts the row.
- Follow-ups: team, deposits, notifications.

## References

- `supabase/migrations/20261031100000_supply.sql`
- `src/lib/supply/`
