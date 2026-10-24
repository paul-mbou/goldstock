# ADR 0003: One line of business per shop

- **Status:** Accepted
- **Date:** 2026-10-24
- **Deciders:** Paul Mbou

## Context

A generic catalogue feels foreign to merchants: a phone shop thinks in memory, colour and IMEI; a hair shop in length, colour and hair type. Categories, product fields and examples need to speak the merchant's trade from the first screen.

## Decision

Each shop runs exactly one line of business (`BusinessId` in `src/data/businesses.ts`: phones, hair, clothing, shoes, cosmetics, grocery), picked at signup and never changed afterwards. It decides the categories, product fields, placeholders and demo catalogue (`src/data/catalogs.ts`). In test mode, the signup choice is handed to the merchant space through `src/lib/demo-setup.ts`.

## Alternatives considered

- Free-form shop with user-defined categories only — rejected: empty, generic start; slower onboarding.
- Allow changing the line of business later — rejected: existing products, fields and stock would no longer fit.

## Consequences

- Positive: onboarding feels tailored; forms show relevant fields and examples.
- Negative / trade-offs: a merchant with two trades needs two shops.
- Follow-ups: the backend must store the line of business at signup and refuse later changes.

## References

- `src/data/businesses.ts`, `src/data/catalogs.ts`, `src/lib/demo-setup.ts`, `src/components/auth/SignupForm.tsx`
