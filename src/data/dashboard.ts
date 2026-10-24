import type { BusinessId } from './businesses';
import { formatFcfa, site } from './site';

export { formatFcfa };

/*
 * Types and starting state of the merchant space. A new shop starts empty apart from the
 * categories of its line of business: no sample products, sales or staff. The clock is fixed
 * so the server render and the hydrated islands always agree.
 */

const TZ = 'Africa/Douala';
export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export const NOW = Date.parse('2026-10-23T14:30:00+01:00');
export const TODAY_START = Date.parse('2026-10-23T00:00:00+01:00');

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

/** Every account starts with one shop; the owner can open more within the plan's quota. */
export type Shop = string;
export type ShopInfo = { name: Shop; address: string };

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
  | 'expenses'
  | 'team'
  | 'subscription'
  | 'settings'
  | 'notifications'
  | 'support';

export type Role = {
  label: string;
  summary: string;
  screens: ScreenId[];
  /** Sees revenue figures at all. */
  revenue: boolean;
  /** Sees every sale, or only their own. */
  allSales: boolean;
  margins: boolean;
  costs: boolean;
  maxDiscount: number;
  /** May set a sale price under the purchase cost at the till (the catalogue price never changes). */
  sellBelowCost: boolean;
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
  'expenses',
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
    screens: everyScreen,
    revenue: true,
    allSales: true,
    margins: true,
    costs: true,
    maxDiscount: 30,
    sellBelowCost: true,
    cancel: true,
    editCatalog: true,
    manageTeam: true,
  },
  manager: {
    label: 'Gérant',
    summary: 'Gère la boutique au quotidien',
    screens: everyScreen.filter((screen) => screen !== 'subscription'),
    revenue: true,
    allSales: true,
    margins: true,
    costs: true,
    maxDiscount: 20,
    sellBelowCost: false,
    cancel: true,
    editCatalog: true,
    manageTeam: false,
  },
  seller: {
    label: 'Vendeur',
    summary: 'Encaisse en caisse',
    screens: ['dash', 'pos', 'sales', 'products', 'notifications', 'support'],
    revenue: true,
    allSales: false,
    margins: false,
    costs: false,
    maxDiscount: 10,
    sellBelowCost: false,
    cancel: false,
    editCatalog: false,
    manageTeam: false,
  },
  stock: {
    label: 'Magasinier',
    summary: 'Gère le stock et les réceptions',
    screens: ['dash', 'products', 'categories', 'stock', 'suppliers', 'notifications', 'support'],
    revenue: false,
    allSales: false,
    margins: false,
    costs: true,
    maxDiscount: 0,
    sellBelowCost: false,
    cancel: false,
    editCatalog: true,
    manageTeam: false,
  },
};

export const ROLE_IDS = Object.keys(ROLES) as RoleId[];

/** Rows of the "Qui peut faire quoi ?" matrix. `true`, `false` or a short qualifier. */
export const permissionMatrix: { label: string; values: Record<RoleId, boolean | string> }[] = [
  { label: 'Encaisser les ventes', values: { owner: true, manager: true, seller: true, stock: false } },
  {
    label: 'Changer le prix à la vente',
    values: { owner: true, manager: 'Pas à perte', seller: 'Pas à perte', stock: false },
  },
  { label: 'Accorder une remise', values: { owner: '30 %', manager: '20 %', seller: '10 %', stock: false } },
  { label: 'Annuler ou rembourser', values: { owner: true, manager: true, seller: false, stock: false } },
  { label: 'Voir les marges', values: { owner: true, manager: true, seller: false, stock: 'Prix d’achat' } },
  { label: 'Modifier le catalogue', values: { owner: true, manager: true, seller: false, stock: true } },
  { label: 'Stock et réceptions', values: { owner: true, manager: true, seller: false, stock: true } },
  { label: 'Rapports', values: { owner: true, manager: true, seller: 'Ses ventes', stock: false } },
  {
    label: 'Versements des gérants',
    values: { owner: 'Vérifier', manager: 'Déclarer', seller: false, stock: false },
  },
  { label: 'Dépenses', values: { owner: true, manager: 'Sa boutique', seller: false, stock: false } },
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
      { id: 'expenses', label: 'Dépenses', href: '/app/depenses' },
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

export type CategoryIcon =
  | 'phone'
  | 'tablet'
  | 'headphones'
  | 'shoe'
  | 'shirt'
  | 'bag'
  | 'drop'
  | 'sparkles'
  | 'flask'
  | 'scissors'
  | 'basket'
  | 'cup'
  | 'tag';

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

export const attr = (
  id: string,
  name: string,
  type: AttrType,
  options: string[] = [],
  extra: Partial<Pick<Attribute, 'variant' | 'required' | 'hint'>> = {},
): Attribute => ({ id, name, type, options, variant: false, required: false, ...extra });

export const category = (
  id: string,
  name: string,
  icon: CategoryIcon,
  tone: Tone,
  subs: string[],
  attrs: Attribute[],
): Category => ({ id, name, code: id.toUpperCase(), icon, tone, subs, attrs, archived: false });

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

/** The account holder, the only member of a new shop until they invite their staff. */
const ownerMember = (name: string, phone: string): Member => ({
  id: 'u1',
  name,
  role: 'owner',
  phone,
  shop: 'Toutes',
  status: 'active',
  lastSeen: NOW,
});

/* ------------------------------------------------------------------ sales */

export type SaleLine = {
  pid: string;
  vid: string;
  name: string;
  label: string;
  cat: string;
  qty: number;
  /** Unit price actually charged. */
  price: number;
  /** Catalogue price at the time, kept only when the price was changed at the till. */
  listPrice?: number;
  cost: number;
  returned: number;
};

export type Sale = {
  id: string;
  at: number;
  shop: Shop;
  seller: string;
  customer: string;
  /** Customer's WhatsApp number (+237…), kept once an invoice has been issued; empty otherwise. */
  customerPhone: string;
  customerEmail: string;
  /** When the invoice was first printed or sent; its date never changes afterwards. */
  invoicedAt: number | null;
  lines: SaleLine[];
  discount: number;
  pay: PayId;
  /** Cash handed over by the customer, to compute change. */
  received: number;
  reference: string;
  cancelled: boolean;
};

export const saleGross = (sale: Sale) => sale.lines.reduce((sum, line) => sum + line.price * line.qty, 0);

/** What the customer finally paid, after discount and returns. */
export function saleNet(sale: Sale) {
  if (sale.cancelled) return 0;
  const gross = saleGross(sale);
  const kept = sale.lines.reduce((sum, line) => sum + line.price * (line.qty - line.returned), 0);
  return gross ? Math.round(kept - (sale.discount * kept) / gross) : 0;
}

/** Invoice date: fixed once issued, otherwise today (or the sale itself when it is more recent). */
export const invoiceDate = (sale: Sale) => sale.invoicedAt ?? Math.max(NOW, sale.at);

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
  /** Mobile Money or bank transaction number, so the owner can find it on their statement. */
  reference: string;
  /** The manager's explanation when declaring, typically for a gap. */
  comment: string;
  status: DepositStatus;
  /** The owner's note when validating or flagging. */
  note: string;
};

/** Cash the shop should hand over for one day: its cash sales, after discounts and returns. */
export const cashSalesTotal = (sales: Sale[], shop: Shop, day: number) =>
  sales
    .filter((sale) => sale.shop === shop && sale.pay === 'cash' && sale.at >= day && sale.at < day + DAY)
    .reduce((sum, sale) => sum + saleNet(sale), 0);

/* ------------------------------------------------------------------ expenses */

export type ExpenseCategory =
  'rent' | 'utilities' | 'salaries' | 'transport' | 'supplies' | 'taxes' | 'repairs' | 'other';

export const EXPENSE_CATEGORIES: { id: ExpenseCategory; label: string; color: string }[] = [
  { id: 'rent', label: 'Loyer', color: '#2f3d63' },
  { id: 'utilities', label: 'Électricité et eau', color: '#f4b52c' },
  { id: 'salaries', label: 'Salaires et primes', color: '#10b981' },
  { id: 'transport', label: 'Transport', color: '#f97316' },
  { id: 'supplies', label: 'Fournitures', color: '#14b8a6' },
  { id: 'taxes', label: 'Impôts et taxes', color: '#8b5cf6' },
  { id: 'repairs', label: 'Entretien et réparations', color: '#f43f5e' },
  { id: 'other', label: 'Autre', color: '#9ca3af' },
];

export const expenseCategory = (id: ExpenseCategory) => EXPENSE_CATEGORIES.find((item) => item.id === id)!;

export type Expense = {
  id: string;
  /** Start of the day the money went out (Douala time). */
  day: number;
  shop: Shop;
  category: ExpenseCategory;
  reason: string;
  amount: number;
  /** Who spent the money. */
  author: string;
  pay: PayId;
  note: string;
  /** Who typed it in, and when. */
  recordedBy: string;
  recordedAt: number;
};

/* ------------------------------------------------------------------ stock, suppliers */

export type MoveType = 'reception' | 'entry' | 'exit' | 'adjust' | 'loss' | 'return' | 'inventory';

export const MOVE_LABELS: Record<MoveType, string> = {
  reception: 'Réception',
  entry: 'Entrée',
  exit: 'Sortie',
  adjust: 'Ajustement',
  loss: 'Casse ou perte',
  return: 'Retour client',
  inventory: 'Inventaire',
};

export type Move = {
  id: string;
  at: number;
  type: MoveType;
  item: string;
  qty: number;
  /** Who did the movement. */
  user: string;
  note: string;
  /** Where incoming goods come from (supplier, market, customer…). */
  source?: string;
  /** Where outgoing goods go, or why they leave. */
  destination?: string;
};

export type Supplier = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  city: string;
  /** Name of the category this supplier delivers. */
  category: string;
  total: number;
};

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

export type NotificationKind = 'stock' | 'billing' | 'team' | 'deposit' | 'system';

export type Notification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  at: number;
  read: boolean;
  href: string;
  /** Restricts it to these roles on top of the kind filter, e.g. a deposit declared for the owner only. */
  roles?: RoleId[];
};

export type ActivityIcon = 'sale' | 'reception' | 'stock' | 'edit' | 'team' | 'deposit' | 'cash' | 'expense';
export type Activity = { id: string; at: number; user: string; text: string; icon: ActivityIcon };

export type Ticket = { id: string; subject: string; category: string; status: 'open' | 'resolved'; at: number };

export type Settings = {
  company: string;
  niu: string;
  rccm: string;
  shopName: string;
  /** Supabase public URL, or a data URL in test mode; empty when the shop has no logo. */
  logoUrl: string;
  city: string;
  phone: string;
  receiptMessage: string;
  paper: '58mm' | '80mm';
  showLogo: boolean;
  negativeStock: boolean;
  rounding: boolean;
  alerts: { stock: boolean; deposit: boolean; daily: boolean; cancel: boolean };
};

const defaultSettings: Omit<Settings, 'company' | 'shopName' | 'logoUrl' | 'city' | 'phone'> = {
  niu: '',
  rccm: '',
  receiptMessage: 'Merci pour votre achat ! Échange possible sous 7 jours avec ce reçu.',
  paper: '80mm',
  showLogo: true,
  negativeStock: false,
  rounding: true,
  alerts: { stock: true, deposit: true, daily: true, cancel: false },
};

const welcomeNotification: Notification = {
  id: 'n-welcome',
  kind: 'system',
  title: 'Bienvenue sur GOLDSTOCK',
  body: 'Commencez par ajouter vos produits : la caisse, le stock et les rapports se remplissent ensuite tout seuls.',
  at: NOW,
  read: false,
  href: '/app/produits/fiche',
};

/* ------------------------------------------------------------------ state */

export const DEMO_VERSION = 6;

export type DemoState = {
  version: number;
  /** Fixed at signup: every shop of the account runs this one line of business. */
  business: BusinessId;
  role: RoleId;
  shops: ShopInfo[];
  categories: Category[];
  products: Product[];
  sales: Sale[];
  deposits: Deposit[];
  expenses: Expense[];
  moves: Move[];
  suppliers: Supplier[];
  receptions: Reception[];
  team: Member[];
  /** `trial`: the free trial started at signup, until a plan is paid for. */
  plan: { id: PlanId; cycle: BillingCycle; expires: number; trial: boolean };
  invoices: Invoice[];
  notifications: Notification[];
  activity: Activity[];
  tickets: Ticket[];
  settings: Settings;
};

/** What signup (or the account's Supabase shop and profile) carries over into the merchant space. */
export type ShopIdentity = { shopName?: string; city?: string; logoUrl?: string; ownerName?: string; phone?: string };

/** Name shown for the owner when signup did not provide one (test mode opened from the login page). */
export const DEFAULT_OWNER_NAME = 'Propriétaire';

/** A brand-new shop: the categories of its line of business, its owner, and nothing else. */
export function createSeed(business: BusinessId, categories: Category[], identity: ShopIdentity = {}): DemoState {
  const shopName = identity.shopName?.trim() || 'Ma boutique';
  const phone = identity.phone ?? '';
  return {
    version: DEMO_VERSION,
    business,
    role: 'owner',
    shops: [{ name: shopName, address: '' }],
    categories,
    products: [],
    sales: [],
    deposits: [],
    expenses: [],
    moves: [],
    suppliers: [],
    receptions: [],
    team: [ownerMember(identity.ownerName?.trim() || DEFAULT_OWNER_NAME, phone)],
    plan: { id: 'business', cycle: 'monthly', expires: TODAY_START + site.trialDays * DAY, trial: true },
    invoices: [],
    notifications: [welcomeNotification],
    activity: [],
    tickets: [],
    settings: {
      ...defaultSettings,
      company: shopName,
      shopName,
      logoUrl: identity.logoUrl ?? '',
      city: identity.city || 'Douala',
      phone,
    },
  };
}
