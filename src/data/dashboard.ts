import { formatFcfa } from './site';

export { formatFcfa };

/*
 * Demo data for the dashboard. Everything is derived from a fixed clock and a seeded
 * generator so the server render and the hydrated islands always agree.
 */

const TZ = 'Africa/Douala';
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export const NOW = Date.parse('2026-10-23T14:30:00+01:00');
const TODAY_START = Date.parse('2026-10-23T00:00:00+01:00');

function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const roundTo = (value: number, step: number) => Math.round(value / step) * step;
const pick = <T>(rand: () => number, list: readonly T[]) => list[Math.floor(rand() * list.length)];

/* ------------------------------------------------------------------ formatting */

const dateFormat = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, ...options });

const fullDate = dateFormat({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shortDate = dateFormat({ day: '2-digit', month: '2-digit', year: 'numeric' });
const dayMonth = dateFormat({ day: 'numeric', month: 'short' });
const weekdayDay = dateFormat({ weekday: 'short', day: 'numeric' });
const time = dateFormat({ hour: '2-digit', minute: '2-digit' });

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const formatFullDate = (ts: number) => capitalize(fullDate.format(ts));
export const formatShortDate = (ts: number) => shortDate.format(ts);
export const formatDayMonth = (ts: number) => dayMonth.format(ts);
export const formatTime = (ts: number) => time.format(ts).replace(':', 'h');

/** "Aujourd'hui, 11h20", "Hier, 18h05" or "19/10/2026, 10h40". */
export function formatWhen(ts: number) {
  const days = Math.floor((TODAY_START + DAY - 1 - ts) / DAY);
  const day = days === 0 ? 'Aujourd’hui' : days === 1 ? 'Hier' : formatShortDate(ts);
  return `${day}, ${formatTime(ts)}`;
}

/** "il y a 12 min", "il y a 3 h", "il y a 2 j". */
export function formatAgo(ts: number) {
  const minutes = Math.max(1, Math.round((NOW - ts) / 60_000));
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

export const formatNumber = (value: number) => new Intl.NumberFormat('fr-FR').format(value).replace(/\s/g, '\u00a0');

/** Axis labels: 250 000 → "250 k", 1 250 000 → "1,25 M". */
export function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })}\u00a0M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}\u00a0k`;
  return String(value);
}

export const percentChange = (current: number, previous: number) =>
  previous === 0 ? 0 : Math.round(((current - previous) / previous) * 1000) / 10;

/* ------------------------------------------------------------------ business */

export const business = {
  name: 'Boutique Diva',
  initials: 'BD',
  city: 'Douala',
  plan: { name: 'Business', price: 12_000, users: 10, shops: 3, renewsOn: Date.parse('2026-11-15T00:00:00+01:00') },
  owner: { name: 'Awa Ngono', firstName: 'Awa', initials: 'AN', phone: '+237 677 41 22 90' },
  shops: ['Akwa', 'Bonapriso'] as const,
};

export type Shop = (typeof business.shops)[number];

/* ------------------------------------------------------------------ products */

export const categories = ['Robes', 'Tops', 'Pantalons', 'Jupes', 'Accessoires', 'Chaussures'] as const;
export type Category = (typeof categories)[number];

export type Product = {
  id: string;
  name: string;
  sku: string;
  category: Category;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
};

export const products: Product[] = [
  {
    id: 'p01',
    name: 'Robe wax évasée',
    sku: 'RB-104',
    category: 'Robes',
    price: 18_000,
    cost: 10_500,
    stock: 24,
    minStock: 8,
  },
  {
    id: 'p02',
    name: 'Kaba ngondo brodé',
    sku: 'RB-118',
    category: 'Robes',
    price: 25_000,
    cost: 14_000,
    stock: 6,
    minStock: 8,
  },
  {
    id: 'p03',
    name: 'Robe de soirée satin',
    sku: 'RB-131',
    category: 'Robes',
    price: 35_000,
    cost: 21_000,
    stock: 9,
    minStock: 4,
  },
  {
    id: 'p04',
    name: 'Ensemble pagne 2 pièces',
    sku: 'RB-142',
    category: 'Robes',
    price: 28_000,
    cost: 16_000,
    stock: 12,
    minStock: 5,
  },
  {
    id: 'p05',
    name: 'Top en lin',
    sku: 'TP-210',
    category: 'Tops',
    price: 9_500,
    cost: 5_000,
    stock: 31,
    minStock: 10,
  },
  {
    id: 'p06',
    name: 'Blouse en pagne',
    sku: 'TP-224',
    category: 'Tops',
    price: 12_000,
    cost: 6_500,
    stock: 3,
    minStock: 8,
  },
  {
    id: 'p07',
    name: 'Crop top côtelé',
    sku: 'TP-237',
    category: 'Tops',
    price: 6_500,
    cost: 3_200,
    stock: 0,
    minStock: 6,
  },
  {
    id: 'p08',
    name: 'Pantalon palazzo',
    sku: 'PT-305',
    category: 'Pantalons',
    price: 15_000,
    cost: 8_000,
    stock: 14,
    minStock: 6,
  },
  {
    id: 'p09',
    name: 'Jean taille haute',
    sku: 'PT-312',
    category: 'Pantalons',
    price: 16_500,
    cost: 9_500,
    stock: 11,
    minStock: 6,
  },
  {
    id: 'p10',
    name: 'Jupe crayon',
    sku: 'JP-401',
    category: 'Jupes',
    price: 11_000,
    cost: 6_000,
    stock: 17,
    minStock: 6,
  },
  {
    id: 'p11',
    name: 'Jupe plissée midi',
    sku: 'JP-415',
    category: 'Jupes',
    price: 13_500,
    cost: 7_000,
    stock: 5,
    minStock: 6,
  },
  {
    id: 'p12',
    name: 'Sac à main en cuir',
    sku: 'AC-502',
    category: 'Accessoires',
    price: 22_000,
    cost: 12_500,
    stock: 8,
    minStock: 4,
  },
  {
    id: 'p13',
    name: 'Foulard en soie',
    sku: 'AC-517',
    category: 'Accessoires',
    price: 5_000,
    cost: 2_200,
    stock: 40,
    minStock: 10,
  },
  {
    id: 'p14',
    name: 'Boucles d’oreilles dorées',
    sku: 'AC-523',
    category: 'Accessoires',
    price: 3_500,
    cost: 1_200,
    stock: 52,
    minStock: 15,
  },
  {
    id: 'p15',
    name: 'Sandales tressées',
    sku: 'CH-601',
    category: 'Chaussures',
    price: 14_000,
    cost: 7_500,
    stock: 0,
    minStock: 5,
  },
  {
    id: 'p16',
    name: 'Escarpins vernis',
    sku: 'CH-614',
    category: 'Chaussures',
    price: 19_500,
    cost: 11_000,
    stock: 7,
    minStock: 4,
  },
];

export type StockStatus = 'ok' | 'low' | 'out';

export const stockStatus = (product: Pick<Product, 'stock' | 'minStock'>): StockStatus =>
  product.stock === 0 ? 'out' : product.stock <= product.minStock ? 'low' : 'ok';

export const marginRate = (product: Pick<Product, 'price' | 'cost'>) =>
  product.price === 0 ? 0 : Math.round(((product.price - product.cost) / product.price) * 100);

export const stockAlerts = products
  .filter((product) => stockStatus(product) !== 'ok')
  .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name));

/* ------------------------------------------------------------------ team */

export type RoleName = 'Propriétaire' | 'Gérant' | 'Vendeur' | 'Magasinier';
export type MemberStatus = 'active' | 'invited' | 'suspended';

export type Member = {
  id: string;
  name: string;
  phone: string;
  role: RoleName;
  shop: Shop | 'Toutes';
  status: MemberStatus;
  lastSeen: number | null;
  salesToday: number;
};

export const team: Member[] = [
  {
    id: 'm1',
    name: 'Awa Ngono',
    phone: '+237 677 41 22 90',
    role: 'Propriétaire',
    shop: 'Toutes',
    status: 'active',
    lastSeen: NOW - 2 * 60_000,
    salesToday: 0,
  },
  {
    id: 'm2',
    name: 'Brice Tchoumi',
    phone: '+237 699 12 45 78',
    role: 'Gérant',
    shop: 'Akwa',
    status: 'active',
    lastSeen: NOW - 14 * 60_000,
    salesToday: 4,
  },
  {
    id: 'm3',
    name: 'Mireille Essomba',
    phone: '+237 655 30 81 17',
    role: 'Gérant',
    shop: 'Bonapriso',
    status: 'active',
    lastSeen: NOW - 41 * 60_000,
    salesToday: 3,
  },
  {
    id: 'm4',
    name: 'Clarisse Mbarga',
    phone: '+237 670 58 93 02',
    role: 'Vendeur',
    shop: 'Akwa',
    status: 'active',
    lastSeen: NOW - 6 * 60_000,
    salesToday: 7,
  },
  {
    id: 'm5',
    name: 'Junior Kamga',
    phone: '+237 691 07 64 35',
    role: 'Vendeur',
    shop: 'Bonapriso',
    status: 'active',
    lastSeen: NOW - 25 * 60_000,
    salesToday: 5,
  },
  {
    id: 'm6',
    name: 'Ibrahim Bello',
    phone: '+237 679 88 21 40',
    role: 'Magasinier',
    shop: 'Akwa',
    status: 'active',
    lastSeen: NOW - 3 * HOUR,
    salesToday: 0,
  },
  {
    id: 'm7',
    name: 'Estelle Fotso',
    phone: '+237 656 72 19 63',
    role: 'Vendeur',
    shop: 'Akwa',
    status: 'invited',
    lastSeen: null,
    salesToday: 0,
  },
];

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

/* ------------------------------------------------------------------ daily activity */

export type Totals = { revenue: number; sales: number; profit: number };

const weekdayFactor = [0.55, 0.85, 0.9, 0.95, 1.05, 1.15, 1.35];
const hourWeights = [0.4, 0.6, 0.8, 0.9, 1.1, 1.2, 1, 0.9, 1, 1.2, 1.3, 1.1, 0.6];
const OPEN_HOUR = 8;
const NOW_HOUR = 14;

const dayRand = seeded(2026);

function dayTotals(start: number, daysAgo: number): Totals {
  const weekday = new Date(start + HOUR).getUTCDay();
  const trend = 1 + (60 - daysAgo) * 0.003;
  const revenue = roundTo(310_000 * weekdayFactor[weekday] * (0.8 + 0.4 * dayRand()) * trend, 500);
  const sales = Math.max(1, Math.round(revenue / (15_500 + dayRand() * 4_000)));
  const profit = roundTo(revenue * (0.38 + dayRand() * 0.08), 500);
  return { revenue, sales, profit };
}

export type DayPoint = Totals & { start: number };

/** Complete days, oldest first: index 59 is yesterday. */
export const dailySeries: DayPoint[] = Array.from({ length: 60 }, (_, index) => {
  const daysAgo = 60 - index;
  const start = TODAY_START - daysAgo * DAY;
  return { start, ...dayTotals(start, daysAgo) };
});

function splitByHour(day: Totals, hours: number): Totals[] {
  const total = hourWeights.reduce((sum, weight) => sum + weight, 0);
  return hourWeights.slice(0, hours).map((weight) => ({
    revenue: roundTo((day.revenue * weight) / total, 500),
    sales: Math.max(0, Math.round((day.sales * weight) / total)),
    profit: roundTo((day.profit * weight) / total, 500),
  }));
}

const yesterday = dailySeries[dailySeries.length - 1];
const todayForecast = dayTotals(TODAY_START, 0);
const hoursOpenToday = NOW_HOUR - OPEN_HOUR + 1;

export const hourlyToday = splitByHour(todayForecast, hoursOpenToday);
const hourlyYesterday = splitByHour(yesterday, hoursOpenToday);

const sumTotals = (list: Totals[]): Totals =>
  list.reduce(
    (acc, item) => ({
      revenue: acc.revenue + item.revenue,
      sales: acc.sales + item.sales,
      profit: acc.profit + item.profit,
    }),
    {
      revenue: 0,
      sales: 0,
      profit: 0,
    },
  );

export type Period = 'today' | '7d' | '30d';

export const periods: { id: Period; label: string; compare: string; short: string }[] = [
  { id: 'today', label: 'Aujourd’hui', compare: 'hier à la même heure', short: 'vs hier' },
  { id: '7d', label: '7 jours', compare: 'les 7 jours précédents', short: 'vs 7 j. précédents' },
  { id: '30d', label: '30 jours', compare: 'les 30 jours précédents', short: 'vs 30 j. précédents' },
];

export type ChartPoint = { label: string; detail: string; value: number; previous: number };

export type PeriodData = { current: Totals; previous: Totals; points: ChartPoint[] };

export function periodData(period: Period): PeriodData {
  if (period === 'today') {
    return {
      current: sumTotals(hourlyToday),
      previous: sumTotals(hourlyYesterday),
      points: hourlyToday.map((hour, index) => ({
        label: `${OPEN_HOUR + index}h`,
        detail: `Aujourd’hui, ${OPEN_HOUR + index}h – ${OPEN_HOUR + index + 1}h`,
        value: hour.revenue,
        previous: hourlyYesterday[index].revenue,
      })),
    };
  }
  const length = period === '7d' ? 7 : 30;
  const current = dailySeries.slice(-length);
  const previous = dailySeries.slice(-2 * length, -length);
  return {
    current: sumTotals(current),
    previous: sumTotals(previous),
    points: current.map((day, index) => ({
      label: period === '7d' ? capitalize(weekdayDay.format(day.start)) : formatDayMonth(day.start),
      detail: formatFullDate(day.start),
      value: day.revenue,
      previous: previous[index].revenue,
    })),
  };
}

/* ------------------------------------------------------------------ sales */

export const paymentMethods = ['Espèces', 'MTN MoMo', 'Orange Money'] as const;
export type PaymentMethod = (typeof paymentMethods)[number];
export type SaleStatus = 'paid' | 'pending' | 'cancelled';

export type SaleLine = { productId: string; name: string; quantity: number; unitPrice: number };

export type Sale = {
  id: string;
  date: number;
  customer: string;
  lines: SaleLine[];
  total: number;
  method: PaymentMethod;
  status: SaleStatus;
  seller: string;
  shop: Shop;
};

const customers = [
  'Brenda Nkeng',
  'Chantal Owona',
  'Diane Ateba',
  'Estelle Nana',
  'Flore Abena',
  'Grace Tabi',
  'Hortense Manga',
  'Laure Ekambi',
  'Mariam Aboubakar',
  'Nadège Fouda',
  'Paule Ndzana',
  'Rose Moukoko',
  'Sandrine Biyong',
  'Vanessa Kouam',
];

const sellersByShop: Record<Shop, string[]> = {
  Akwa: ['Clarisse Mbarga', 'Brice Tchoumi'],
  Bonapriso: ['Junior Kamga', 'Mireille Essomba'],
};

export const saleTotal = (lines: Pick<SaleLine, 'quantity' | 'unitPrice'>[]) =>
  lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

const saleRand = seeded(237);

/** Opening hours run 8h30 – 19h45; today stops at the current time. */
const saleTimes = Array.from({ length: 8 }, (_, daysAgo) => daysAgo)
  .flatMap((daysAgo) => {
    const open = TODAY_START - daysAgo * DAY + 8.5 * HOUR;
    const close = daysAgo === 0 ? NOW - 20 * 60_000 : open + 11.25 * HOUR;
    const count = daysAgo === 0 ? sumTotals(hourlyToday).sales : 5 + Math.floor(saleRand() * 3);
    return Array.from({ length: count }, () => open + Math.floor((saleRand() * (close - open)) / 60_000) * 60_000);
  })
  .sort((a, b) => b - a);

export const sales: Sale[] = saleTimes.map((date, index) => {
  const lineCount = saleRand() < 0.6 ? 1 : saleRand() < 0.75 ? 2 : 3;
  const chosen = new Set<Product>();
  while (chosen.size < lineCount) chosen.add(pick(saleRand, products));
  const lines = [...chosen].map((product) => ({
    productId: product.id,
    name: product.name,
    quantity: saleRand() < 0.8 ? 1 : 2,
    unitPrice: product.price,
  }));
  const shop: Shop = saleRand() < 0.58 ? 'Akwa' : 'Bonapriso';
  const methodRoll = saleRand();
  const statusRoll = saleRand();
  return {
    id: `V-${String(1248 - index).padStart(6, '0')}`,
    date,
    customer: saleRand() < 0.25 ? 'Client de passage' : pick(saleRand, customers),
    lines,
    total: saleTotal(lines),
    method: methodRoll < 0.5 ? 'Espèces' : methodRoll < 0.8 ? 'MTN MoMo' : 'Orange Money',
    status: index === 1 ? 'pending' : statusRoll < 0.05 ? 'cancelled' : statusRoll < 0.1 ? 'pending' : 'paid',
    seller: pick(saleRand, sellersByShop[shop]),
    shop,
  };
});

/* ------------------------------------------------------------------ deposits */

export type DepositStatus = 'pending' | 'verified' | 'flagged';
export const depositMethods = ['Espèces', 'MTN MoMo', 'Orange Money', 'Dépôt bancaire'] as const;
export type DepositMethod = (typeof depositMethods)[number];

export type Deposit = {
  id: string;
  day: number;
  shop: Shop;
  manager: string;
  expected: number;
  deposited: number;
  method: DepositMethod;
  depositedAt: number;
  status: DepositStatus;
  note?: string;
};

const managers: Record<Shop, string> = { Akwa: 'Brice Tchoumi', Bonapriso: 'Mireille Essomba' };
const shopShare: Record<Shop, number> = { Akwa: 0.58, Bonapriso: 0.42 };
const knownGaps: Record<string, number> = { '1-Akwa': -15_000, '4-Akwa': -5_000, '7-Bonapriso': -2_500 };

/** Latest first: cash takings of each shop, handed over by its manager the same evening. */
export const deposits: Deposit[] = Array.from({ length: 10 }, (_, index) => index + 1).flatMap((daysAgo) => {
  const day = dailySeries[dailySeries.length - daysAgo];
  return business.shops.map((shop) => {
    const expected = roundTo(day.revenue * 0.52 * shopShare[shop], 500);
    const gap = knownGaps[`${daysAgo}-${shop}`] ?? 0;
    return {
      id: `VS-${daysAgo}-${shop}`,
      day: day.start,
      shop,
      manager: managers[shop],
      expected,
      deposited: expected + gap,
      method: shop === 'Akwa' ? 'Espèces' : daysAgo % 3 === 0 ? 'Dépôt bancaire' : 'MTN MoMo',
      depositedAt: day.start + 19 * HOUR + (shop === 'Akwa' ? 35 : 52) * 60_000,
      status: daysAgo === 1 ? 'pending' : gap !== 0 && daysAgo === 4 ? 'flagged' : 'verified',
      note:
        daysAgo === 4 && shop === 'Akwa' ? 'Monnaie rendue en trop sur une vente, à retenir sur la paie.' : undefined,
    } satisfies Deposit;
  });
});

/* ------------------------------------------------------------------ navigation & alerts */

export type NavIcon = 'overview' | 'sales' | 'products' | 'deposits' | 'team' | 'settings';

export const appNav: { label: string; href: string; icon: NavIcon; badge?: number }[] = [
  { label: 'Tableau de bord', href: '/app', icon: 'overview' },
  { label: 'Ventes', href: '/app/ventes', icon: 'sales' },
  { label: 'Produits et stock', href: '/app/produits', icon: 'products', badge: stockAlerts.length },
  {
    label: 'Versements',
    href: '/app/versements',
    icon: 'deposits',
    badge: deposits.filter((deposit) => deposit.status === 'pending').length,
  },
  { label: 'Équipe', href: '/app/equipe', icon: 'team' },
  { label: 'Paramètres', href: '/app/parametres', icon: 'settings' },
];

export type Notice = {
  id: string;
  tone: 'danger' | 'warning' | 'success';
  title: string;
  body: string;
  href: string;
  at: number;
};

export const notices: Notice[] = [
  {
    id: 'n1',
    tone: 'warning',
    title: 'Écart sur le versement d’Akwa',
    body: 'Il manque 15 000 FCFA sur le versement d’hier de Brice Tchoumi.',
    href: '/app/versements',
    at: NOW - 15 * HOUR,
  },
  {
    id: 'n2',
    tone: 'danger',
    title: 'Deux produits en rupture',
    body: 'Crop top côtelé et Sandales tressées ne sont plus en stock.',
    href: '/app/produits?filtre=rupture',
    at: NOW - 3 * HOUR,
  },
  {
    id: 'n3',
    tone: 'success',
    title: 'Réception fournisseur enregistrée',
    body: 'Ibrahim Bello a ajouté 24 Robes wax évasées au stock.',
    href: '/app/produits',
    at: NOW - 26 * HOUR,
  },
];
