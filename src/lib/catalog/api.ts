import type { Attribute, Category, Move, Product, Variant } from '../../data/dashboard';
import type { BusinessId } from '../../data/businesses';
import { isAuthLive } from '../auth';
import { getSupabase } from '../supabase';
import { categoryInsertsForBusiness } from './seed';
import {
  mapCategory,
  mapMove,
  mapProduct,
  type AttributeRow,
  type CatalogSnapshot,
  type CategoryRow,
  type MoveRow,
  type ProductRow,
  type StockMoveDraft,
  type VariantRow,
} from './types';

export type CatalogError = 'not-signed-in' | 'no-shop' | 'failed' | 'insufficient-stock';
export type CatalogResult<T> = { ok: true; value: T } | { ok: false; error: CatalogError };

const fail = <T>(error: CatalogError): CatalogResult<T> => ({ ok: false, error });
const ok = <T>(value: T): CatalogResult<T> => ({ ok: true, value });

async function shopIdOf(): Promise<string | null> {
  const { data } = await getSupabase().from('shops').select('id, business').order('created_at').limit(1).maybeSingle();
  return data?.id ?? null;
}

async function shopContext(): Promise<{ id: string; business: BusinessId } | null> {
  const { data } = await getSupabase().from('shops').select('id, business').order('created_at').limit(1).maybeSingle();
  if (!data) return null;
  return { id: data.id, business: data.business as BusinessId };
}

/** Loads the catalogue; seeds the activity templates once when the shop has no categories yet. */
export async function loadCatalog(): Promise<CatalogResult<CatalogSnapshot>> {
  if (!isAuthLive) return fail('not-signed-in');
  const shop = await shopContext();
  if (!shop) return fail('no-shop');

  const supabase = getSupabase();
  let { data: categoryRows, error: catError } = await supabase
    .from('categories')
    .select('*')
    .eq('shop_id', shop.id)
    .order('sort_order');
  if (catError) return fail('failed');

  if (!categoryRows?.length) {
    const seeded = await seedCategories(shop.id, shop.business);
    if (!seeded.ok) return seeded;
    categoryRows = seeded.value;
  }

  const categoryIds = categoryRows.map((row) => row.id);
  const [{ data: attrRows }, { data: productRows }, { data: moveRows }] = await Promise.all([
    supabase.from('category_attributes').select('*').in('category_id', categoryIds).order('sort_order'),
    supabase.from('products').select('*').eq('shop_id', shop.id).order('created_at', { ascending: false }),
    supabase.from('stock_moves').select('*').eq('shop_id', shop.id).order('moved_at', { ascending: false }).limit(200),
  ]);

  const productIds = (productRows ?? []).map((row) => row.id);
  const { data: variantRows } = productIds.length
    ? await supabase.from('product_variants').select('*').in('product_id', productIds)
    : { data: [] as VariantRow[] };

  return ok({
    shopId: shop.id,
    categories: (categoryRows as CategoryRow[]).map((row) =>
      mapCategory(row, (attrRows as AttributeRow[] | null) ?? []),
    ),
    products: ((productRows as ProductRow[] | null) ?? []).map((row) =>
      mapProduct(row, (variantRows as VariantRow[] | null) ?? []),
    ),
    moves: ((moveRows as MoveRow[] | null) ?? []).map(mapMove),
  });
}

async function seedCategories(shopId: string, business: BusinessId): Promise<CatalogResult<CategoryRow[]>> {
  const supabase = getSupabase();
  const inserts = categoryInsertsForBusiness(business);
  const { data: categories, error } = await supabase
    .from('categories')
    .insert(
      inserts.map(({ attrs: _attrs, ...row }) => ({
        ...row,
        shop_id: shopId,
      })),
    )
    .select('*');
  if (error || !categories?.length) return fail('failed');

  const attrPayload = inserts.flatMap((category) =>
    category.attrs.map((attr) => ({
      ...attr,
      category_id: category.id,
    })),
  );
  if (attrPayload.length) {
    const { error: attrError } = await supabase.from('category_attributes').insert(attrPayload);
    if (attrError) return fail('failed');
  }
  return ok(categories as CategoryRow[]);
}

export async function upsertCategory(category: Category, sortOrder = 0): Promise<CatalogResult<Category>> {
  if (!isAuthLive) return ok(category);
  const shop = await shopIdOf();
  if (!shop) return fail('no-shop');
  const supabase = getSupabase();
  const { error } = await supabase.from('categories').upsert({
    id: category.id,
    shop_id: shop,
    code: category.code || category.id.slice(0, 8),
    name: category.name,
    icon: category.icon,
    tone: category.tone,
    subs: category.subs,
    archived: category.archived,
    sort_order: sortOrder,
  });
  if (error) return fail('failed');
  return ok(category);
}

export async function replaceCategoryAttributes(
  categoryId: string,
  attrs: Attribute[],
): Promise<CatalogResult<Attribute[]>> {
  if (!isAuthLive) return ok(attrs);
  const supabase = getSupabase();
  const { error: deleteError } = await supabase.from('category_attributes').delete().eq('category_id', categoryId);
  if (deleteError) return fail('failed');
  if (!attrs.length) return ok(attrs);
  const { error } = await supabase.from('category_attributes').insert(
    attrs.map((attribute, index) => ({
      id: attribute.id,
      category_id: categoryId,
      code: attribute.id.slice(0, 40),
      name: attribute.name,
      type: attribute.type,
      options: attribute.options,
      is_variant: attribute.variant,
      required: attribute.required,
      hint: attribute.hint ?? '',
      sort_order: index,
    })),
  );
  if (error) return fail('failed');
  return ok(attrs);
}

export async function upsertProduct(product: Product): Promise<CatalogResult<Product>> {
  if (!isAuthLive) return ok(product);
  const shop = await shopIdOf();
  if (!shop) return fail('no-shop');
  const supabase = getSupabase();
  const { error } = await supabase.from('products').upsert({
    id: product.id,
    shop_id: shop,
    category_id: product.cat,
    name: product.name,
    sub: product.sub,
    attrs: product.attrs,
    min_stock: product.min,
    status: product.status,
    description: product.description,
    created_at: new Date(product.created).toISOString(),
  });
  if (error) return fail('failed');

  const { error: clearError } = await supabase.from('product_variants').delete().eq('product_id', product.id);
  if (clearError) return fail('failed');
  if (product.variants.length) {
    const { error: variantError } = await supabase
      .from('product_variants')
      .insert(product.variants.map((variant) => variantRow(product.id, variant)));
    if (variantError) return fail('failed');
  }
  return ok(product);
}

export async function setProductStatus(productId: string, status: Product['status']): Promise<CatalogResult<true>> {
  if (!isAuthLive) return ok(true);
  const { error } = await getSupabase().from('products').update({ status }).eq('id', productId);
  return error ? fail('failed') : ok(true);
}

const variantRow = (productId: string, variant: Variant) => ({
  id: variant.id,
  product_id: productId,
  sku: variant.sku,
  label: variant.label,
  price: variant.price,
  cost: variant.cost,
  stock: variant.stock,
});

export async function applyRemoteStockMove(draft: StockMoveDraft): Promise<CatalogResult<Move>> {
  if (!isAuthLive) return fail('not-signed-in');
  const { data, error } = await getSupabase().rpc('apply_stock_move', {
    p_shop_id: draft.shopId,
    p_variant_id: draft.variantId,
    p_type: draft.type,
    p_qty: draft.qty,
    p_item_label: draft.itemLabel,
    p_source: draft.source ?? null,
    p_destination: draft.destination ?? null,
    p_note: draft.note,
    p_user_name: draft.userName,
    p_moved_at: draft.movedAt?.toISOString() ?? new Date().toISOString(),
  });
  if (error) {
    if (/Insufficient stock/i.test(error.message)) return fail('insufficient-stock');
    return fail('failed');
  }
  return ok(mapMove(data as MoveRow));
}

export async function currentShopId(): Promise<string | null> {
  if (!isAuthLive) return null;
  return shopIdOf();
}
