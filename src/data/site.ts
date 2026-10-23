export const site = {
  name: 'GOLDSTOCK',
  title: 'GOLDSTOCK — Gestion de stock et de ventes pour les commerces camerounais',
  description:
    'GOLDSTOCK centralise vos produits, vos ventes, vos stocks, vos employés et les versements de vos gérants. Essai gratuit 7 jours, sans carte bancaire.',
  locale: 'fr_CM',
  appUrl: '/app',
  signupUrl: '/essai-gratuit',
  loginUrl: '/connexion',
  trialDays: 7,
  whatsappNumber: '18733000708',
  supportPhone: '+1 (873) 300-0708',
  email: 'contact@goldstock.cm',
  demoVideoUrl: '',
} as const;

export const whatsappUrl = (message = 'Bonjour GOLDSTOCK, je souhaite en savoir plus.') =>
  `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(message)}`;

export type NavLink = { label: string; href: string; external?: boolean };

export const mainNav: NavLink[] = [
  { label: 'Fonctionnalités', href: '#fonctionnalites' },
  { label: 'Comment ça marche', href: '#comment-ca-marche' },
  { label: 'Tarifs', href: '#tarifs' },
  { label: 'FAQ', href: '#faq' },
];

export const resourcesNav: (NavLink & { description: string })[] = [
  {
    label: 'Guide de démarrage',
    description: 'Configurez votre boutique en 10 minutes.',
    href: '#comment-ca-marche',
  },
  {
    label: "Centre d'aide",
    description: 'Les réponses aux questions fréquentes.',
    href: '#faq',
  },
  {
    label: 'Assistance WhatsApp',
    description: 'Une équipe disponible 7j/7.',
    href: whatsappUrl(),
    external: true,
  },
];

export const heroChecks = ['Sans carte bancaire', 'Toutes les fonctionnalités', 'Assistance WhatsApp'];

export const benefits = [
  { icon: 'rocket', title: 'Simple à utiliser', text: 'Une interface claire et intuitive' },
  { icon: 'device', title: 'Accessible partout', text: 'Sur ordinateur et smartphone' },
  { icon: 'flag', title: 'Adapté au Cameroun', text: 'FCFA et pratiques locales' },
  { icon: 'support', title: 'Support réactif', text: 'Une équipe à votre écoute' },
] as const;

export const features = [
  {
    icon: 'stock',
    title: 'Gestion de stock',
    text: 'Suivez vos produits en temps réel, alertes de stock faible, inventaires.',
  },
  {
    icon: 'sales',
    title: 'Ventes et caisse',
    text: 'Interface de caisse rapide, reçus et historique complet.',
  },
  {
    icon: 'catalog',
    title: 'Produits personnalisables',
    text: 'Catégories, caractéristiques et variantes selon votre activité.',
  },
  {
    icon: 'reports',
    title: 'Rapports et statistiques',
    text: 'Analysez vos ventes, vos marges et la performance de vos produits.',
  },
  {
    icon: 'team',
    title: 'Employés et accès',
    text: 'Ajoutez vos vendeurs, définissez leurs droits et suivez leur activité.',
  },
  {
    icon: 'payouts',
    title: 'Versements des gérants',
    text: 'Enregistrez chaque versement et rapprochez-le des ventes du jour.',
  },
] as const;

export const steps = [
  {
    title: 'Créez votre compte',
    text: 'Inscription en 2 minutes avec votre numéro de téléphone. Aucune carte bancaire demandée.',
  },
  {
    title: 'Ajoutez vos produits',
    text: 'Importez votre catalogue, vos boutiques et vos employés. Notre équipe peut le faire avec vous.',
  },
  {
    title: 'Vendez et suivez',
    text: 'Encaissez depuis la caisse, recevez les alertes de stock et suivez chaque franc en temps réel.',
  },
] as const;

export type Role = {
  icon: 'owner' | 'manager' | 'seller' | 'storekeeper';
  name: string;
  summary: string;
  permissions: { label: string; allowed: boolean }[];
};

export const roles: Role[] = [
  {
    icon: 'owner',
    name: 'Propriétaire',
    summary: 'Accès complet',
    permissions: [
      { label: 'Encaisser les ventes', allowed: true },
      { label: 'Marges et prix d’achat', allowed: true },
      { label: 'Gérer l’équipe et les accès', allowed: true },
      { label: 'Abonnement et facturation', allowed: true },
    ],
  },
  {
    icon: 'manager',
    name: 'Gérant',
    summary: 'Gère la boutique',
    permissions: [
      { label: 'Encaisser les ventes', allowed: true },
      { label: 'Voir les marges', allowed: true },
      { label: 'Versements et rapports', allowed: true },
      { label: 'Abonnement et facturation', allowed: false },
    ],
  },
  {
    icon: 'seller',
    name: 'Vendeur',
    summary: 'Encaisse en caisse',
    permissions: [
      { label: 'Encaisser les ventes', allowed: true },
      { label: 'Voir ses propres ventes', allowed: true },
      { label: 'Voir les marges', allowed: false },
      { label: 'Annuler une vente', allowed: false },
    ],
  },
  {
    icon: 'storekeeper',
    name: 'Magasinier',
    summary: 'Gère le stock',
    permissions: [
      { label: 'Produits et stock', allowed: true },
      { label: 'Réceptions fournisseurs', allowed: true },
      { label: 'Encaisser les ventes', allowed: false },
      { label: 'Voir le chiffre d’affaires', allowed: false },
    ],
  },
];

export type Plan = {
  id: string;
  name: string;
  tagline: string;
  monthlyPrice: number;
  features: string[];
  highlighted?: boolean;
};

export const plans: Plan[] = [
  {
    id: 'demarrage',
    name: 'Démarrage',
    tagline: 'Pour une boutique qui se lance.',
    monthlyPrice: 5000,
    features: [
      '1 boutique',
      '2 utilisateurs',
      "Jusqu'à 500 produits",
      'Caisse et gestion de stock',
      'Rapports essentiels',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'Pour les commerces en croissance.',
    monthlyPrice: 12000,
    highlighted: true,
    features: [
      "Jusqu'à 3 boutiques",
      '10 utilisateurs',
      'Produits illimités',
      'Versements des gérants',
      'Rapports avancés et marges',
      'Assistance WhatsApp prioritaire',
    ],
  },
  {
    id: 'entreprise',
    name: 'Entreprise',
    tagline: 'Pour les réseaux de boutiques.',
    monthlyPrice: 25000,
    features: [
      'Boutiques illimitées',
      'Utilisateurs illimités',
      'Transferts entre boutiques',
      'Rôles et permissions avancés',
      'Accompagnement dédié',
    ],
  },
];

export const faqs = [
  {
    q: "L'essai gratuit est-il vraiment sans engagement\u00a0?",
    a: "Oui. Vous profitez de toutes les fonctionnalités pendant 7 jours, sans carte bancaire. À la fin de l'essai, vous choisissez librement de continuer ou non.",
  },
  {
    q: 'Puis-je utiliser GOLDSTOCK sur mon téléphone\u00a0?',
    a: 'GOLDSTOCK fonctionne sur ordinateur, tablette et smartphone. Vous pouvez encaisser une vente ou vérifier votre stock où que vous soyez.',
  },
  {
    q: 'Comment payer mon abonnement\u00a0?',
    a: 'Par Mobile Money (MTN MoMo, Orange Money) ou par carte bancaire. Les prix sont en FCFA, sans frais cachés.',
  },
  {
    q: 'Puis-je gérer plusieurs boutiques\u00a0?',
    a: 'Oui. Selon votre formule, vous suivez plusieurs boutiques depuis un seul compte, avec des stocks, des vendeurs et des versements séparés.',
  },
  {
    q: 'Mes données sont-elles en sécurité\u00a0?',
    a: 'Vos données sont chiffrées et sauvegardées automatiquement chaque jour. Chaque employé n’accède qu’aux informations autorisées par son rôle.',
  },
  {
    q: "Que se passe-t-il si je n'ai pas internet\u00a0?",
    a: "La caisse continue d'enregistrer vos ventes hors connexion. Elles sont synchronisées automatiquement dès le retour du réseau.",
  },
];

export const cities = [
  'Douala',
  'Yaoundé',
  'Bafoussam',
  'Bamenda',
  'Garoua',
  'Maroua',
  'Ngaoundéré',
  'Bertoua',
  'Ebolowa',
  'Kribi',
  'Limbé',
  'Buea',
  'Autre ville',
];

export type Billing = 'monthly' | 'yearly';

export const FREE_MONTHS_PER_YEAR = 2;
export const yearlyTotal = (monthly: number) => monthly * (12 - FREE_MONTHS_PER_YEAR);
export const yearlyPerMonth = (monthly: number) => Math.round(yearlyTotal(monthly) / 12 / 100) * 100;

export const formatFcfa = (value: number) =>
  `${new Intl.NumberFormat('fr-FR').format(value).replace(/\s/g, '\u00a0')}\u00a0FCFA`;
