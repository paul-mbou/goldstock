import type { PayId, Sale, SaleLine } from '../../data/dashboard';

export type SaleRow = {
  id: string;
  shop_id: string;
  code: string;
  sold_at: string;
  shop_name: string;
  seller_name: string;
  customer: string;
  customer_phone: string;
  customer_email: string;
  invoiced_at: string | null;
  discount: number;
  pay: string;
  received: number;
  reference: string;
  cancelled: boolean;
};

export type SaleLineRow = {
  id: string;
  sale_id: string;
  product_id: string;
  variant_id: string;
  name: string;
  label: string;
  category_id: string | null;
  qty: number;
  price: number;
  list_price: number | null;
  cost: number;
  returned: number;
};

const PAYS: PayId[] = ['cash', 'mtn', 'om', 'transfer'];

export const asPay = (value: string): PayId => (PAYS.includes(value as PayId) ? (value as PayId) : 'cash');

export function mapSaleLine(row: SaleLineRow): SaleLine {
  return {
    pid: row.product_id,
    vid: row.variant_id,
    name: row.name,
    label: row.label,
    cat: row.category_id ?? '',
    qty: row.qty,
    price: row.price,
    ...(row.list_price != null ? { listPrice: row.list_price } : {}),
    cost: row.cost,
    returned: row.returned,
  };
}

/** UI sale id is the human code (V-12); uuid stays on the row for RPCs. */
export function mapSale(row: SaleRow, lines: SaleLineRow[]): Sale {
  return {
    id: row.code,
    at: new Date(row.sold_at).getTime(),
    shop: row.shop_name,
    seller: row.seller_name,
    customer: row.customer,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    invoicedAt: row.invoiced_at ? new Date(row.invoiced_at).getTime() : null,
    lines: lines.filter((line) => line.sale_id === row.id).map(mapSaleLine),
    discount: row.discount,
    pay: asPay(row.pay),
    received: row.received,
    reference: row.reference,
    cancelled: row.cancelled,
  };
}

export type SaleLineDraft = {
  variantId: string;
  qty: number;
  price: number;
  listPrice?: number;
};

export type SaleDraft = {
  shopId: string;
  code: string;
  shopName: string;
  sellerName: string;
  customer: string;
  discount: number;
  pay: PayId;
  received: number;
  reference: string;
  lines: SaleLineDraft[];
};

/** Next V-n code from existing sale codes. */
export function nextSaleCode(codes: string[]) {
  const max = Math.max(0, ...codes.map((code) => Number(code.replace(/\D/g, '')) || 0));
  return `V-${max + 1}`;
}
