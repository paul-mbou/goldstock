# GOLDSTOCK — Landing page

Site vitrine de GOLDSTOCK (gestion de stock et de ventes pour les commerces camerounais), construit avec **Astro 7**, **React 19** et **Tailwind CSS 4**.

## Commandes

| Commande          | Action                                         |
| :---------------- | :--------------------------------------------- |
| `npm install`     | Installe les dépendances                       |
| `npm run dev`     | Serveur de développement sur `localhost:4321`  |
| `npm run check`   | Vérification TypeScript / Astro                |
| `npm run build`   | Vérifie puis génère le site statique (`dist/`) |
| `npm run preview` | Prévisualise le build                          |
| `npm run format`  | Formate le code avec Prettier                  |

## Structure

```text
src/
├── data/site.ts            # Contenu, liens, tarifs, FAQ (point d'édition unique)
├── lib/auth.ts             # Appels API connexion / inscription, validation des numéros +237
├── layouts/
│   ├── Layout.astro        # <head> SEO, Open Graph, JSON-LD, lien d'évitement
│   └── AuthLayout.astro    # Mise en page connexion / essai gratuit
├── pages/
│   ├── index.astro         # Page d'accueil
│   ├── connexion.astro     # /connexion
│   └── essai-gratuit.astro # /essai-gratuit (accepte ?formule=…&facturation=…)
├── styles/global.css       # Tokens Tailwind (@theme), utilitaires, animations au défilement
└── components/
    ├── Header.tsx          # Île React : menu Ressources + menu mobile
    ├── VideoDialog.tsx     # Île React : <dialog> natif pour la démo vidéo
    ├── Pricing.tsx         # Île React : bascule mensuel / annuel
    ├── auth/               # Îles React : formulaires de connexion et d'essai gratuit
    ├── brand/              # Logo, drapeau, icône WhatsApp
    └── sections/           # Sections statiques de la page
```

## Connexion et essai gratuit

Les formulaires appellent l'API définie par `PUBLIC_API_URL` (voir `.env.example`) :

- `POST /auth/login` — `{ phone, password, remember }` ; `401` = identifiants incorrects.
- `POST /auth/signup` — `{ fullName, shopName, phone, city, password, plan, billing }` ; `409` = numéro déjà utilisé.

Le numéro est envoyé au format `+2376XXXXXXXX`, la session passe par cookie (`credentials: 'include'`), et la réponse peut fournir `redirectUrl` (sinon redirection vers `appUrl`).

Tant que `PUBLIC_API_URL` n'est pas défini, l'essai gratuit masque le mot de passe et prépare la demande sur WhatsApp (nom, boutique, ville, téléphone, formule), et la page de connexion indique que l'accès en ligne ouvre bientôt.

Seuls les composants interactifs sont hydratés (`client:load`, `client:idle`, `client:visible`) ; tout le reste est rendu en HTML statique.

## À configurer avant la mise en ligne

Dans `.env` : `PUBLIC_API_URL`. Dans `src/data/site.ts` : `appUrl`, `whatsappNumber`, `email`, `demoVideoUrl` (vide = message d'attente avec lien WhatsApp), et les prix des formules. Dans `astro.config.mjs` : `site` (utilisé pour l'URL canonique).
