import { describe, expect, it } from 'vitest';
import { asPay, mapSale, mapSaleLine, nextSaleCode, type SaleLineRow, type SaleRow } from './types';

const saleRow: SaleRow = {
  id: 'sale-uuid-1',
  shop_id: 'shop-1',
  code: 'V-12',
  sold_at: '2026-10-23T13:30:00.000Z',
  shop_name: 'Akwa',
  seller_name: 'Paul',
  customer: 'Client',
  customer_phone: '+237677123456',
  customer_email: 'a@b.c',
  invoiced_at: '2026-10-24T10:00:00.000Z',
  discount: 500,
  pay: 'mtn',
  received: 0,
  reference: 'REF-1',
  cancelled: false,
};

const lineRow: SaleLineRow = {
  id: 'line-1',
  sale_id: 'sale-uuid-1',
  product_id: 'p1',
  variant_id: 'v1',
  name: 'Galaxy A15',
  label: '128 Go',
  category_id: 'cat-1',
  qty: 2,
  price: 140000,
  list_price: 150000,
  cost: 100000,
  returned: 1,
};

describe('nextSaleCode', () => {
  it('starts at V-1 when there are no sales', () => {
    expect(nextSaleCode([])).toBe('V-1');
  });

  it('increments from the highest numeric suffix', () => {
    expect(nextSaleCode(['V-1', 'V-9', 'V-3'])).toBe('V-10');
  });
});

describe('asPay', () => {
  it('keeps known payment methods', () => {
    expect(asPay('cash')).toBe('cash');
    expect(asPay('om')).toBe('om');
  });

  it('falls back to cash for unknown values', () => {
    expect(asPay('bitcoin')).toBe('cash');
  });
});

describe('mappers', () => {
  it('maps a sale line and keeps the catalogue price when renegotiated', () => {
    const line = mapSaleLine(lineRow);
    expect(line.vid).toBe('v1');
    expect(line.price).toBe(140000);
    expect(line.listPrice).toBe(150000);
    expect(line.returned).toBe(1);
  });

  it('uses the human code as the UI sale id', () => {
    const sale = mapSale(saleRow, [lineRow, { ...lineRow, id: 'other', sale_id: 'other-sale' }]);
    expect(sale.id).toBe('V-12');
    expect(sale.shop).toBe('Akwa');
    expect(sale.pay).toBe('mtn');
    expect(sale.invoicedAt).toBe(new Date(saleRow.invoiced_at!).getTime());
    expect(sale.lines).toHaveLength(1);
    expect(sale.lines[0]?.name).toBe('Galaxy A15');
  });

  it('omits listPrice when the till price matches the catalogue', () => {
    const line = mapSaleLine({ ...lineRow, list_price: null });
    expect(line.listPrice).toBeUndefined();
  });
});
