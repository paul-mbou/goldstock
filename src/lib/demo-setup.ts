import { isBusinessId, type BusinessId } from '../data/businesses';

/** What signup (or the account's Supabase shop) hands to the merchant space on the next page. */
export type DemoSetup = {
  business: BusinessId;
  shopName: string;
  city: string;
  logoUrl?: string;
  ownerName?: string;
  phone?: string;
};

const SETUP_KEY = 'gs-demo-setup';

export function saveDemoSetup(setup: DemoSetup) {
  try {
    sessionStorage.setItem(SETUP_KEY, JSON.stringify(setup));
  } catch {
    /* Private mode: the merchant space opens on its default shop. */
  }
}

/** Returns the pending setup once, then forgets it. */
export function takeDemoSetup(): DemoSetup | null {
  try {
    const raw = sessionStorage.getItem(SETUP_KEY);
    sessionStorage.removeItem(SETUP_KEY);
    const setup = raw ? (JSON.parse(raw) as Partial<DemoSetup>) : null;
    if (!setup || !isBusinessId(setup.business)) return null;
    return {
      business: setup.business,
      shopName: setup.shopName ?? '',
      city: setup.city ?? '',
      logoUrl: setup.logoUrl ?? '',
      ownerName: setup.ownerName ?? '',
      phone: setup.phone ?? '',
    };
  } catch {
    return null;
  }
}
