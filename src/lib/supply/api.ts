import type { Expense, Reception, Supplier } from '../../data/dashboard';
import { isAuthLive } from '../auth';
import { getSupabase } from '../supabase';
import {
  dateFromDay,
  mapExpense,
  mapReception,
  mapSupplier,
  type ExpenseRow,
  type ReceptionLineDraft,
  type ReceptionRow,
  type SupplierRow,
  type SupplySnapshot,
} from './types';

export type SupplyError = 'not-signed-in' | 'no-shop' | 'failed' | 'not-found';
export type SupplyResult<T> = { ok: true; value: T } | { ok: false; error: SupplyError };

const fail = <T>(error: SupplyError): SupplyResult<T> => ({ ok: false, error });
const ok = <T>(value: T): SupplyResult<T> => ({ ok: true, value });

const receptionUuids = new Map<string, string>();
const expenseUuids = new Map<string, string>();

export const receptionUuidOf = (code: string) => receptionUuids.get(code) ?? null;
export const expenseUuidOf = (code: string) => expenseUuids.get(code) ?? null;

export async function loadSupply(shopId: string): Promise<SupplyResult<SupplySnapshot>> {
  if (!isAuthLive) return fail('not-signed-in');
  const supabase = getSupabase();
  const [
    { data: supplierRows, error: supplierError },
    { data: receptionRows, error: receptionError },
    { data: expenseRows, error: expenseError },
  ] = await Promise.all([
    supabase.from('suppliers').select('*').eq('shop_id', shopId).order('name'),
    supabase.from('receptions').select('*').eq('shop_id', shopId).order('received_at', { ascending: false }).limit(200),
    supabase.from('expenses').select('*').eq('shop_id', shopId).order('day', { ascending: false }).limit(500),
  ]);
  if (supplierError || receptionError || expenseError) return fail('failed');

  receptionUuids.clear();
  expenseUuids.clear();
  for (const row of (receptionRows as ReceptionRow[] | null) ?? []) receptionUuids.set(row.code, row.id);
  for (const row of (expenseRows as ExpenseRow[] | null) ?? []) expenseUuids.set(row.code, row.id);

  return ok({
    suppliers: ((supplierRows as SupplierRow[] | null) ?? []).map(mapSupplier),
    receptions: ((receptionRows as ReceptionRow[] | null) ?? []).map(mapReception),
    expenses: ((expenseRows as ExpenseRow[] | null) ?? []).map(mapExpense),
  });
}

export async function insertRemoteSupplier(
  shopId: string,
  supplier: Omit<Supplier, 'id' | 'total'>,
): Promise<SupplyResult<Supplier>> {
  if (!isAuthLive) return fail('not-signed-in');
  const { data, error } = await getSupabase()
    .from('suppliers')
    .insert({
      shop_id: shopId,
      name: supplier.name.trim(),
      contact: supplier.contact,
      phone: supplier.phone,
      city: supplier.city,
      category: supplier.category,
      total: 0,
    })
    .select('*')
    .single();
  if (error || !data) return fail('failed');
  return ok(mapSupplier(data as SupplierRow));
}

export async function receiveRemoteGoods(input: {
  shopId: string;
  code: string;
  supplierId: string;
  reference: string;
  userName: string;
  lines: ReceptionLineDraft[];
}): Promise<SupplyResult<Reception>> {
  if (!isAuthLive) return fail('not-signed-in');
  const { data, error } = await getSupabase().rpc('receive_goods', {
    p_shop_id: input.shopId,
    p_code: input.code,
    p_supplier_id: input.supplierId,
    p_reference: input.reference,
    p_user_name: input.userName,
    p_lines: input.lines.map((line) => ({
      variant_id: line.variantId,
      qty: line.qty,
      cost: line.cost,
    })),
  });
  if (error || !data) return fail('failed');
  const row = data as ReceptionRow;
  receptionUuids.set(row.code, row.id);
  return ok(mapReception(row));
}

export async function insertRemoteExpense(shopId: string, expense: Expense): Promise<SupplyResult<Expense>> {
  if (!isAuthLive) return fail('not-signed-in');
  const { data, error } = await getSupabase()
    .from('expenses')
    .insert({
      shop_id: shopId,
      code: expense.id,
      day: dateFromDay(expense.day),
      shop_name: expense.shop,
      category: expense.category,
      reason: expense.reason,
      amount: expense.amount,
      author: expense.author,
      pay: expense.pay,
      note: expense.note,
      recorded_by: expense.recordedBy,
      recorded_at: new Date(expense.recordedAt).toISOString(),
    })
    .select('*')
    .single();
  if (error || !data) return fail('failed');
  const row = data as ExpenseRow;
  expenseUuids.set(row.code, row.id);
  return ok(mapExpense(row));
}

export async function deleteRemoteExpense(code: string): Promise<SupplyResult<true>> {
  const uuid = expenseUuidOf(code);
  if (!uuid) return fail('not-found');
  const { error } = await getSupabase().from('expenses').delete().eq('id', uuid);
  if (error) return fail('failed');
  expenseUuids.delete(code);
  return ok(true);
}
