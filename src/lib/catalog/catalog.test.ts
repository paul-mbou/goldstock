import { describe, expect, it } from 'vitest';
import { categoryInsertsForBusiness } from './seed';
import {
  mapAttribute,
  mapCategory,
  mapMove,
  mapProduct,
  nextStock,
  signedMoveQty,
  type AttributeRow,
  type CategoryRow,
  type MoveRow,
  type ProductRow,
  type VariantRow,
} from './types';

describe('signedMoveQty', () => {
  it('returns a positive qty for entries', () => {
    expect(signedMoveQty('in', 5, 2)).toBe(5);
  });

  it('clamps exits to available stock', () => {
    expect(signedMoveQty('out', 10, 3)).toBe(-3);
    expect(signedMoveQty('out', 2, 8)).toBe(-2);
  });

  it('rejects empty or negative amounts', () => {
    expect(signedMoveQty('in', 0, 5)).toBe(0);
    expect(signedMoveQty('out', -4, 5)).toBe(0);
  });
});

describe('nextStock', () => {
  it('never goes below zero', () => {
    expect(nextStock(2, -5)).toBe(0);
    expect(nextStock(10, 3)).toBe(13);
  });
});

describe('mappers', () => {
  const categoryRow: CategoryRow = {
    id: 'cat-1',
    shop_id: 'shop-1',
    code: 'tel',
    name: 'Smartphones',
    icon: 'phone',
    tone: 'gold',
    subs: ['Neufs'],
    archived: false,
    sort_order: 0,
  };

  const attrRow: AttributeRow = {
    id: 'attr-1',
    category_id: 'cat-1',
    code: 'tel_brand',
    name: 'Marque',
    type: 'list',
    options: ['Samsung', 'Apple'],
    is_variant: false,
    required: true,
    hint: null,
    sort_order: 0,
  };

  it('maps a category with its attributes in sort order', () => {
    const category = mapCategory(categoryRow, [
      { ...attrRow, id: 'attr-2', sort_order: 1, name: 'Modèle', code: 'tel_model' },
      attrRow,
    ]);
    expect(category.id).toBe('cat-1');
    expect(category.code).toBe('tel');
    expect(category.attrs.map((attr) => attr.name)).toEqual(['Marque', 'Modèle']);
    expect(mapAttribute(attrRow).variant).toBe(false);
    expect(mapAttribute(attrRow).required).toBe(true);
  });

  it('maps a product with its variants', () => {
    const productRow: ProductRow = {
      id: 'p1',
      shop_id: 'shop-1',
      category_id: 'cat-1',
      name: 'Galaxy A15',
      sub: 'Neufs',
      attrs: { 'attr-1': 'Samsung' },
      min_stock: 5,
      status: 'active',
      description: '',
      created_at: '2026-10-23T13:30:00.000Z',
    };
    const variants: VariantRow[] = [
      { id: 'v1', product_id: 'p1', sku: 'A15-128', label: '128 Go', price: 150000, cost: 100000, stock: 4 },
      { id: 'v2', product_id: 'other', sku: 'X', label: '', price: 1, cost: 1, stock: 0 },
    ];
    const product = mapProduct(productRow, variants);
    expect(product.cat).toBe('cat-1');
    expect(product.variants).toHaveLength(1);
    expect(product.variants[0]?.stock).toBe(4);
    expect(product.min).toBe(5);
  });

  it('maps a stock move with optional source', () => {
    const row: MoveRow = {
      id: 'm1',
      shop_id: 'shop-1',
      variant_id: 'v1',
      type: 'entry',
      qty: 10,
      item_label: 'Galaxy A15 · 128 Go',
      source: 'Fournisseur Tchoumi',
      destination: null,
      note: 'BL-1',
      user_name: 'Awa',
      moved_at: '2026-10-23T14:00:00.000Z',
    };
    const move = mapMove(row);
    expect(move.type).toBe('entry');
    expect(move.source).toBe('Fournisseur Tchoumi');
    expect(move.destination).toBeUndefined();
    expect(move.qty).toBe(10);
  });
});

describe('categoryInsertsForBusiness', () => {
  it('builds uuid rows from the phone catalogue templates', () => {
    const inserts = categoryInsertsForBusiness('phones');
    expect(inserts.length).toBeGreaterThan(0);
    expect(inserts[0]?.code).toBe('tel');
    expect(inserts[0]?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(inserts[0]?.attrs[0]?.code).toBe('tel_brand');
    expect(inserts.every((row) => row.attrs.every((attr) => attr.id !== attr.code))).toBe(true);
  });
});
