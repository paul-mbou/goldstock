import { useSyncExternalStore } from 'react';
import { DEFAULT_BUSINESS, businessOf, type BusinessId } from '../data/businesses';
import { CATEGORIES } from '../data/catalogs';
import {
  DAY,
  DEMO_VERSION,
  HOUR,
  NOW,
  PLAN_LIMITS,
  ROLES,
  TODAY_START,
  cashSalesTotal,
  createSeed,
  formatDayOfMonth,
  formatFcfa,
  formatLongDay,
  formatWeekday,
  invoiceDate,
  saleCost,
  saleNet,
  type Activity,
  type ActivityIcon,
  type Category,
  type DemoState,
  type Deposit,
  type Expense,
  type Member,
  type Move,
  type MoveType,
  type NotificationKind,
  type PayId,
  type Product,
  type RoleId,
  type Sale,
  type SaleLine,
  type ScreenId,
  type Shop,
  type ShopIdentity,
  type Variant,
} from '../data/dashboard';
import { isAuthLive } from './auth';
import {
  applyRemoteStockMove,
  loadCatalog,
  replaceCategoryAttributes,
  setProductStatus,
  upsertCategory,
  upsertProduct,
  type CatalogResult,
} from './catalog';
import { takeDemoSetup } from './demo-setup';
import {
  issueRemoteInvoice,
  loadSales,
  nextSaleCode,
  recordRemoteSale,
  returnRemoteSaleItems,
  setRemoteSaleCancelled,
  type SalesResult,
} from './sales';

/** Shop id on Supabase while the catalogue is live; null in demo mode. */
let remoteShopId: string | null = null;

export const remoteShopIdOf = () => remoteShopId;

/** Replaces categories, products, stock moves and sales with the account's Supabase data. */
export async function hydrateCatalog(): Promise<CatalogResult<true> | { ok: true; value: true }> {
  if (!isAuthLive) return { ok: true, value: true };
  const result = await loadCatalog();
  if (!result.ok) return result;
  remoteShopId = result.value.shopId;
  const sales = await loadSales(remoteShopId);
  setDemo((demo) => ({
    ...demo,
    categories: result.value.categories,
    products: result.value.products,
    moves: result.value.moves,
    // Soft-fail if the sales migration is missing: empty list, not seed sales with stale ids.
    sales: sales.ok ? sales.value : [],
  }));
  return { ok: true, value: true };
}

/*
 * One shared store for every island of the merchant space. It starts from the seed (so the
 * server render matches) and is kept in sessionStorage, so a sale rung up at the till shows
 * up in the sales list and the stock on the next page. Signup replaces it with an empty shop
 * holding the categories of the line of business the owner picked.
 */

const STORAGE_KEY = 'gs-demo';
const seedFor = (business: BusinessId, identity?: ShopIdentity) => createSeed(business, CATEGORIES[business], identity);
const seed = seedFor(DEFAULT_BUSINESS);
let state = seed;
let loaded = false;
const listeners = new Set<() => void>();

function save() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* Private mode: the demo still works for this page. */
  }
}

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  const setup = takeDemoSetup();
  if (setup) {
    state = seedFor(setup.business, setup);
    save();
    return;
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const saved = raw ? (JSON.parse(raw) as DemoState) : null;
    if (saved?.version === DEMO_VERSION) state = saved;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => {
  load();
  return state;
};
const getServerSnapshot = () => seed;

export const useDemo = () => useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

/** Current store snapshot outside of React (catalogue writes, stock RPCs). */
export const peekDemo = () => getSnapshot();

export function setDemo(update: (current: DemoState) => DemoState) {
  load();
  state = update(state);
  save();
  listeners.forEach((listener) => listener());
}

/** Empties the shop again, keeping its line of business, its identity and its owner. */
export function resetDemo() {
  setDemo(({ business, settings, team }) => {
    const owner = team.find((member) => member.role === 'owner');
    return seedFor(business, {
      shopName: settings.shopName,
      city: settings.city,
      logoUrl: settings.logoUrl,
      ownerName: owner?.name,
      phone: owner?.phone,
    });
  });
}

/* ------------------------------------------------------------------ session */

/**
 * Who the screens act as. The owner is the account holder; the staff roles are previews of
 * what an employee sees, played by the first team member with that role, or by a stand-in
 * until the owner invites one.
 */
function memberFor(demo: DemoState, roleId: RoleId): Member {
  const match =
    demo.team.find((item) => item.role === roleId && item.status === 'active') ??
    demo.team.find((item) => item.role === roleId && item.status !== 'suspended');
  if (match) return match;
  return {
    id: `apercu-${roleId}`,
    name: ROLES[roleId].label,
    role: roleId,
    phone: '',
    shop: roleId === 'owner' || roleId === 'stock' ? 'Toutes' : (demo.shops[0]?.name ?? 'Toutes'),
    status: 'active',
    lastSeen: null,
  };
}

export function useSession() {
  const demo = useDemo();
  const role = ROLES[demo.role];
  const member = memberFor(demo, demo.role);
  return {
    demo,
    business: businessOf(demo.business),
    roleId: demo.role,
    role,
    member,
    can: (screen: ScreenId) => role.screens.includes(screen),
  };
}

export type Session = ReturnType<typeof useSession>;

export const visibleSales = ({ demo, role, member }: Session) =>
  role.allSales ? demo.sales : demo.sales.filter((sale) => sale.seller === member.name);

const notificationKinds: Record<RoleId, NotificationKind[]> = {
  owner: ['stock', 'billing', 'team', 'deposit', 'system'],
  manager: ['stock', 'team', 'deposit', 'system'],
  seller: ['stock', 'system'],
  stock: ['stock', 'system'],
};

export const visibleNotifications = ({ demo, roleId }: Session) =>
  demo.notifications.filter(
    (notification) =>
      notificationKinds[roleId].includes(notification.kind) &&
      (!notification.roles || notification.roles.includes(roleId)),
  );

export function setRole(role: RoleId) {
  setDemo((demo) => ({ ...demo, role }));
}

export function markNotificationsRead(ids: string[]) {
  setDemo((demo) => ({
    ...demo,
    notifications: demo.notifications.map((item) => (ids.includes(item.id) ? { ...item, read: true } : item)),
  }));
}

/* ------------------------------------------------------------------ periods and totals */

export type Period = 'today' | '7d' | '30d';

export const PERIODS: { id: Period; label: string; compare: string }[] = [
  { id: 'today', label: 'Aujourd’hui', compare: 'vs hier' },
  { id: '7d', label: '7 jours', compare: 'vs 7 j. précédents' },
  { id: '30d', label: '30 jours', compare: 'vs 30 j. précédents' },
];

/** Current window and the same window just before, both cut at the same time of day. */
export function periodRange(period: Period) {
  const days = period === 'today' ? 1 : period === '7d' ? 7 : 30;
  const from = TODAY_START - (days - 1) * DAY;
  return { from, to: Infinity, previousFrom: from - days * DAY, previousTo: NOW - days * DAY };
}

export const between = (sales: Sale[], from: number, to: number) =>
  sales.filter((sale) => sale.at >= from && sale.at < to);

export type Totals = ReturnType<typeof summarize>;

export function summarize(sales: Sale[]) {
  const totals = {
    revenue: 0,
    count: 0,
    cost: 0,
    items: 0,
    byPay: {} as Partial<Record<PayId, number>>,
    byCategory: {} as Record<string, number>,
    bySeller: {} as Record<string, { revenue: number; count: number }>,
    byProduct: {} as Record<string, { name: string; cat: string; qty: number; revenue: number; cost: number }>,
  };
  for (const sale of sales) {
    if (sale.cancelled) continue;
    const net = saleNet(sale);
    totals.revenue += net;
    totals.count += 1;
    totals.cost += saleCost(sale);
    totals.byPay[sale.pay] = (totals.byPay[sale.pay] ?? 0) + net;
    const seller = (totals.bySeller[sale.seller] ??= { revenue: 0, count: 0 });
    seller.revenue += net;
    seller.count += 1;
    const gross = sale.lines.reduce((sum, line) => sum + line.price * line.qty, 0);
    for (const line of sale.lines) {
      const qty = line.qty - line.returned;
      if (qty <= 0) continue;
      const value = line.price * qty * (gross ? 1 - sale.discount / gross : 1);
      totals.items += qty;
      totals.byCategory[line.cat] = (totals.byCategory[line.cat] ?? 0) + value;
      const entry = (totals.byProduct[line.pid] ??= { name: line.name, cat: line.cat, qty: 0, revenue: 0, cost: 0 });
      entry.qty += qty;
      entry.revenue += value;
      entry.cost += line.cost * qty;
    }
  }
  return { ...totals, margin: totals.revenue - totals.cost };
}

export type ChartPoint = { label: string; detail: string; value: number; previous: number };

const sumBetween = (sales: Sale[], from: number, to: number) =>
  between(sales, from, to).reduce((sum, sale) => sum + saleNet(sale), 0);

export function chartPoints(period: Period, sales: Sale[]): ChartPoint[] {
  if (period === 'today') {
    const lastHour = Math.max(8, Math.floor((NOW - TODAY_START) / HOUR));
    return Array.from({ length: lastHour - 7 }, (_, index) => {
      const hour = 8 + index;
      const from = TODAY_START + hour * HOUR;
      const to = hour === lastHour ? Infinity : from + HOUR;
      return {
        label: `${hour}h`,
        detail: `${hour}h – ${hour + 1}h`,
        value: sumBetween(sales, from, to),
        previous: sumBetween(sales, from - DAY, from - DAY + HOUR),
      };
    });
  }
  const days = period === '7d' ? 7 : 30;
  return Array.from({ length: days }, (_, index) => {
    const day = TODAY_START - (days - 1 - index) * DAY;
    return {
      label: days === 7 ? formatWeekday(day) : formatDayOfMonth(day),
      detail: formatLongDay(day),
      value: sumBetween(sales, day, index === days - 1 ? Infinity : day + DAY),
      previous: sumBetween(sales, day - days * DAY, day - days * DAY + DAY),
    };
  });
}

/* ------------------------------------------------------------------ catalogue helpers */

export type StockStatus = 'ok' | 'low' | 'out';

export const stockStatus = (stock: number, min: number): StockStatus =>
  stock <= 0 ? 'out' : stock <= min ? 'low' : 'ok';

export const productStock = (product: Product) => product.variants.reduce((sum, item) => sum + item.stock, 0);

export type Item = { key: string; product: Product; variant: Variant; category: Category | undefined; full: string };

export function flatItems(demo: DemoState, { activeOnly = true } = {}): Item[] {
  return demo.products
    .filter((product) => !activeOnly || product.status === 'active')
    .flatMap((product) =>
      product.variants.map((variant) => ({
        key: variant.id,
        product,
        variant,
        category: demo.categories.find((category) => category.id === product.cat),
        full: variant.label ? `${product.name} · ${variant.label}` : product.name,
      })),
    );
}

/** Variants at or under their alert threshold, out-of-stock first. */
export const stockAlerts = (demo: DemoState) =>
  flatItems(demo)
    .filter((item) => item.variant.stock <= item.product.min)
    .sort((a, b) => a.variant.stock - b.variant.stock);

export function priceRange(product: Product) {
  const prices = product.variants.map((variant) => variant.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export const marginRate = (price: number, cost: number) => (price ? Math.round(((price - cost) / price) * 100) : 0);

/* ------------------------------------------------------------------ actions */

const nextTime = (demo: DemoState) =>
  Math.max(NOW, demo.sales[0]?.at ?? 0, demo.activity[0]?.at ?? 0, demo.moves[0]?.at ?? 0) + 30_000;

const withActivity = (demo: DemoState, user: string, text: string, icon: ActivityIcon): Activity[] => [
  { id: `a${Date.now()}${Math.random().toString(36).slice(2, 6)}`, at: nextTime(demo), user, text, icon },
  ...demo.activity,
];

const shiftStock = (products: Product[], deltas: Record<string, number>) =>
  products.map((product) =>
    product.variants.some((variant) => deltas[variant.id])
      ? {
        ...product,
        variants: product.variants.map((variant) =>
          deltas[variant.id] ? { ...variant, stock: Math.max(0, variant.stock + deltas[variant.id]) } : variant,
        ),
      }
      : product,
  );

const nextId = (ids: string[], prefix: string, pad = 0) => {
  const max = Math.max(0, ...ids.map((id) => Number(id.replace(/\D/g, '')) || 0));
  return `${prefix}${String(max + 1).padStart(pad, '0')}`;
};

export type SaleInput = {
  shop: Shop;
  seller: string;
  customer: string;
  /** `price`: unit price agreed with this customer; the product's catalogue price is left untouched. */
  lines: { vid: string; qty: number; price?: number }[];
  discount: number;
  pay: PayId;
  received: number;
  reference: string;
};

export async function recordSale(input: SaleInput): Promise<Sale | null> {
  const demo = getSnapshot();
  const items = flatItems(demo, { activeOnly: false });
  const lineDrafts = input.lines.map(({ vid, qty, price }) => {
    const { product, variant } = items.find((item) => item.variant.id === vid)!;
    const unit = price !== undefined ? price : variant.price;
    const changed = price !== undefined && price !== variant.price;
    return {
      variantId: vid,
      qty,
      price: unit,
      ...(changed ? { listPrice: variant.price } : {}),
      product,
      variant,
    };
  });

  if (remoteShopId) {
    const result = await recordRemoteSale({
      shopId: remoteShopId,
      code: nextSaleCode(demo.sales.map((sale) => sale.id)),
      shopName: input.shop,
      sellerName: input.seller,
      customer: input.customer.trim(),
      discount: input.discount,
      pay: input.pay,
      received: input.received,
      reference: input.reference.trim(),
      lines: lineDrafts.map(({ variantId, qty, price, listPrice }) => ({
        variantId,
        qty,
        price,
        ...(listPrice !== undefined ? { listPrice } : {}),
      })),
    });
    if (!result.ok) return null;
    const created = result.value;
    const deltas = Object.fromEntries(input.lines.map(({ vid, qty }) => [vid, -qty]));
    setDemo((current) => ({
      ...current,
      sales: [created, ...current.sales],
      products: shiftStock(current.products, deltas),
      activity: withActivity(current, input.seller, `a encaissé la vente ${created.id} à ${input.shop}`, 'sale'),
    }));
    return created;
  }

  let created: Sale | null = null;
  setDemo((current) => {
    const lines: SaleLine[] = lineDrafts.map(({ variantId, qty, price, listPrice, product, variant }) => ({
      pid: product.id,
      vid: variantId,
      name: product.name,
      label: variant.label,
      cat: product.cat,
      qty,
      price,
      ...(listPrice !== undefined ? { listPrice } : {}),
      cost: variant.cost,
      returned: 0,
    }));
    created = {
      id: nextSaleCode(current.sales.map((sale) => sale.id)),
      at: nextTime(current),
      shop: input.shop,
      seller: input.seller,
      customer: input.customer.trim(),
      customerPhone: '',
      customerEmail: '',
      invoicedAt: null,
      lines,
      discount: input.discount,
      pay: input.pay,
      received: input.received,
      reference: input.reference.trim(),
      cancelled: false,
    };
    const deltas = Object.fromEntries(input.lines.map(({ vid, qty }) => [vid, -qty]));
    return {
      ...current,
      sales: [created, ...current.sales],
      products: shiftStock(current.products, deltas),
      activity: withActivity(current, input.seller, `a encaissé la vente ${created.id} à ${input.shop}`, 'sale'),
    };
  });
  return created;
}

const remaining = (sale: Sale, sign: 1 | -1) =>
  Object.fromEntries(sale.lines.map((line) => [line.vid, sign * (line.qty - line.returned)]));

export async function setSaleCancelled(
  id: string,
  cancelled: boolean,
  user: string,
): Promise<SalesResult<true> | { ok: true; value: true }> {
  const sale = getSnapshot().sales.find((item) => item.id === id);
  if (!sale || sale.cancelled === cancelled) return { ok: true, value: true };

  if (remoteShopId) {
    const result = await setRemoteSaleCancelled(id, cancelled);
    if (!result.ok) return result;
    setDemo((demo) => ({
      ...demo,
      sales: demo.sales.map((item) => (item.id === id ? result.value : item)),
      products: shiftStock(demo.products, remaining(sale, cancelled ? 1 : -1)),
      activity: withActivity(demo, user, cancelled ? `a annulé la vente ${id}` : `a rétabli la vente ${id}`, 'sale'),
    }));
    return { ok: true, value: true };
  }

  setDemo((demo) => ({
    ...demo,
    sales: demo.sales.map((item) => (item.id === id ? { ...item, cancelled } : item)),
    products: shiftStock(demo.products, remaining(sale, cancelled ? 1 : -1)),
    activity: withActivity(demo, user, cancelled ? `a annulé la vente ${id}` : `a rétabli la vente ${id}`, 'sale'),
  }));
  return { ok: true, value: true };
}

export async function returnItems(
  id: string,
  quantities: Record<string, number>,
  user: string,
): Promise<SalesResult<true> | { ok: true; value: true }> {
  const sale = getSnapshot().sales.find((item) => item.id === id);
  if (!sale) return { ok: false, error: 'not-found' };

  if (remoteShopId) {
    const result = await returnRemoteSaleItems(id, quantities, user);
    if (!result.ok) return result;
    const at = Date.now();
    const returned = sale.lines.filter((line) => quantities[line.vid] > 0);
    setDemo((demo) => ({
      ...demo,
      sales: demo.sales.map((item) => (item.id === id ? result.value : item)),
      products: shiftStock(demo.products, quantities),
      moves: [
        ...returned.map((line, index) => ({
          id: `m${at}${index}`,
          at,
          type: 'return' as const,
          item: line.label ? `${line.name} · ${line.label}` : line.name,
          qty: quantities[line.vid],
          user,
          note: `Retour client ${id}`,
          source: sale.customer || 'Client',
        })),
        ...demo.moves,
      ],
      activity: withActivity(demo, user, `a enregistré un retour sur la vente ${id}`, 'sale'),
    }));
    return { ok: true, value: true };
  }

  setDemo((demo) => {
    const at = nextTime(demo);
    const returned = sale.lines.filter((line) => quantities[line.vid] > 0);
    return {
      ...demo,
      sales: demo.sales.map((item) =>
        item.id === id
          ? {
            ...item,
            lines: item.lines.map((line) => ({
              ...line,
              returned: line.returned + (quantities[line.vid] ?? 0),
            })),
          }
          : item,
      ),
      products: shiftStock(demo.products, quantities),
      moves: [
        ...returned.map((line, index) => ({
          id: `m${at}${index}`,
          at,
          type: 'return' as const,
          item: line.label ? `${line.name} · ${line.label}` : line.name,
          qty: quantities[line.vid],
          user,
          note: `Retour client ${id}`,
          source: sale.customer || 'Client',
        })),
        ...demo.moves,
      ],
      activity: withActivity(demo, user, `a enregistré un retour sur la vente ${id}`, 'sale'),
    };
  });
  return { ok: true, value: true };
}

export async function adjustStock(vid: string, delta: number, type: MoveType, note: string, user: string) {
  const demo = getSnapshot();
  const item = flatItems(demo, { activeOnly: false }).find((entry) => entry.variant.id === vid);
  if (!item || delta === 0) return;
  const party =
    type === 'return' ? { source: 'Client' } : type === 'loss' ? { destination: 'Casse ou perte' } : undefined;

  if (remoteShopId) {
    const result = await applyRemoteStockMove({
      shopId: remoteShopId,
      variantId: vid,
      type,
      qty: delta,
      itemLabel: item.full,
      source: party && 'source' in party ? party.source : undefined,
      destination: party && 'destination' in party ? party.destination : undefined,
      note,
      userName: user,
      movedAt: new Date(),
    });
    if (!result.ok) return result;
    setDemo((current) => ({
      ...current,
      products: shiftStock(current.products, { [vid]: delta }),
      moves: [result.value, ...current.moves],
      activity: withActivity(
        current,
        user,
        `a ${delta > 0 ? 'ajouté' : 'retiré'} ${Math.abs(delta)} × ${item.product.name}`,
        'stock',
      ),
    }));
    return result;
  }

  const at = nextTime(demo);
  setDemo((current) => ({
    ...current,
    products: shiftStock(current.products, { [vid]: delta }),
    moves: [{ id: `m${at}`, at, type, item: item.full, qty: delta, user, note, ...party }, ...current.moves],
    activity: withActivity(
      current,
      user,
      `a ${delta > 0 ? 'ajouté' : 'retiré'} ${Math.abs(delta)} × ${item.product.name}`,
      'stock',
    ),
  }));
}

export type MoveInput = {
  vid: string;
  direction: 'in' | 'out';
  qty: number;
  type: MoveType;
  /** Provenance of an entry, or destination / reason of an exit. */
  party: string;
  /** Day picked by the user; `null` means right now. */
  at: number | null;
  user: string;
  note: string;
};

/** A manual entry or exit; back-dated moves are filed at their date in the history. */
export async function recordMove(input: MoveInput) {
  const demo = getSnapshot();
  const item = flatItems(demo, { activeOnly: false }).find((entry) => entry.variant.id === input.vid);
  if (!item) return;
  const entry = input.direction === 'in';
  const qty = entry ? input.qty : -Math.min(input.qty, item.variant.stock);
  if (qty === 0) return;

  if (remoteShopId) {
    const result = await applyRemoteStockMove({
      shopId: remoteShopId,
      variantId: input.vid,
      type: input.type,
      qty,
      itemLabel: item.full,
      source: entry ? input.party : undefined,
      destination: entry ? undefined : input.party,
      note: input.note.trim(),
      userName: input.user,
      movedAt: input.at ? new Date(input.at) : new Date(),
    });
    if (!result.ok) return result;
    setDemo((current) => {
      const index = current.moves.findIndex((other) => other.at <= result.value.at);
      const moves = [...current.moves];
      moves.splice(index === -1 ? moves.length : index, 0, result.value);
      return {
        ...current,
        products: shiftStock(current.products, { [input.vid]: qty }),
        moves,
        activity: withActivity(
          current,
          input.user,
          entry
            ? `a enregistré l’entrée de ${input.qty} × ${item.product.name} (provenance : ${input.party})`
            : `a enregistré la sortie de ${Math.abs(qty)} × ${item.product.name} (${input.party})`,
          'stock',
        ),
      };
    });
    return result;
  }

  const now = nextTime(demo);
  const at = input.at ?? now;
  const move = {
    id: `m${now}`,
    at,
    type: input.type,
    item: item.full,
    qty,
    user: input.user,
    note: input.note.trim(),
    ...(entry ? { source: input.party } : { destination: input.party }),
  };
  setDemo((current) => {
    const index = current.moves.findIndex((other) => other.at <= at);
    const moves = [...current.moves];
    moves.splice(index === -1 ? moves.length : index, 0, move);
    return {
      ...current,
      products: shiftStock(current.products, { [input.vid]: qty }),
      moves,
      activity: withActivity(
        current,
        input.user,
        entry
          ? `a enregistré l’entrée de ${input.qty} × ${item.product.name} (provenance : ${input.party})`
          : `a enregistré la sortie de ${Math.abs(qty)} × ${item.product.name} (${input.party})`,
        'stock',
      ),
    };
  });
}

export async function applyInventory(counts: Record<string, number>, user: string) {
  const demo = getSnapshot();
  const items = flatItems(demo, { activeOnly: false });
  const deltas: { item: (typeof items)[number]; qty: number }[] = [];
  for (const item of items) {
    const counted = counts[item.variant.id];
    if (counted === undefined || counted === item.variant.stock) continue;
    deltas.push({ item, qty: counted - item.variant.stock });
  }
  if (!deltas.length) return;

  if (remoteShopId) {
    const applied: Move[] = [];
    for (const { item, qty } of deltas) {
      const result = await applyRemoteStockMove({
        shopId: remoteShopId,
        variantId: item.variant.id,
        type: 'inventory',
        qty,
        itemLabel: item.full,
        note: 'Écart d’inventaire',
        userName: user,
        movedAt: new Date(),
      });
      if (!result.ok) return result;
      applied.push(result.value);
    }
    const stockDeltas = Object.fromEntries(deltas.map(({ item, qty }) => [item.variant.id, qty]));
    setDemo((current) => ({
      ...current,
      products: shiftStock(current.products, stockDeltas),
      moves: [...applied, ...current.moves],
      activity: withActivity(current, user, `a validé un inventaire (${applied.length} écart(s))`, 'stock'),
    }));
    return;
  }

  const at = nextTime(demo);
  const stockDeltas = Object.fromEntries(deltas.map(({ item, qty }) => [item.variant.id, qty]));
  const moves = deltas.map(({ item, qty }, index) => ({
    id: `m${at}${index}`,
    at,
    type: 'inventory' as const,
    item: item.full,
    qty,
    user,
    note: 'Écart d’inventaire',
  }));
  setDemo((current) => ({
    ...current,
    products: shiftStock(current.products, stockDeltas),
    moves: [...moves, ...current.moves],
    activity: withActivity(current, user, `a validé un inventaire (${moves.length} écart(s))`, 'stock'),
  }));
}

/** Persists a category (and its attributes) when Supabase is live, then updates the shared store. */
export async function saveCategory(category: Category, sortOrder = 0) {
  const result = await upsertCategory(category, sortOrder);
  if (!result.ok) return result;
  const attrs = await replaceCategoryAttributes(category.id, category.attrs);
  if (!attrs.ok) return attrs;
  setDemo((demo) => {
    const exists = demo.categories.some((item) => item.id === category.id);
    return {
      ...demo,
      categories: exists
        ? demo.categories.map((item) => (item.id === category.id ? category : item))
        : [...demo.categories, category],
    };
  });
  return result;
}

/** Persists a product and its variants when Supabase is live, then updates the shared store. */
export async function saveProduct(product: Product, editing: boolean) {
  const result = await upsertProduct(product);
  if (!result.ok) return result;
  setDemo((current) => ({
    ...current,
    products: editing
      ? current.products.map((item) => (item.id === product.id ? product : item))
      : [product, ...current.products],
  }));
  return result;
}

export async function saveProductStatus(product: Product, status: Product['status']) {
  const result = await setProductStatus(product.id, status);
  if (!result.ok) return result;
  setDemo((current) => ({
    ...current,
    products: current.products.map((item) => (item.id === product.id ? { ...item, status } : item)),
  }));
  return result;
}

export function receiveGoods(
  input: { supplierId: string; reference: string; lines: { vid: string; qty: number; cost: number }[] },
  user: string,
) {
  let receptionId = '';
  setDemo((demo) => {
    const supplier = demo.suppliers.find((item) => item.id === input.supplierId)!;
    const items = flatItems(demo, { activeOnly: false });
    const at = nextTime(demo);
    const total = input.lines.reduce((sum, line) => sum + line.qty * line.cost, 0);
    const qty = input.lines.reduce((sum, line) => sum + line.qty, 0);
    receptionId = nextId(
      demo.receptions.map((reception) => reception.id),
      'R-',
      4,
    );
    const costs = Object.fromEntries(input.lines.map((line) => [line.vid, line.cost]));
    const products = shiftStock(demo.products, Object.fromEntries(input.lines.map((line) => [line.vid, line.qty]))).map(
      (product) => ({
        ...product,
        variants: product.variants.map((variant) =>
          costs[variant.id] ? { ...variant, cost: costs[variant.id] } : variant,
        ),
      }),
    );
    return {
      ...demo,
      products,
      receptions: [
        {
          id: receptionId,
          at,
          supplier: supplier.name,
          reference: input.reference.trim(),
          lines: input.lines.length,
          qty,
          total,
          user,
        },
        ...demo.receptions,
      ],
      suppliers: demo.suppliers.map((item) =>
        item.id === supplier.id ? { ...item, total: item.total + total } : item,
      ),
      moves: [
        ...input.lines.map((line, index) => ({
          id: `m${at}${index}`,
          at,
          type: 'reception' as const,
          item: items.find((item) => item.variant.id === line.vid)!.full,
          qty: line.qty,
          user,
          note: `Réception ${receptionId}`,
          source: supplier.name,
        })),
        ...demo.moves,
      ],
      activity: withActivity(demo, user, `a réceptionné ${qty} article(s) de ${supplier.name}`, 'reception'),
    };
  });
  return receptionId;
}

export function logActivity(user: string, text: string, icon: ActivityIcon) {
  setDemo((demo) => ({ ...demo, activity: withActivity(demo, user, text, icon) }));
}

export type InvoiceCustomer = Pick<Sale, 'customer' | 'customerPhone' | 'customerEmail'>;

/** Saves who the invoice is for and fixes its date the first time it is printed or sent. */
export async function issueInvoice(
  id: string,
  customer: InvoiceCustomer,
): Promise<SalesResult<true> | { ok: true; value: true }> {
  const sale = getSnapshot().sales.find((item) => item.id === id);
  if (!sale) return { ok: false, error: 'not-found' };
  const trimmed = { ...customer, customer: customer.customer.trim() };
  const invoicedAt = invoiceDate(sale);

  if (remoteShopId) {
    const result = await issueRemoteInvoice(id, trimmed, invoicedAt);
    if (!result.ok) return result;
  }

  setDemo((demo) => ({
    ...demo,
    sales: demo.sales.map((item) => (item.id === id ? { ...item, ...trimmed, invoicedAt } : item)),
  }));
  return { ok: true, value: true };
}

/* ------------------------------------------------------------------ deposits */

/** Days a manager can still declare for: the last two weeks, today included, without a deposit yet. */
export function undeclaredDays(demo: DemoState, shop: Shop) {
  return Array.from({ length: 14 }, (_, index) => TODAY_START - index * DAY).filter(
    (day) => !demo.deposits.some((deposit) => deposit.shop === shop && deposit.day === day),
  );
}

export type DepositInput = Pick<Deposit, 'shop' | 'day' | 'deposited' | 'method' | 'reference' | 'comment'>;

/** A manager hands the day's cash to the owner: it waits as "à vérifier" and the owner is notified. */
export function declareDeposit(input: DepositInput, manager: string): Deposit {
  let created: Deposit | null = null;
  setDemo((demo) => {
    const at = nextTime(demo);
    const expected = cashSalesTotal(demo.sales, input.shop, input.day);
    const deposit: Deposit = {
      ...input,
      reference: input.reference.trim(),
      comment: input.comment.trim(),
      id: `D-${Math.round((TODAY_START - input.day) / DAY)}-${input.shop}`,
      manager,
      expected,
      depositedAt: at,
      status: 'pending',
      note: '',
    };
    created = deposit;
    const gap = input.deposited - expected;
    return {
      ...demo,
      deposits: [deposit, ...demo.deposits].sort((a, b) => b.day - a.day || b.depositedAt - a.depositedAt),
      notifications: [
        {
          id: `n-${deposit.id}`,
          kind: 'deposit',
          title: `Versement à vérifier : ${input.shop}`,
          body: `${manager} a remis ${formatFcfa(input.deposited)} (${input.method}) pour le ${formatLongDay(input.day).toLowerCase()}${gap < 0 ? `. Il manque ${formatFcfa(-gap)}.` : gap > 0 ? `, ${formatFcfa(gap)} de plus que prévu.` : '.'
            }`,
          at,
          read: false,
          href: '/app/versements',
          roles: ['owner'],
        },
        ...demo.notifications,
      ],
      activity: withActivity(
        demo,
        manager,
        `a déclaré un versement de ${formatFcfa(input.deposited)} pour ${input.shop}`,
        'deposit',
      ),
    };
  });
  return created!;
}

/** Undo of a declaration that is still waiting for the owner. */
export function withdrawDeposit(id: string) {
  setDemo((demo) => ({
    ...demo,
    deposits: demo.deposits.filter((deposit) => deposit.id !== id || deposit.status !== 'pending'),
    notifications: demo.notifications.filter((notification) => notification.id !== `n-${id}`),
  }));
}

/* ------------------------------------------------------------------ shops */

export const shopAddress = (demo: DemoState, shop: Shop) =>
  demo.shops.find((item) => item.name === shop)?.address ?? '';

/** How many shops the current plan allows (`null`: unlimited), and whether one more fits. */
export function shopQuota(demo: DemoState) {
  const limit = PLAN_LIMITS[demo.plan.id].shops;
  return { used: demo.shops.length, limit, canAdd: limit === null || demo.shops.length < limit };
}

export function addShop(name: string, address: string, user: string) {
  setDemo((demo) => {
    if (!shopQuota(demo).canAdd) return demo;
    return {
      ...demo,
      shops: [...demo.shops, { name: name.trim(), address: address.trim() }],
      activity: withActivity(demo, user, `a ouvert la boutique ${name.trim()}`, 'edit'),
    };
  });
}

export function setShopAddresses(addresses: Record<Shop, string>) {
  setDemo((demo) => ({
    ...demo,
    shops: demo.shops.map((shop) => ({ ...shop, address: addresses[shop.name] ?? shop.address })),
  }));
}

/* ------------------------------------------------------------------ expenses */

/** The owner sees every shop; a manager tied to one shop only sees its expenses. */
export const visibleExpenses = ({ demo, roleId, member }: Session) =>
  roleId === 'owner' || member.shop === 'Toutes'
    ? demo.expenses
    : demo.expenses.filter((expense) => expense.shop === member.shop);

export type ExpenseInput = Omit<Expense, 'id' | 'recordedBy' | 'recordedAt'>;

export function recordExpense(input: ExpenseInput, user: string): Expense {
  let created: Expense | null = null;
  setDemo((demo) => {
    created = {
      ...input,
      reason: input.reason.trim(),
      note: input.note.trim(),
      id: nextId(
        demo.expenses.map((expense) => expense.id),
        'E-',
        4,
      ),
      recordedBy: user,
      recordedAt: nextTime(demo),
    };
    return {
      ...demo,
      expenses: [created, ...demo.expenses].sort((a, b) => b.day - a.day || b.recordedAt - a.recordedAt),
      activity: withActivity(
        demo,
        user,
        `a enregistré une dépense de ${formatFcfa(input.amount)} (${created.reason})`,
        'expense',
      ),
    };
  });
  return created!;
}

export function deleteExpense(id: string, user: string) {
  setDemo((demo) => {
    const expense = demo.expenses.find((item) => item.id === id);
    if (!expense) return demo;
    return {
      ...demo,
      expenses: demo.expenses.filter((item) => item.id !== id),
      activity: withActivity(demo, user, `a supprimé la dépense « ${expense.reason} »`, 'expense'),
    };
  });
}

export function restoreExpense(expense: Expense) {
  setDemo((demo) =>
    demo.expenses.some((item) => item.id === expense.id)
      ? demo
      : {
        ...demo,
        expenses: [...demo.expenses, expense].sort((a, b) => b.day - a.day || b.recordedAt - a.recordedAt),
      },
  );
}
