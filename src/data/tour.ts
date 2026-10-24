import type { ScreenId } from './dashboard';

/*
 * Steps of the guided tour of the merchant space, in menu order. A step tied to a screen only
 * shows to roles that can open it. `target` names the `data-tour` element to spotlight: the
 * menu entry of the screen by default.
 */

export type TourStep = {
  id: string;
  screen?: ScreenId;
  target: string;
  title: string;
  summary: string;
  how: string[];
};

const screenStep = (screen: ScreenId, title: string, summary: string, how: string[]): TourStep => ({
  id: screen,
  screen,
  target: `nav-${screen}`,
  title,
  summary,
  how,
});

export const TOUR_STEPS: TourStep[] = [
  screenStep(
    'dash',
    'Tableau de bord',
    'Votre journée en un coup d’œil : chiffre d’affaires, nombre de ventes, marge, stock à surveiller et versements.',
    [
      'Changez la période en haut à droite : aujourd’hui, 7 jours ou 30 jours.',
      'Touchez une vente récente pour l’ouvrir dans la liste des ventes.',
      'Les cartes rouges signalent ce qui demande une action.',
    ],
  ),
  screenStep(
    'pos',
    'Caisse',
    'Encaissez une vente en quelques secondes, en espèces, MTN MoMo, Orange Money ou virement.',
    [
      'Cherchez un article ou touchez-le pour l’ajouter au panier.',
      'Choisissez le moyen de paiement ; en espèces, la monnaie à rendre est calculée pour vous.',
      'Validez : le stock baisse tout seul et le reçu s’imprime ou part sur WhatsApp.',
    ],
  ),
  screenStep('sales', 'Ventes', 'L’historique de chaque vente, avec son reçu et sa facture.', [
    'Filtrez par période, boutique, statut ou moyen de paiement.',
    'Ouvrez une vente pour réimprimer le reçu, faire une facture ou enregistrer un retour.',
    'Une vente annulée remet ses articles en stock automatiquement.',
  ]),
  screenStep(
    'products',
    'Produits',
    'Votre catalogue : prix de vente, prix d’achat, variantes et seuil d’alerte de chaque article.',
    [
      'Touchez « Nouveau produit », choisissez sa catégorie puis remplissez ses caractéristiques.',
      'Les variantes (taille, couleur, mémoire…) ont chacune leur prix et leur stock.',
      'Le seuil d’alerte vous prévient avant la rupture.',
    ],
  ),
  screenStep(
    'categories',
    'Catégories',
    'Les familles de produits de votre activité, déjà prêtes avec leurs caractéristiques (marque, taille, couleur…).',
    [
      'Ajoutez une catégorie ou une sous-catégorie si un rayon manque.',
      'Ajoutez une caractéristique : elle apparaît aussitôt dans la fiche produit.',
      'Cochez « variante » quand chaque valeur a son propre stock, comme les pointures.',
    ],
  ),
  screenStep('stock', 'Stock', 'Ce que vous avez en rayon, article par article, et chaque mouvement de marchandise.', [
    '« Entrée » ou « Sortie » pour une marchandise reçue, cassée, perdue ou donnée.',
    'L’onglet Inventaire compare votre comptage au stock affiché et corrige les écarts.',
    'Les filtres « À réapprovisionner » et « En rupture » montrent ce qu’il faut racheter.',
  ]),
  screenStep('suppliers', 'Fournisseurs', 'Vos fournisseurs et les livraisons que vous recevez d’eux.', [
    'Ajoutez un fournisseur avec son contact et son numéro.',
    '« Nouvelle réception » : saisissez les quantités et le prix d’achat, le stock monte tout seul.',
    'L’historique garde chaque bon de livraison.',
  ]),
  screenStep(
    'reports',
    'Rapports',
    'Vos chiffres sur la durée : ventes par catégorie et par vendeur, produits les plus vendus, valeur du stock.',
    [
      'Comparez avec la période précédente pour voir si vous progressez.',
      'Touchez « Exporter » pour envoyer les ventes à votre comptable (fichier Excel).',
    ],
  ),
  screenStep(
    'deposits',
    'Versements',
    'Le contrôle de la caisse : chaque soir le gérant déclare l’argent remis, le propriétaire vérifie.',
    [
      'Le gérant déclare le montant remis et le moyen : espèces, MoMo ou virement.',
      'GOLDSTOCK le compare aux ventes en espèces du jour et signale tout écart.',
      'Le propriétaire valide le versement ou signale l’écart.',
    ],
  ),
  screenStep(
    'expenses',
    'Dépenses',
    'Loyer, ENEO, transport, salaires : notez chaque sortie d’argent de la boutique.',
    [
      '« Nouvelle dépense » : montant, motif, catégorie et qui a payé.',
      'Suivez votre bénéfice du mois, une fois les dépenses retirées.',
    ],
  ),
  screenStep(
    'team',
    'Équipe',
    'Invitez vos gérants, vendeurs et magasiniers. Chacun ne voit que ce que son rôle permet.',
    [
      '« Inviter un membre » : nom, numéro, rôle et boutique de la personne.',
      'Changez un rôle ou suspendez un accès à tout moment.',
      'Le tableau « Qui peut faire quoi ? » résume les droits de chaque rôle.',
    ],
  ),
  screenStep('subscription', 'Abonnement', 'Votre essai gratuit, votre formule et vos factures GOLDSTOCK.', [
    'Choisissez une formule avant la fin de l’essai pour garder vos données.',
    'Payez par MTN MoMo ou Orange Money, sans carte bancaire.',
  ]),
  screenStep(
    'settings',
    'Paramètres',
    'Les informations de votre entreprise, vos boutiques, le reçu, les alertes et l’apparence.',
    [
      'Entreprise : ajoutez votre logo, votre NIU et votre RCCM ; ils figurent sur vos factures.',
      'Boutiques : indiquez l’adresse ou ouvrez une nouvelle boutique.',
      'Caisse et reçus : écrivez le message imprimé en bas de chaque reçu.',
    ],
  ),
  screenStep('support', 'Assistance', 'Une question, un souci ? L’équipe GOLDSTOCK répond sur WhatsApp.', [
    'Écrivez-nous directement sur WhatsApp, ou envoyez une demande depuis cette page.',
  ]),
  {
    id: 'search',
    target: 'search',
    title: 'Recherche',
    summary: 'Retrouvez un produit, une vente ou un membre de l’équipe depuis n’importe quelle page.',
    how: ['Tapez au moins deux lettres, un numéro de vente ou le nom d’un client.', 'Raccourci clavier : la touche /.'],
  },
  {
    id: 'notifications',
    target: 'notifications',
    title: 'Notifications',
    summary: 'Les ruptures de stock, les versements à vérifier et les rappels d’abonnement arrivent ici.',
    how: ['Un point rouge signale du nouveau ; touchez une notification pour aller droit à la page concernée.'],
  },
  {
    id: 'account',
    target: 'account',
    title: 'Votre compte',
    summary: 'Votre profil, la déconnexion et l’aperçu de l’espace tel que le voient vos employés.',
    how: [
      '« Voir l’espace en tant que » : vérifiez ce qu’un vendeur ou un gérant peut faire.',
      'Vous pouvez relancer cette visite guidée depuis ce menu à tout moment.',
    ],
  },
];
