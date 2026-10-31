import type { Sale } from '../../data/dashboard';
import { isAuthLive } from '../auth';
import { getSupabase } from '../supabase';
import { mapSale, type SaleDraft, type SaleLineRow, type SaleRow } from './types';

export type SalesError = 'not-signed-in' | 'no-shop' | 'failed' | 'insufficient-stock' | 'not-found';
export type SalesResult<T> = { ok: true; value: T } | { ok: false; error: SalesError };

const fail = <T>(error: SalesError): SalesResult<T> => ({ ok: false, error });
const ok = <T>(value: T): SalesResult<T> => ({ ok: true, value });

/** Maps UI sale code (V-12) → Supabase uuid for RPCs. */
const saleUuids = new Map<string, string>();

export const saleUuidOf = (code: string) => saleUuids.get(code) ?? null;

export function rememberSaleUuid(code: string, uuid: string) {
  saleUuids.set(code, uuid);
}

export async function loadSales(shopId: string): Promise<SalesResult<Sale[]>> {
  if (!isAuthLive) return fail('not-signed-in');
  const supabase = getSupabase();
  const { data: saleRows, error } = await supabase
    .from('sales')
    .select('*')
    .eq('shop_id', shopId)
    .order('sold_at', { ascending: false })
    .limit(500);
  if (error) return fail('failed');
  const rows = (saleRows as SaleRow[] | null) ?? [];
  if (!rows.length) {
    saleUuids.clear();
    return ok([]);
  }

  const { data: lineRows, error: lineError } = await supabase
    .from('sale_lines')
    .select('*')
    .in(
      'sale_id',
      rows.map((row) => row.id),
    );
  if (lineError) return fail('failed');

  saleUuids.clear();
  for (const row of rows) saleUuids.set(row.code, row.id);
  return ok(rows.map((row) => mapSale(row, (lineRows as SaleLineRow[] | null) ?? [])));
}

export async function recordRemoteSale(draft: SaleDraft): Promise<SalesResult<Sale>> {
  if (!isAuthLive) return fail('not-signed-in');
  const { data, error } = await getSupabase().rpc('record_sale', {
    p_shop_id: draft.shopId,
    p_code: draft.code,
    p_shop_name: draft.shopName,
    p_seller_name: draft.sellerName,
    p_customer: draft.customer,
    p_discount: draft.discount,
    p_pay: draft.pay,
    p_received: draft.received,
    p_reference: draft.reference,
    p_lines: draft.lines.map((line) => ({
      variant_id: line.variantId,
      qty: line.qty,
      price: line.price,
      list_price: line.listPrice ?? null,
    })),
  });
  if (error) {
    if (/Insufficient stock/i.test(error.message)) return fail('insufficient-stock');
    return fail('failed');
  }
  const row = data as SaleRow;
  rememberSaleUuid(row.code, row.id);
  const { data: lines } = await getSupabase().from('sale_lines').select('*').eq('sale_id', row.id);
  return ok(mapSale(row, (lines as SaleLineRow[] | null) ?? []));
}

export async function setRemoteSaleCancelled(code: string, cancelled: boolean): Promise<SalesResult<Sale>> {
  const uuid = saleUuidOf(code);
  if (!uuid) return fail('not-found');
  const { data, error } = await getSupabase().rpc('set_sale_cancelled', {
    p_sale_id: uuid,
    p_cancelled: cancelled,
  });
  if (error) return fail('failed');
  const row = data as SaleRow;
  const { data: lines } = await getSupabase().from('sale_lines').select('*').eq('sale_id', row.id);
  return ok(mapSale(row, (lines as SaleLineRow[] | null) ?? []));
}

export async function returnRemoteSaleItems(
  code: string,
  quantities: Record<string, number>,
  userName: string,
): Promise<SalesResult<Sale>> {
  const uuid = saleUuidOf(code);
  if (!uuid) return fail('not-found');
  const payload = Object.fromEntries(
    Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([vid, qty]) => [vid, qty]),
  );
  const { data, error } = await getSupabase().rpc('return_sale_items', {
    p_sale_id: uuid,
    p_returns: payload,
    p_user_name: userName,
  });
  if (error) return fail('failed');
  const row = data as SaleRow;
  const { data: lines } = await getSupabase().from('sale_lines').select('*').eq('sale_id', row.id);
  return ok(mapSale(row, (lines as SaleLineRow[] | null) ?? []));
}

export async function issueRemoteInvoice(
  code: string,
  customer: { customer: string; customerPhone: string; customerEmail: string },
  invoicedAt: number,
): Promise<SalesResult<true>> {
  const uuid = saleUuidOf(code);
  if (!uuid) return fail('not-found');
  const { error } = await getSupabase()
    .from('sales')
    .update({
      customer: customer.customer.trim(),
      customer_phone: customer.customerPhone,
      customer_email: customer.customerEmail,
      invoiced_at: new Date(invoicedAt).toISOString(),
    })
    .eq('id', uuid);
  return error ? fail('failed') : ok(true);
}
