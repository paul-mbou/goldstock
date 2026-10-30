import type {
  AttrType,
  AttrValue,
  Attribute,
  Category,
  CategoryIcon,
  Move,
  MoveType,
  Product,
  ProductStatus,
  Tone,
  Variant,
} from '../../data/dashboard';

export type CategoryRow = {
  id: string;
  shop_id: string;
  code: string;
  name: string;
  icon: string;
  tone: string;
  subs: string[] | null;
  archived: boolean;
  sort_order: number;
};

export type AttributeRow = {
  id: string;
  category_id: string;
  code: string;
  name: string;
  type: string;
  options: string[] | null;
  is_variant: boolean;
  required: boolean;
  hint: string | null;
  sort_order: number;
};

export type ProductRow = {
  id: string;
  shop_id: string;
  category_id: string;
  name: string;
  sub: string;
  attrs: Record<string, AttrValue> | null;
  min_stock: number;
  status: string;
  description: string;
  created_at: string;
};

export type VariantRow = {
  id: string;
  product_id: string;
  sku: string;
  label: string;
  price: number;
  cost: number;
  stock: number;
};

export type MoveRow = {
  id: string;
  shop_id: string;
  variant_id: string;
  type: string;
  qty: number;
  item_label: string;
  source: string | null;
  destination: string | null;
  note: string;
  user_name: string;
  moved_at: string;
};

export type CatalogSnapshot = {
  shopId: string;
  categories: Category[];
  products: Product[];
  moves: Move[];
};

export type StockMoveDraft = {
  shopId: string;
  variantId: string;
  type: MoveType;
  /** Signed quantity: positive for entries, negative for exits. */
  qty: number;
  itemLabel: string;
  source?: string;
  destination?: string;
  note: string;
  userName: string;
  movedAt: Date | null;
};

const ATTR_TYPES: AttrType[] = ['text', 'number', 'date', 'list', 'multi', 'yesno', 'color'];
const TONES: Tone[] = ['gold', 'navy', 'teal', 'rose', 'violet'];
const STATUSES: ProductStatus[] = ['active', 'draft', 'archived'];
const MOVE_TYPES: MoveType[] = ['reception', 'entry', 'exit', 'adjust', 'loss', 'return', 'inventory'];

export const asAttrType = (value: string): AttrType =>
  ATTR_TYPES.includes(value as AttrType) ? (value as AttrType) : 'text';

export const asTone = (value: string): Tone => (TONES.includes(value as Tone) ? (value as Tone) : 'navy');

export const asStatus = (value: string): ProductStatus =>
  STATUSES.includes(value as ProductStatus) ? (value as ProductStatus) : 'active';

export const asMoveType = (value: string): MoveType =>
  MOVE_TYPES.includes(value as MoveType) ? (value as MoveType) : 'adjust';

export function mapAttribute(row: AttributeRow): Attribute {
  return {
    id: row.id,
    name: row.name,
    type: asAttrType(row.type),
    options: row.options ?? [],
    variant: row.is_variant,
    required: row.required,
    ...(row.hint ? { hint: row.hint } : {}),
  };
}

export function mapCategory(row: CategoryRow, attrs: AttributeRow[]): Category {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    icon: row.icon as CategoryIcon,
    tone: asTone(row.tone),
    subs: row.subs ?? [],
    attrs: attrs
      .filter((attr) => attr.category_id === row.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(mapAttribute),
    archived: row.archived,
  };
}

export function mapVariant(row: VariantRow): Variant {
  return {
    id: row.id,
    sku: row.sku,
    label: row.label,
    price: row.price,
    cost: row.cost,
    stock: row.stock,
  };
}

export function mapProduct(row: ProductRow, variants: VariantRow[]): Product {
  return {
    id: row.id,
    name: row.name,
    cat: row.category_id,
    sub: row.sub,
    attrs: row.attrs ?? {},
    min: row.min_stock,
    status: asStatus(row.status),
    description: row.description,
    variants: variants.filter((variant) => variant.product_id === row.id).map(mapVariant),
    created: new Date(row.created_at).getTime(),
  };
}

export function mapMove(row: MoveRow): Move {
  return {
    id: row.id,
    at: new Date(row.moved_at).getTime(),
    type: asMoveType(row.type),
    item: row.item_label,
    qty: row.qty,
    user: row.user_name,
    note: row.note,
    ...(row.source ? { source: row.source } : {}),
    ...(row.destination ? { destination: row.destination } : {}),
  };
}

/** Signed qty after clamping an exit to available stock. */
export function signedMoveQty(direction: 'in' | 'out', qty: number, available: number) {
  const amount = Math.max(0, Math.floor(qty));
  if (amount === 0) return 0;
  return direction === 'in' ? amount : -Math.min(amount, Math.max(0, available));
}

/** Next stock after applying a signed delta; never goes below zero. */
export function nextStock(current: number, delta: number) {
  return Math.max(0, current + delta);
}
