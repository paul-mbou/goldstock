# Product — GOLDSTOCK

## Purpose

GOLDSTOCK helps Cameroonian shop owners track their products, sales, stock, staff and the cash deposits of their managers, from a computer or a phone. This repo holds the public site (landing page, login, 7-day free trial) and the merchant space (`/app`), which currently runs as a front-end demo until the backend API is live.

## Primary users

- Shop owners (propriétaires) running one shop in a single line of business: phones, hair, clothing, shoes, cosmetics or grocery.
- Their staff, with role-based access: manager (gérant), seller (vendeur), stock keeper (magasinier).

## Core jobs (must serve)

1. Ring up sales at the till and see them in the sales list and stock immediately.
2. Know what is in stock, what is running low, and receive deliveries from suppliers.
3. Control staff through roles and follow managers' cash deposits (versements).
4. Convince a visitor to start the free trial (clear pricing in FCFA, WhatsApp contact).

## This product is not

- A multi-trade marketplace: a shop has one line of business, fixed at signup.
- An accounting or payroll suite.
- A backend: this repo is front end only and talks to an external API.

## Brand / UX north star (if UI)

Navy and gold identity, Plus Jakarta Sans, calm and trustworthy. French copy written for Cameroonian merchants (FCFA, +237, Mobile Money, WhatsApp). Fast on modest phones: static HTML, minimal JavaScript, AVIF/WebP images. Accessible: keyboard navigation, skip link, screen-reader labels, reduced motion respected. Dashboard works in light (default) and dark.

## Success signals

- Visitors start the free trial or contact the team on WhatsApp.
- A new owner sees a dashboard that matches their trade within 10 minutes of signup.
