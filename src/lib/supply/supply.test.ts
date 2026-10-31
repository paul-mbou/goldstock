import { describe, expect, it } from 'vitest';
import {
  asExpenseCategory,
  asPay,
  dateFromDay,
  dayFromDate,
  mapExpense,
  mapReception,
  mapSupplier,
  nextCodedId,
  type ExpenseRow,
  type ReceptionRow,
  type SupplierRow,
} from './types';

describe('nextCodedId', () => {
  it('pads reception and expense codes', () => {
    expect(nextCodedId([], 'R-', 4)).toBe('R-0001');
    expect(nextCodedId(['R-0001', 'R-0009'], 'R-', 4)).toBe('R-0010');
    expect(nextCodedId(['E-0003'], 'E-', 4)).toBe('E-0004');
  });
});

describe('day helpers', () => {
  it('round-trips a Douala calendar day', () => {
    const day = dayFromDate('2026-10-23');
    expect(dateFromDay(day)).toBe('2026-10-23');
    expect(day).toBe(Date.parse('2026-10-23T00:00:00+01:00'));
  });
});

describe('mappers', () => {
  it('maps a supplier with its cumulative total', () => {
    const row: SupplierRow = {
      id: 'sup-1',
      shop_id: 'shop-1',
      name: 'Ets Kamdem',
      contact: 'Jean',
      phone: '+237 6 77 00 00 00',
      city: 'Douala',
      category: 'Smartphones',
      total: 250000,
    };
    expect(mapSupplier(row)).toEqual({
      id: 'sup-1',
      name: 'Ets Kamdem',
      contact: 'Jean',
      phone: '+237 6 77 00 00 00',
      city: 'Douala',
      category: 'Smartphones',
      total: 250000,
    });
  });

  it('uses the human code as the UI reception id', () => {
    const row: ReceptionRow = {
      id: 'rec-uuid',
      shop_id: 'shop-1',
      code: 'R-0007',
      supplier_id: 'sup-1',
      supplier_name: 'Ets Kamdem',
      reference: 'BL-12',
      lines_count: 2,
      qty: 5,
      total: 400000,
      user_name: 'Paul',
      received_at: '2026-10-23T13:30:00.000Z',
    };
    const reception = mapReception(row);
    expect(reception.id).toBe('R-0007');
    expect(reception.supplier).toBe('Ets Kamdem');
    expect(reception.lines).toBe(2);
  });

  it('maps an expense and falls back on unknown categories or pays', () => {
    const row: ExpenseRow = {
      id: 'exp-uuid',
      shop_id: 'shop-1',
      code: 'E-0002',
      day: '2026-10-20',
      shop_name: 'Akwa',
      category: 'rent',
      reason: 'Loyer octobre',
      amount: 150000,
      author: 'Paul',
      pay: 'transfer',
      note: '',
      recorded_by: 'Paul',
      recorded_at: '2026-10-21T09:00:00.000Z',
    };
    const expense = mapExpense(row);
    expect(expense.id).toBe('E-0002');
    expect(expense.day).toBe(dayFromDate('2026-10-20'));
    expect(expense.category).toBe('rent');
    expect(expense.pay).toBe('transfer');
    expect(asExpenseCategory('weird')).toBe('other');
    expect(asPay('weird')).toBe('cash');
  });
});
