# Architecture Decision Records (ADR)

Lightweight decisions that outlive chat history.

## Rules

- One decision per file: `NNNN-short-kebab-title.md`
- Numbers are sequential (`0001`, `0002`, …)
- Copy from `0000-template.md`
- Prefer _why_ and _consequences_ over implementation detail
- Link from `AGENTS.md` or `docs/knowledge/` when a decision becomes a hard rule

## Index

| ID   | Title                                                                                               | Status               | Date       |
| ---- | --------------------------------------------------------------------------------------------------- | -------------------- | ---------- |
| 0001 | [Static Astro site with React islands](0001-static-astro-with-react-islands.md)                     | Accepted             | 2026-10-23 |
| 0002 | [Front-end demo mode until the API exists](0002-demo-mode-without-backend.md)                       | Amended by 0004      | 2026-10-23 |
| 0003 | [One line of business per shop](0003-one-line-of-business-per-shop.md)                              | Accepted             | 2026-10-24 |
| 0004 | [Supabase for login and signup, with an emailed code](0004-supabase-auth-with-email-code.md)        | Paused by 0005       | 2026-10-24 |
| 0005 | [Email confirmation link instead of the sign-in code](0005-email-confirmation-instead-of-code.md)   | Accepted (temporary) | 2026-10-24 |
| 0006 | [Merchant catalogue on Supabase](0006-merchant-catalog-on-supabase.md)                              | Accepted             | 2026-10-30 |
| 0007 | [Sales, till and invoices on Supabase](0007-sales-on-supabase.md)                                   | Accepted             | 2026-10-30 |
| 0008 | [Suppliers, receptions and expenses on Supabase](0008-suppliers-receptions-expenses-on-supabase.md) | Accepted             | 2026-10-31 |
| 0009 | [Team, deposits and notifications on Supabase](0009-team-deposits-notifications-on-supabase.md)     | Accepted             | 2026-10-31 |
| 0010 | [Password reset via email recovery link](0010-password-reset-via-email.md)                          | Accepted             | 2026-10-31 |
