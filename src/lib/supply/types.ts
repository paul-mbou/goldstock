import type { Expense, ExpenseCategory, PayId, Reception, Supplier } from '../../data/dashboard';

export type SupplierRow = {
  id: string;
  shop_id: string;
  name: string;
  contact: string;
  phone: string;
  city: string;
  category: string;
  total: number;
};

export type ReceptionRow = {
  id: string;
  shop_id: string;
  code: string;
  supplier_id: string;
  supplier_name: string;
  reference: string;
  lines_count: number;
  qty: number;
  total: number;
  user_name: string;
  received_at: string;
};

export type ExpenseRow = {
  id: string;
  shop_id: string;
  code: string;
  day: string;
  shop_name: string;
  category: string;
  reason: string;
  amount: number;
  author: string;
  pay: string;
  note: string;
  recorded_by: string;
  recorded_at: string;
};

const PAYS: PayId[] = ['cash', 'mtn', 'om', 'transfer'];
const EXPENSE_CATS: ExpenseCategory[] = [
  'rent',
  'utilities',
  'salaries',
  'transport',
  'supplies',
  'taxes',
  'repairs',
  'other',
];

export const asPay = (value: string): PayId => (PAYS.includes(value as PayId) ? (value as PayId) : 'cash');

export const asExpenseCategory = (value: string): ExpenseCategory =>
  EXPENSE_CATS.includes(value as ExpenseCategory) ? (value as ExpenseCategory) : 'other';

/** Parse a Postgres `date` (YYYY-MM-DD) as Douala midnight, matching expense forms. */
export const dayFromDate = (value: string) => Date.parse(`${value}T00:00:00+01:00`);

export function dateFromDay(day: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Douala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(day));
}

export function mapSupplier(row: SupplierRow): Supplier {
  return {
    id: row.id,
    name: row.name,
    contact: row.contact,
    phone: row.phone,
    city: row.city,
    category: row.category,
    total: row.total,
  };
}

/** UI reception id is the human code (R-0001). */
export function mapReception(row: ReceptionRow): Reception {
  return {
    id: row.code,
    at: new Date(row.received_at).getTime(),
    supplier: row.supplier_name,
    reference: row.reference,
    lines: row.lines_count,
    qty: row.qty,
    total: row.total,
    user: row.user_name,
  };
}

/** UI expense id is the human code (E-0001). */
export function mapExpense(row: ExpenseRow): Expense {
  return {
    id: row.code,
    day: dayFromDate(row.day),
    shop: row.shop_name,
    category: asExpenseCategory(row.category),
    reason: row.reason,
    amount: row.amount,
    author: row.author,
    pay: asPay(row.pay),
    note: row.note,
    recordedBy: row.recorded_by,
    recordedAt: new Date(row.recorded_at).getTime(),
  };
}

export type ReceptionLineDraft = { variantId: string; qty: number; cost: number };

export type SupplySnapshot = {
  suppliers: Supplier[];
  receptions: Reception[];
  expenses: Expense[];
};

export function nextCodedId(codes: string[], prefix: string, pad = 0) {
  const max = Math.max(0, ...codes.map((code) => Number(code.replace(/\D/g, '')) || 0));
  const next = String(max + 1);
  return `${prefix}${pad ? next.padStart(pad, '0') : next}`;
}
