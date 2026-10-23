import { formatFcfa } from './site';

export { formatFcfa };

/*
 * Demo data for the merchant space. Everything is derived from a fixed clock and a seeded
 * generator so the server render and the hydrated islands always agree.
 */

const TZ = 'Africa/Douala';
export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export const NOW = Date.parse('2026-10-23T14:30:00+01:00');
export const TODAY_START = Date.parse('2026-10-23T00:00:00+01:00');

function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

function weighted<T>(rand: () => number, entries: readonly (readonly [T, number])[]) {
  let x = rand() * entries.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [value, weight] of entries) {
    x -= weight;
    if (x <= 0) return value;
  }
  return entries[0][0];
}

/* ------------------------------------------------------------------ formatting */

const dateFormat = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, ...options });

const fullDate = dateFormat({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const longDay = dateFormat({ weekday: 'long', day: 'numeric', month: 'long' });
const shortDate = dateFormat({ day: '2-digit', month: '2-digit', year: 'numeric' });
const dayMonth = dateFormat({ day: 'numeric', month: 'short' });
const weekday = dateFormat({ weekday: 'short' });
const dayOfMonth = dateFormat({ day: 'numeric' });
const time = dateFormat({ hour: '2-digit', minute: '2-digit' });

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const formatFullDate = (ts: number) => capitalize(fullDate.format(ts));
export const formatLongDay = (ts: number) => capitalize(longDay.format(ts));
export const formatShortDate = (ts: number) => shortDate.format(ts);
export const formatDayMonth = (ts: number) => dayMonth.format(ts);
export const formatWeekday = (ts: number) => capitalize(weekday.format(ts).replace('.', ''));
export const formatDayOfMonth = (ts: number) => dayOfMonth.format(ts);
export const formatTime = (ts: number) => time.format(ts).replace(':', 'h');

/** "Aujourd'hui, 11h20", "Hier, 18h05" or "19 oct., 10h40". */
export function formatWhen(ts: number) {
  const days = Math.floor((TODAY_START + DAY - 1 - ts) / DAY);
  const day = days <= 0 ? 'Aujourd’hui' : days === 1 ? 'Hier' : formatDayMonth(ts);
  return `${day}, ${formatTime(ts)}`;
}

/** "à l'instant", "il y a 12 min", "il y a 3 h", "il y a 2 j". */
export function formatAgo(ts: number) {
  const minutes = Math.round((NOW - ts) / MINUTE);
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

export const formatNumber = (value: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(value)).replace(/\s/g, '\u00a0');

/** Axis labels: 250 000 → "250 k", 1 250 000 → "1,25 M". */
export function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })}\u00a0M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}\u00a0k`;
  return String(Math.round(value));
}

export const percentChange = (current: number, previous: number) =>
  previous === 0 ? 0 : Math.round(((current - previous) / previous) * 1000) / 10;

export const formatPercent = (value: number) => `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}\u00a0%`;

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

/* ------------------------------------------------------------------ business */

export const SHOPS = ['Akwa', 'Bonapriso'] as const;
export type Shop = (typeof SHOPS)[number];

export type Tone = 'gold' | 'navy' | 'teal' | 'rose' | 'violet';

/* ------------------------------------------------------------------ roles */

export type RoleId = 'owner' | 'manager' | 'seller' | 'stock';
export type ScreenId =
  | 'dash'
  | 'pos'
  | 'sales'
  | 'products'
  | 'categories'
  | 'stock'
  | 'suppliers'
  | 'reports'
  | 'deposits'
  | 'team'
  | 'subscription'
  | 'settings'
  | 'notifications'
  | 'support';

export type Role = {
  label: string;
  summary: string;
  memberId: string;
  screens: ScreenId[];
  /** Sees revenue figures at all. */
  revenue: boolean;
  /** Sees every sale, or only their own. */
  allSales: boolean;
  margins: boolean;
  costs: boolean;
  maxDiscount: number;
  cancel: boolean;
  editCatalog: boolean;
  manageTeam: boolean;
};

const everyScreen: ScreenId[] = [
  'dash',
  'pos',
  'sales',
  'products',
  'categories',
  'stock',
  'suppliers',
  'reports',
  'deposits',
  'team',
  'subscription',
  'settings',
  'notifications',
  'support',
];

export const ROLES: Record<RoleId, Role> = {
  owner: {
    label: 'Propriétaire',
    summary: 'Accès complet',
    memberId: 'u1',
    screens: everyScreen,
    revenue: true,
    allSales: true,
    margins: true,
    costs: true,
    maxDiscount: 30,
    cancel: true,
    editCatalog: true,
    manageTeam: true,
  },
  manager: {
    label: 'Gérant',
    summary: 'Gère la boutique au quotidien',
    memberId: 'u2',
    screens: everyScreen.filter((screen) => screen !== 'subscription'),
    revenue: true,
    allSales: true,
    margins: true,
    costs: true,
    maxDiscount: 20,
    cancel: true,
    editCatalog: true,
    manageTeam: false,
  },
  seller: {
    label: 'Vendeur',
    summary: 'Encaisse en caisse',
    memberId: 'u4',
    screens: ['dash', 'pos', 'sales', 'products', 'notifications', 'support'],
    revenue: true,
    allSales: false,
    margins: false,
    costs: false,
    maxDiscount: 10,
    cancel: false,
    editCatalog: false,
    manageTeam: false,
  },
  stock: {
    label: 'Magasinier',
    summary: 'Gère le stock et les réceptions',
    memberId: 'u6',
    screens: ['dash', 'products', 'categories', 'stock', 'suppliers', 'notifications', 'support'],
    revenue: false,
    allSales: false,
    margins: false,
    costs: true,
    maxDiscount: 0,
    cancel: false,
    editCatalog: true,
    manageTeam: false,
  },
};

export const ROLE_IDS = Object.keys(ROLES) as RoleId[];

/** Rows of the "Qui peut faire quoi ?" matrix. `true`, `false` or a short qualifier. */
export const permissionMatrix: { label: string; values: Record<RoleId, boolean | string> }[] = [
  { label: 'Encaisser les ventes', values: { owner: true, manager: true, seller: true, stock: false } },
  { label: 'Accorder une remise', values: { owner: '30 %', manager: '20 %', seller: '10 %', stock: false } },
  { label: 'Annuler ou rembourser', values: { owner: true, manager: true, seller: false, stock: false } },
  { label: 'Voir les marges', values: { owner: true, manager: true, seller: false, stock: 'Prix d’achat' } },
  { label: 'Modifier le catalogue', values: { owner: true, manager: true, seller: false, stock: true } },
  { label: 'Stock et réceptions', values: { owner: true, manager: true, seller: false, stock: true } },
  { label: 'Rapports', values: { owner: true, manager: true, seller: 'Ses ventes', stock: false } },
  { label: 'Versements des gérants', values: { owner: true, manager: true, seller: false, stock: false } },
  { label: 'Gérer l’équipe', values: { owner: true, manager: 'Lecture', seller: false, stock: false } },
  { label: 'Abonnement', values: { owner: true, manager: false, seller: false, stock: false } },
];

/* ------------------------------------------------------------------ navigation */

export type NavItem = { id: ScreenId; label: string; href: string };

export const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Principal',
    items: [
      { id: 'dash', label: 'Tableau de bord', href: '/app' },
      { id: 'pos', label: 'Caisse', href: '/app/caisse' },
      { id: 'sales', label: 'Ventes', href: '/app/ventes' },
    ],
  },
  {
    title: 'Catalogue',
    items: [
      { id: 'products', label: 'Produits', href: '/app/produits' },
      { id: 'categories', label: 'Catégories', href: '/app/categories' },
      { id: 'stock', label: 'Stock', href: '/app/stock' },
      { id: 'suppliers', label: 'Fournisseurs', href: '/app/fournisseurs' },
    ],
  },
  {
    title: 'Pilotage',
    items: [
      { id: 'reports', label: 'Rapports', href: '/app/rapports' },
      { id: 'deposits', label: 'Versements', href: '/app/versements' },
      { id: 'team', label: 'Équipe', href: '/app/equipe' },
    ],
  },
  {
    title: 'Compte',
    items: [
      { id: 'subscription', label: 'Abonnement', href: '/app/abonnement' },
      { id: 'settings', label: 'Paramètres', href: '/app/parametres' },
      { id: 'support', label: 'Assistance', href: '/app/assistance' },
    ],
  },
];

export const navItems: NavItem[] = [
  ...navGroups.flatMap((group) => group.items),
  { id: 'notifications', label: 'Notifications', href: '/app/notifications' },
];

export const screenHref = Object.fromEntries(navItems.map((item) => [item.id, item.href])) as Record<ScreenId, string>;

/* ------------------------------------------------------------------ payments */

export type PayId = 'cash' | 'mtn' | 'om' | 'transfer';

export const PAYMENTS: { id: PayId; label: string; short: string; color: string }[] = [
  { id: 'cash', label: 'Espèces', short: 'Espèces', color: '#10b981' },
  { id: 'mtn', label: 'MTN Mobile Money', short: 'MTN MoMo', color: '#f4b52c' },
  { id: 'om', label: 'Orange Money', short: 'Orange Money', color: '#f97316' },
  { id: 'transfer', label: 'Virement', short: 'Virement', color: '#5b6680' },
];

export const payLabel = (id: PayId) => PAYMENTS.find((pay) => pay.id === id)!.short;

/* ------------------------------------------------------------------ catalogue */

export type AttrType = 'text' | 'number' | 'date' | 'list' | 'multi' | 'yesno' | 'color';

export const ATTR_TYPES: { id: AttrType; label: string }[] = [
  { id: 'text', label: 'Texte' },
  { id: 'number', label: 'Nombre' },
  { id: 'date', label: 'Date' },
  { id: 'list', label: 'Liste' },
  { id: 'multi', label: 'Choix multiples' },
  { id: 'yesno', label: 'Oui / Non' },
  { id: 'color', label: 'Couleur' },
];

export type Attribute = {
  id: string;
  name: string;
  type: AttrType;
  options: string[];
  /** Each value gets its own stock line, SKU and price (size, colour…). */
  variant: boolean;
  required: boolean;
  hint?: string;
};

export type CategoryIcon = 'phone' | 'shoe' | 'shirt' | 'drop' | 'tag';

export type Category = {
  id: string;
  name: string;
  code: string;
  icon: CategoryIcon;
  tone: Tone;
  subs: string[];
  attrs: Attribute[];
  archived: boolean;
};

export const SWATCHES: Record<string, string> = {
  Noir: '#1f2937',
  Blanc: '#ffffff',
  Bleu: '#2f5fd0',
  Vert: '#2e7d32',
  Marron: '#6d4c41',
  Beige: '#d8c3a5',
  Rouge: '#c62828',
  Rose: '#d81b60',
  Or: '#e89d12',
  Gris: '#9ca3af',
  Multicolore: 'conic-gradient(#e89d12, #c62828, #2f5fd0, #2e7d32, #e89d12)',
};

const attr = (
  id: string,
  name: string,
  type: AttrType,
  options: string[] = [],
  extra: Partial<Pick<Attribute, 'variant' | 'required' | 'hint'>> = {},
): Attribute => ({ id, name, type, options, variant: false, required: false, ...extra });

const seedCategories: Category[] = [
  {
    id: 'tel',
    name: 'Téléphones',
    code: 'TEL',
    icon: 'phone',
    tone: 'gold',
    subs: ['Smartphones', 'Accessoires'],
    archived: false,
    attrs: [
      attr('tel_brand', 'Marque', 'list', ['Samsung', 'Tecno', 'Infinix', 'Apple', 'Itel', 'Oraimo'], {
        required: true,
      }),
      attr('tel_model', 'Modèle', 'text', [], { required: true }),
      attr('tel_mem', 'Mémoire', 'list', ['64 Go', '128 Go', '256 Go'], { variant: true }),
      attr('tel_color', 'Couleur', 'color', ['Noir', 'Bleu', 'Blanc', 'Vert'], { variant: true }),
      attr('tel_imei', 'IMEI', 'text', [], { hint: '15 chiffres' }),
      attr('tel_dual', 'Double SIM', 'yesno'),
    ],
  },
  {
    id: 'cha',
    name: 'Chaussures',
    code: 'CHA',
    icon: 'shoe',
    tone: 'navy',
    subs: ['Homme', 'Femme', 'Enfant'],
    archived: false,
    attrs: [
      attr('cha_brand', 'Marque', 'text'),
      attr('cha_size', 'Pointure', 'list', ['37', '38', '39', '40', '41', '42', '43', '44', '45'], {
        variant: true,
      }),
      attr('cha_color', 'Couleur', 'color', ['Noir', 'Marron', 'Blanc', 'Beige'], { variant: true }),
      attr('cha_mat', 'Matière', 'list', ['Cuir', 'Daim', 'Toile', 'Synthétique']),
    ],
  },
  {
    id: 'vet',
    name: 'Vêtements',
    code: 'VET',
    icon: 'shirt',
    tone: 'teal',
    subs: ['Robes', 'Chemises', 'Ensembles'],
    archived: false,
    attrs: [
      attr('vet_size', 'Taille', 'list', ['S', 'M', 'L', 'XL', 'XXL'], { variant: true }),
      attr('vet_color', 'Couleur', 'color', ['Noir', 'Blanc', 'Bleu', 'Rouge', 'Multicolore'], { variant: true }),
      attr('vet_mat', 'Matière', 'list', ['Coton', 'Wax', 'Lin', 'Polyester']),
      attr('vet_occ', 'Occasions', 'multi', ['Quotidien', 'Bureau', 'Cérémonie', 'Week-end']),
    ],
  },
  {
    id: 'cos',
    name: 'Cosmétiques',
    code: 'COS',
    icon: 'drop',
    tone: 'rose',
    subs: ['Soins corps', 'Soins visage', 'Parfums'],
    archived: false,
    attrs: [
      attr('cos_brand', 'Marque', 'text', [], { required: true }),
      attr('cos_vol', 'Volume (ml)', 'number', [], { required: true }),
      attr('cos_type', 'Type de produit', 'list', ['Crème', 'Lait', 'Sérum', 'Huile', 'Parfum', 'Savon']),
      attr('cos_exp', 'Date d’expiration', 'date'),
      attr('cos_bio', 'Naturel ou bio', 'yesno'),
    ],
  },
];

export type Variant = {
  id: string;
  sku: string;
  /** "128 Go · Noir"; empty for a product without variants. */
  label: string;
  price: number;
  cost: number;
  stock: number;
};

export type ProductStatus = 'active' | 'draft' | 'archived';
export type AttrValue = string | string[] | boolean;

export type Product = {
  id: string;
  name: string;
  cat: string;
  sub: string;
  attrs: Record<string, AttrValue>;
  min: number;
  status: ProductStatus;
  description: string;
  variants: Variant[];
  created: number;
};

const v = (id: string, sku: string, label: string, price: number, cost: number, stock: number): Variant => ({
  id,
  sku,
  label,
  price,
  cost,
  stock,
});

const product = (
  id: string,
  name: string,
  cat: string,
  sub: string,
  attrs: Record<string, AttrValue>,
  min: number,
  variants: Variant[],
  ageDays = 60,
): Product => ({
  id,
  name,
  cat,
  sub,
  attrs,
  min,
  status: 'active',
  description: '',
  variants,
  created: TODAY_START - ageDays * DAY,
});

const seedProducts: Product[] = [
  product(
    'p1',
    'Samsung Galaxy A15',
    'tel',
    'Smartphones',
    { tel_brand: 'Samsung', tel_model: 'Galaxy A15', tel_dual: true },
    3,
    [
      v('p1a', 'TEL-SAMA15-128-NOI', '128 Go · Noir', 115_000, 98_000, 6),
      v('p1b', 'TEL-SAMA15-128-BLE', '128 Go · Bleu', 115_000, 98_000, 3),
    ],
  ),
  product(
    'p2',
    'Tecno Spark 20 Pro',
    'tel',
    'Smartphones',
    { tel_brand: 'Tecno', tel_model: 'Spark 20 Pro', tel_dual: true },
    3,
    [v('p2a', 'TEL-TECS20-256-NOI', '256 Go · Noir', 95_000, 80_000, 8)],
  ),
  product(
    'p3',
    'Infinix Hot 40i',
    'tel',
    'Smartphones',
    { tel_brand: 'Infinix', tel_model: 'Hot 40i', tel_dual: true },
    3,
    [v('p3a', 'TEL-INFH40-128-VER', '128 Go · Vert', 68_000, 57_000, 2)],
  ),
  product(
    'p4',
    'iPhone 11 reconditionné',
    'tel',
    'Smartphones',
    { tel_brand: 'Apple', tel_model: 'iPhone 11', tel_dual: false },
    1,
    [v('p4a', 'TEL-IPH11-64-BLA', '64 Go · Blanc', 185_000, 158_000, 0)],
  ),
  product(
    'p5',
    'Écouteurs sans fil FreePods',
    'tel',
    'Accessoires',
    { tel_brand: 'Oraimo', tel_model: 'FreePods 4' },
    5,
    [v('p5a', 'TEL-ORAFP4', '', 15_000, 9_500, 24)],
  ),
  product(
    'p6',
    'Chargeur rapide 25 W USB-C',
    'tel',
    'Accessoires',
    { tel_brand: 'Samsung', tel_model: 'EP-T2510' },
    10,
    [v('p6a', 'TEL-CHG25W', '', 6_500, 3_500, 31)],
  ),
  product('p7', 'Baskets cuir blanches', 'cha', 'Homme', { cha_brand: 'Mboa Street', cha_mat: 'Cuir' }, 2, [
    v('p7a', 'CHA-BASK-40-BLA', '40 · Blanc', 25_000, 14_000, 3),
    v('p7b', 'CHA-BASK-41-BLA', '41 · Blanc', 25_000, 14_000, 5),
    v('p7c', 'CHA-BASK-42-BLA', '42 · Blanc', 25_000, 14_000, 2),
    v('p7d', 'CHA-BASK-43-BLA', '43 · Blanc', 25_000, 14_000, 0),
  ]),
  product('p8', 'Sandales cuir homme', 'cha', 'Homme', { cha_brand: 'Artisan Foumban', cha_mat: 'Cuir' }, 4, [
    v('p8a', 'CHA-SAND-MAR', '', 12_000, 6_500, 14),
  ]),
  product('p9', 'Escarpins vernis', 'cha', 'Femme', { cha_brand: 'Élégance', cha_mat: 'Synthétique' }, 3, [
    v('p9a', 'CHA-ESCA-39-NOI', '39 · Noir', 18_000, 10_000, 2),
    v('p9b', 'CHA-ESCA-40-NOI', '40 · Noir', 18_000, 10_000, 3),
  ]),
  product('p10', 'Robe pagne wax', 'vet', 'Robes', { vet_mat: 'Wax', vet_occ: ['Cérémonie', 'Week-end'] }, 2, [
    v('p10a', 'VET-ROBW-M-MUL', 'M · Multicolore', 22_000, 12_000, 5),
    v('p10b', 'VET-ROBW-L-MUL', 'L · Multicolore', 22_000, 12_000, 3),
  ]),
  product('p11', 'Chemise lin homme', 'vet', 'Chemises', { vet_mat: 'Lin', vet_occ: ['Bureau'] }, 4, [
    v('p11a', 'VET-CHLN-BLA', '', 15_000, 8_000, 11),
  ]),
  product(
    'p12',
    'Ensemble kaba brodé',
    'vet',
    'Ensembles',
    { vet_mat: 'Coton', vet_occ: ['Quotidien', 'Cérémonie'] },
    2,
    [v('p12a', 'VET-KABA', '', 30_000, 17_000, 6)],
  ),
  product(
    'p13',
    'Lait corporel karité 400 ml',
    'cos',
    'Soins corps',
    { cos_brand: 'Karité d’Or', cos_vol: '400', cos_type: 'Lait', cos_bio: true },
    10,
    [v('p13a', 'COS-LAKA-400', '', 4_500, 2_600, 38)],
  ),
  product(
    'p14',
    'Sérum vitamine C 30 ml',
    'cos',
    'Soins visage',
    { cos_brand: 'Belle Peau', cos_vol: '30', cos_type: 'Sérum', cos_exp: '2027-08-31' },
    5,
    [v('p14a', 'COS-SERC-30', '', 9_500, 5_200, 7)],
  ),
  product(
    'p15',
    'Parfum Oud Royal 100 ml',
    'cos',
    'Parfums',
    { cos_brand: 'Maison Sawa', cos_vol: '100', cos_type: 'Parfum' },
    3,
    [v('p15a', 'COS-OUDR-100', '', 16_000, 9_000, 1)],
  ),
  product(
    'p16',
    'Huile de coco vierge 250 ml',
    'cos',
    'Soins corps',
    { cos_brand: 'Kribi Naturel', cos_vol: '250', cos_type: 'Huile', cos_bio: true },
    8,
    [v('p16a', 'COS-HCOC-250', '', 3_000, 1_600, 22)],
  ),
];

/* ------------------------------------------------------------------ team */

export type MemberStatus = 'active' | 'invited' | 'suspended';

export type Member = {
  id: string;
  name: string;
  role: RoleId;
  phone: string;
  shop: Shop | 'Toutes';
  status: MemberStatus;
  lastSeen: number | null;
};

const seedTeam: Member[] = [
  {
    id: 'u1',
    name: 'Mireille Ngo Bella',
    role: 'owner',
    phone: '+237 699 41 22 08',
    shop: 'Toutes',
    status: 'active',
    lastSeen: NOW - 5 * MINUTE,
  },
  {
    id: 'u2',
    name: 'Patrick Essomba',
    role: 'manager',
    phone: '+237 677 10 54 31',
    shop: 'Akwa',
    status: 'active',
    lastSeen: NOW - 2 * HOUR,
  },
  {
    id: 'u3',
    name: 'Brenda Nkeng',
    role: 'manager',
    phone: '+237 690 22 18 74',
    shop: 'Bonapriso',
    status: 'active',
    lastSeen: NOW - 35 * MINUTE,
  },
  {
    id: 'u4',
    name: 'Junior Mbarga',
    role: 'seller',
    phone: '+237 655 82 19 47',
    shop: 'Akwa',
    status: 'active',
    lastSeen: NOW - 18 * MINUTE,
  },
  {
    id: 'u5',
    name: 'Aïcha Bouba',
    role: 'seller',
    phone: '+237 694 37 60 12',
    shop: 'Bonapriso',
    status: 'active',
    lastSeen: NOW - 50 * MINUTE,
  },
  {
    id: 'u6',
    name: 'Serge Tchoumi',
    role: 'stock',
    phone: '+237 651 08 77 90',
    shop: 'Toutes',
    status: 'active',
    lastSeen: NOW - 26 * HOUR,
  },
  {
    id: 'u7',
    name: 'Estelle Fotso',
    role: 'seller',
    phone: '+237 678 51 30 26',
    shop: 'Akwa',
    status: 'invited',
    lastSeen: null,
  },
];

/* ------------------------------------------------------------------ sales */

export type SaleLine = {
  pid: string;
  vid: string;
  name: string;
  label: string;
  cat: string;
  qty: number;
  price: number;
  cost: number;
  returned: number;
};

export type Sale = {
  id: string;
  at: number;
  shop: Shop;
  seller: string;
  customer: string;
  lines: SaleLine[];
  discount: number;
  pay: PayId;
  /** Cash handed over by the customer, to compute change. */
  received: number;
  reference: string;
  cancelled: boolean;
};

const customers = [
  'Vanessa Kouam',
  'Chantal Owona',
  'Estelle Nana',
  'Brice Kamdem',
  'Yannick Eto’o',
  'Clarisse Ndongo',
  'Paul Biyong',
  'Rachel Ewane',
];

const sellersByShop: Record<Shop, (readonly [string, number])[]> = {
  Akwa: [
    ['Junior Mbarga', 0.5],
    ['Patrick Essomba', 0.3],
    ['Mireille Ngo Bella', 0.2],
  ],
  Bonapriso: [
    ['Aïcha Bouba', 0.55],
    ['Brenda Nkeng', 0.35],
    ['Mireille Ngo Bella', 0.1],
  ],
};

function generateSales(products: Product[]): Sale[] {
  const rand = seeded(20261023);
  const items = products.flatMap((p) =>
    p.variants.map((variant) => {
      const weight = p.cat === 'tel' ? (p.sub === 'Accessoires' ? 2.2 : 0.7) : p.cat === 'cos' ? 2.4 : 1.1;
      return [{ p, variant }, weight] as const;
    }),
  );
  const pays = [
    ['cash', 0.48],
    ['mtn', 0.3],
    ['om', 0.18],
    ['transfer', 0.04],
  ] as const;
  const out: Omit<Sale, 'id'>[] = [];

  for (let d = 59; d >= 0; d--) {
    const dayStart = TODAY_START - d * DAY;
    const dow = new Date(dayStart + 12 * HOUR).getUTCDay();
    for (const shop of SHOPS) {
      let count = Math.round(3 + rand() * 4 + (dow === 6 ? 2 : 0) - (dow === 0 ? 2 : 0) + (d < 30 ? 1 : 0));
      let lastHour = 19.5;
      if (d === 0) {
        lastHour = (NOW - TODAY_START) / HOUR;
        count = Math.max(2, Math.round((count * (lastHour - 8)) / 11.5));
      }
      const times = Array.from({ length: count }, () => dayStart + (8 + rand() * (lastHour - 8)) * HOUR).sort(
        (a, b) => a - b,
      );
      for (const at of times) {
        const lineCount = rand() < 0.74 ? 1 : rand() < 0.85 ? 2 : 3;
        const lines: SaleLine[] = [];
        for (let i = 0; i < lineCount; i++) {
          const { p, variant } = weighted(rand, items);
          const existing = lines.find((line) => line.vid === variant.id);
          if (existing) {
            existing.qty++;
            continue;
          }
          lines.push({
            pid: p.id,
            vid: variant.id,
            name: p.name,
            label: variant.label,
            cat: p.cat,
            qty: p.cat === 'cos' && rand() < 0.3 ? 2 : 1,
            price: variant.price,
            cost: variant.cost,
            returned: 0,
          });
        }
        const gross = lines.reduce((sum, line) => sum + line.price * line.qty, 0);
        const discount = rand() < 0.1 ? roundTo(gross * 0.05, 500) : 0;
        const cancelled = rand() < 0.02;
        if (!cancelled && rand() < 0.015) lines[0].returned = lines[0].qty;
        const pay = weighted(rand, pays);
        out.push({
          at: Math.min(at, NOW - 4 * MINUTE),
          shop,
          seller: weighted(rand, sellersByShop[shop]),
          customer: rand() < 0.35 ? customers[Math.floor(rand() * customers.length)] : '',
          lines,
          discount,
          pay,
          received: 0,
          reference: pay === 'mtn' || pay === 'om' ? `MP${Math.floor(rand() * 9e9 + 1e9)}` : '',
          cancelled,
        });
      }
    }
  }

  out.sort((a, b) => a.at - b.at);
  return out.map((sale, index) => ({ ...sale, id: `V-${10_400 + index}` })).reverse();
}

export const saleGross = (sale: Sale) => sale.lines.reduce((sum, line) => sum + line.price * line.qty, 0);

/** What the customer finally paid, after discount and returns. */
export function saleNet(sale: Sale) {
  if (sale.cancelled) return 0;
  const gross = saleGross(sale);
  const kept = sale.lines.reduce((sum, line) => sum + line.price * (line.qty - line.returned), 0);
  return gross ? Math.round(kept - (sale.discount * kept) / gross) : 0;
}

export const saleCost = (sale: Sale) =>
  sale.cancelled ? 0 : sale.lines.reduce((sum, line) => sum + line.cost * (line.qty - line.returned), 0);

export const saleItems = (sale: Sale) => sale.lines.reduce((sum, line) => sum + line.qty, 0);

export type SaleState = 'ok' | 'partial' | 'refunded' | 'cancelled';

export function saleState(sale: Sale): SaleState {
  if (sale.cancelled) return 'cancelled';
  const returned = sale.lines.reduce((sum, line) => sum + line.returned, 0);
  if (!returned) return 'ok';
  return returned >= saleItems(sale) ? 'refunded' : 'partial';
}

/* ------------------------------------------------------------------ deposits */

export type DepositStatus = 'pending' | 'verified' | 'flagged';

export type Deposit = {
  id: string;
  day: number;
  shop: Shop;
  manager: string;
  expected: number;
  deposited: number;
  depositedAt: number;
  method: string;
  status: DepositStatus;
  note: string;
};

const managers: Record<Shop, string> = { Akwa: 'Patrick Essomba', Bonapriso: 'Brenda Nkeng' };

const knownGaps: Record<string, { gap: number; note?: string; status?: DepositStatus }> = {
  '1-Akwa': { gap: -15_000 },
  '4-Akwa': {
    gap: -5_000,
    status: 'flagged',
    note: 'Patrick dit avoir rendu la monnaie sur un billet de 10 000. À retenir sur sa prochaine paie.',
  },
  '7-Bonapriso': { gap: -2_500 },
};

function buildDeposits(sales: Sale[]): Deposit[] {
  const out: Deposit[] = [];
  for (let d = 1; d <= 10; d++) {
    const day = TODAY_START - d * DAY;
    for (const shop of SHOPS) {
      const expected = sales
        .filter((sale) => sale.shop === shop && sale.pay === 'cash' && sale.at >= day && sale.at < day + DAY)
        .reduce((sum, sale) => sum + saleNet(sale), 0);
      const known = knownGaps[`${d}-${shop}`];
      out.push({
        id: `D-${d}-${shop}`,
        day,
        shop,
        manager: managers[shop],
        expected,
        deposited: expected + (known?.gap ?? 0),
        depositedAt: day + (shop === 'Akwa' ? 19.58 : 19.87) * HOUR,
        method: shop === 'Akwa' ? 'Espèces' : 'MTN MoMo',
        status: d === 1 ? 'pending' : (known?.status ?? 'verified'),
        note: known?.note ?? '',
      });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ stock, suppliers */

export type MoveType = 'reception' | 'adjust' | 'loss' | 'return' | 'inventory';

export const MOVE_LABELS: Record<MoveType, string> = {
  reception: 'Réception',
  adjust: 'Ajustement',
  loss: 'Casse ou perte',
  return: 'Retour client',
  inventory: 'Inventaire',
};

export type Move = { id: string; at: number; type: MoveType; item: string; qty: number; user: string; note: string };

const seedMoves: Move[] = [
  {
    id: 'm6',
    at: NOW - 55 * MINUTE,
    type: 'reception',
    item: 'Lait corporel karité 400 ml',
    qty: 12,
    user: 'Serge Tchoumi',
    note: 'Réception R-0231',
  },
  {
    id: 'm5',
    at: NOW - 2 * HOUR,
    type: 'loss',
    item: 'Escarpins vernis · 39 · Noir',
    qty: -1,
    user: 'Patrick Essomba',
    note: 'Talon cassé',
  },
  {
    id: 'm4',
    at: NOW - DAY,
    type: 'reception',
    item: 'Samsung Galaxy A15 · 128 Go · Bleu',
    qty: 4,
    user: 'Serge Tchoumi',
    note: 'Réception R-0230',
  },
  {
    id: 'm3',
    at: NOW - 2 * DAY,
    type: 'return',
    item: 'Chargeur rapide 25 W USB-C',
    qty: 1,
    user: 'Aïcha Bouba',
    note: 'Retour client',
  },
  {
    id: 'm2',
    at: NOW - 3 * DAY,
    type: 'inventory',
    item: 'Huile de coco vierge 250 ml',
    qty: -2,
    user: 'Serge Tchoumi',
    note: 'Écart d’inventaire',
  },
  {
    id: 'm1',
    at: NOW - 4 * DAY,
    type: 'reception',
    item: 'Robe pagne wax · M · Multicolore',
    qty: 6,
    user: 'Serge Tchoumi',
    note: 'Réception R-0229',
  },
];

export type Supplier = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  city: string;
  category: string;
  total: number;
};

const seedSuppliers: Supplier[] = [
  {
    id: 's1',
    name: 'Tech Import Akwa',
    contact: 'Hervé Kamga',
    phone: '+237 670 11 23 45',
    city: 'Douala, Akwa',
    category: 'Téléphones',
    total: 2_840_000,
  },
  {
    id: 's2',
    name: 'Ets Fotso & Fils',
    contact: 'Brice Fotso',
    phone: '+237 696 22 04 18',
    city: 'Douala, Marché Central',
    category: 'Chaussures',
    total: 910_000,
  },
  {
    id: 's3',
    name: 'Mboa Textiles',
    contact: 'Clarisse Atangana',
    phone: '+237 675 63 81 02',
    city: 'Yaoundé, Mokolo',
    category: 'Vêtements',
    total: 640_000,
  },
  {
    id: 's4',
    name: 'Cosmétiques du Littoral',
    contact: 'Nadège Ewane',
    phone: '+237 658 40 29 33',
    city: 'Douala, Bonabéri',
    category: 'Cosmétiques',
    total: 385_000,
  },
];

export type Reception = {
  id: string;
  at: number;
  supplier: string;
  reference: string;
  lines: number;
  qty: number;
  total: number;
  user: string;
};

const seedReceptions: Reception[] = [
  {
    id: 'R-0231',
    at: NOW - 55 * MINUTE,
    supplier: 'Cosmétiques du Littoral',
    reference: 'BL-7781',
    lines: 1,
    qty: 12,
    total: 31_200,
    user: 'Serge Tchoumi',
  },
  {
    id: 'R-0230',
    at: NOW - DAY,
    supplier: 'Tech Import Akwa',
    reference: 'FA-2026-332',
    lines: 1,
    qty: 4,
    total: 392_000,
    user: 'Serge Tchoumi',
  },
  {
    id: 'R-0229',
    at: NOW - 4 * DAY,
    supplier: 'Mboa Textiles',
    reference: 'BL-0912',
    lines: 2,
    qty: 9,
    total: 108_000,
    user: 'Serge Tchoumi',
  },
  {
    id: 'R-0228',
    at: NOW - 9 * DAY,
    supplier: 'Ets Fotso & Fils',
    reference: 'BL-5530',
    lines: 4,
    qty: 16,
    total: 224_000,
    user: 'Patrick Essomba',
  },
];

/* ------------------------------------------------------------------ account */

export type PlanId = 'demarrage' | 'business' | 'entreprise';
export type BillingCycle = 'monthly' | 'yearly';

/** Quotas per plan; `null` means unlimited. */
export const PLAN_LIMITS: Record<PlanId, { shops: number | null; users: number | null; products: number | null }> = {
  demarrage: { shops: 1, users: 2, products: 500 },
  business: { shops: 3, users: 10, products: null },
  entreprise: { shops: null, users: null, products: null },
};

export type Invoice = {
  id: string;
  at: number;
  plan: string;
  amount: number;
  method: string;
  status: 'paid' | 'failed';
};

const seedInvoices: Invoice[] = [
  {
    id: 'F-2026-1004',
    at: TODAY_START - 19 * DAY,
    plan: 'Business',
    amount: 12_000,
    method: 'MTN MoMo',
    status: 'paid',
  },
  {
    id: 'F-2026-0904',
    at: TODAY_START - 49 * DAY,
    plan: 'Business',
    amount: 12_000,
    method: 'Orange Money',
    status: 'paid',
  },
  {
    id: 'F-2026-0804',
    at: TODAY_START - 80 * DAY,
    plan: 'Démarrage',
    amount: 5_000,
    method: 'MTN MoMo',
    status: 'paid',
  },
  {
    id: 'F-2026-0802',
    at: TODAY_START - 82 * DAY,
    plan: 'Démarrage',
    amount: 5_000,
    method: 'MTN MoMo',
    status: 'failed',
  },
];

export type NotificationKind = 'stock' | 'billing' | 'team' | 'deposit' | 'system';

export type Notification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  at: number;
  read: boolean;
  href: string;
};

const seedNotifications: Notification[] = [
  {
    id: 'n1',
    kind: 'stock',
    title: 'Rupture : iPhone 11 reconditionné',
    body: '64 Go · Blanc, plus aucune unité en stock.',
    at: NOW - 40 * MINUTE,
    read: false,
    href: '/app/stock?filtre=rupture',
  },
  {
    id: 'n2',
    kind: 'deposit',
    title: 'Écart sur le versement d’Akwa',
    body: 'Il manque 15 000 FCFA sur le versement d’hier soir.',
    at: NOW - 13 * HOUR,
    read: false,
    href: '/app/versements',
  },
  {
    id: 'n3',
    kind: 'stock',
    title: 'Stock faible : Parfum Oud Royal 100 ml',
    body: '1 unité restante pour un seuil de 3.',
    at: NOW - 3 * HOUR,
    read: false,
    href: '/app/stock?filtre=alerte',
  },
  {
    id: 'n4',
    kind: 'billing',
    title: 'Votre abonnement se renouvelle dans 12 jours',
    body: 'Formule Business, 12 000 FCFA par MTN MoMo.',
    at: NOW - 6 * HOUR,
    read: true,
    href: '/app/abonnement',
  },
  {
    id: 'n5',
    kind: 'team',
    title: 'Aïcha Bouba a rejoint la boutique',
    body: 'Vendeuse à Bonapriso.',
    at: NOW - 3 * DAY,
    read: true,
    href: '/app/equipe',
  },
  {
    id: 'n6',
    kind: 'system',
    title: 'Nouveau : reçus par WhatsApp',
    body: 'Envoyez le reçu au client en un geste depuis la caisse.',
    at: NOW - 5 * DAY,
    read: true,
    href: '/app/caisse',
  },
];

export type ActivityIcon = 'sale' | 'reception' | 'stock' | 'edit' | 'team' | 'deposit' | 'cash';
export type Activity = { id: string; at: number; user: string; text: string; icon: ActivityIcon };

const seedActivity: Activity[] = [
  { id: 'a6', at: NOW - 12 * MINUTE, user: 'Junior Mbarga', text: 'a encaissé une vente à Akwa', icon: 'sale' },
  {
    id: 'a5',
    at: NOW - 55 * MINUTE,
    user: 'Serge Tchoumi',
    text: 'a réceptionné 12 × Lait corporel karité',
    icon: 'reception',
  },
  {
    id: 'a4',
    at: NOW - 2 * HOUR,
    user: 'Patrick Essomba',
    text: 'a retiré 1 × Escarpins vernis (talon cassé)',
    icon: 'stock',
  },
  {
    id: 'a3',
    at: NOW - 4 * HOUR,
    user: 'Mireille Ngo Bella',
    text: 'a modifié le prix de Tecno Spark 20 Pro',
    icon: 'edit',
  },
  { id: 'a2', at: NOW - 6 * HOUR, user: 'Aïcha Bouba', text: 'a ouvert la caisse de Bonapriso', icon: 'cash' },
  { id: 'a1', at: NOW - 18 * HOUR, user: 'Brenda Nkeng', text: 'a versé 96 000 FCFA pour Bonapriso', icon: 'deposit' },
];

export type Ticket = { id: string; subject: string; category: string; status: 'open' | 'resolved'; at: number };

const seedTickets: Ticket[] = [
  {
    id: 'T-1038',
    subject: 'Imprimante thermique non détectée',
    category: 'Caisse',
    status: 'resolved',
    at: NOW - 9 * DAY,
  },
];

export type Settings = {
  company: string;
  niu: string;
  rccm: string;
  shopName: string;
  city: string;
  phone: string;
  addresses: Record<Shop, string>;
  receiptMessage: string;
  paper: '58mm' | '80mm';
  showLogo: boolean;
  negativeStock: boolean;
  rounding: boolean;
  alerts: { stock: boolean; deposit: boolean; daily: boolean; cancel: boolean };
};

const seedSettings: Settings = {
  company: 'Ngo Bella Distribution SARL',
  niu: 'M052100123456P',
  rccm: 'RC/DLA/2021/B/1234',
  shopName: 'Boutique Ngo Bella',
  city: 'Douala',
  phone: '+237 699 41 22 08',
  addresses: {
    Akwa: 'Rue Joss, face à la pharmacie du Centre',
    Bonapriso: 'Rue Njo-Njo, à côté de la boulangerie Zépol',
  },
  receiptMessage: 'Merci pour votre achat ! Échange possible sous 7 jours avec ce reçu.',
  paper: '80mm',
  showLogo: true,
  negativeStock: false,
  rounding: true,
  alerts: { stock: true, deposit: true, daily: true, cancel: false },
};

/* ------------------------------------------------------------------ state */

export const DEMO_VERSION = 1;

export type DemoState = {
  version: number;
  role: RoleId;
  categories: Category[];
  products: Product[];
  sales: Sale[];
  deposits: Deposit[];
  moves: Move[];
  suppliers: Supplier[];
  receptions: Reception[];
  team: Member[];
  plan: { id: PlanId; cycle: BillingCycle; expires: number };
  invoices: Invoice[];
  notifications: Notification[];
  activity: Activity[];
  tickets: Ticket[];
  settings: Settings;
};

export function createSeed(): DemoState {
  const sales = generateSales(seedProducts);
  return {
    version: DEMO_VERSION,
    role: 'owner',
    categories: seedCategories,
    products: seedProducts,
    sales,
    deposits: buildDeposits(sales),
    moves: seedMoves,
    suppliers: seedSuppliers,
    receptions: seedReceptions,
    team: seedTeam,
    plan: { id: 'business', cycle: 'monthly', expires: TODAY_START + 12 * DAY },
    invoices: seedInvoices,
    notifications: seedNotifications,
    activity: seedActivity,
    tickets: seedTickets,
    settings: seedSettings,
  };
}
