import { isBusinessId, type BusinessId } from '../data/businesses';
import { getSupabase, isSupabaseConfigured } from './supabase';

/*
 * The account's shop as stored in Supabase. Only its identity and logo live there for now;
 * the rest of the merchant space still runs on the demo store. Kept free of the demo store
 * so the login page can use it without loading the catalogues.
 */

const LOGO_BUCKET = 'shop-logos';
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
/** Longest side once resized: sharp on a receipt and in the sidebar, a few dozen KB. */
const LOGO_SIZE = 400;
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

export const LOGO_ACCEPT = LOGO_TYPES.join(',');

export type AccountShop = { name: string; business: BusinessId; city: string; logoUrl: string };

const logoUrlOf = (path: string | null) =>
  path ? getSupabase().storage.from(LOGO_BUCKET).getPublicUrl(path).data.publicUrl : '';

const firstShop = () =>
  getSupabase().from('shops').select('id, name, business, city, logo_path').order('created_at').limit(1).maybeSingle();

export async function fetchShop(): Promise<AccountShop | null> {
  const { data } = await firstShop();
  if (!data || !isBusinessId(data.business)) return null;
  return { name: data.name, business: data.business, city: data.city, logoUrl: logoUrlOf(data.logo_path) };
}

export type AccountOwner = { fullName: string; phone: string };

/** The signed-in owner's profile: their name and, if given at signup, their +237 number. */
export async function fetchOwner(): Promise<AccountOwner | null> {
  const { data } = await getSupabase().from('profiles').select('full_name, phone').limit(1).maybeSingle();
  return data ? { fullName: data.full_name, phone: data.phone ?? '' } : null;
}

export type LogoError = 'not-an-image' | 'too-large' | 'failed';
export type LogoResult = { ok: true; logoUrl: string } | { ok: false; error: LogoError };

const encode = (canvas: HTMLCanvasElement, type: string) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9));

/** Fits the image inside LOGO_SIZE, keeping transparency; WebP where the browser encodes it, else PNG. */
async function shrink(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, LOGO_SIZE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const webp = await encode(canvas, 'image/webp');
  if (webp?.type === 'image/webp') return webp;
  const png = await encode(canvas, 'image/png');
  if (!png) throw new Error('Could not encode the logo.');
  return png;
}

const dataUrlOf = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

export async function uploadShopLogo(file: File): Promise<LogoResult> {
  if (!LOGO_TYPES.includes(file.type)) return { ok: false, error: 'not-an-image' };
  if (file.size > MAX_SOURCE_BYTES) return { ok: false, error: 'too-large' };
  let image: Blob;
  try {
    image = await shrink(file);
  } catch {
    return { ok: false, error: 'not-an-image' };
  }
  if (!isSupabaseConfigured) return { ok: true, logoUrl: await dataUrlOf(image) };

  const supabase = getSupabase();
  const { data: shop } = await firstShop();
  if (!shop) return { ok: false, error: 'failed' };

  // A new name on every upload, so browsers and the CDN never show the previous logo.
  const path = `${shop.id}/${crypto.randomUUID()}.${image.type === 'image/webp' ? 'webp' : 'png'}`;
  const bucket = supabase.storage.from(LOGO_BUCKET);
  const { error: uploadError } = await bucket.upload(path, image, {
    contentType: image.type,
    cacheControl: '31536000',
  });
  if (uploadError) return { ok: false, error: 'failed' };

  const { data: updated } = await supabase.from('shops').update({ logo_path: path }).eq('id', shop.id).select('id');
  if (!updated?.length) {
    await bucket.remove([path]);
    return { ok: false, error: 'failed' };
  }
  if (shop.logo_path) await bucket.remove([shop.logo_path]);
  return { ok: true, logoUrl: logoUrlOf(path) };
}

export async function removeShopLogo(): Promise<{ ok: boolean }> {
  if (!isSupabaseConfigured) return { ok: true };
  const supabase = getSupabase();
  const { data: shop } = await firstShop();
  if (!shop) return { ok: false };
  if (!shop.logo_path) return { ok: true };
  const { data: updated } = await supabase.from('shops').update({ logo_path: null }).eq('id', shop.id).select('id');
  if (!updated?.length) return { ok: false };
  await supabase.storage.from(LOGO_BUCKET).remove([shop.logo_path]);
  return { ok: true };
}
