import { PUBLIC_API_URL } from 'astro:env/client';
import { site, type Billing } from '../data/site';

export type LoginInput = { phone: string; password: string; remember: boolean };

export type SignupInput = {
  fullName: string;
  shopName: string;
  phone: string;
  city: string;
  password: string;
  plan: string;
  billing: Billing;
};

export type AuthError = 'invalid-credentials' | 'phone-taken' | 'unavailable' | 'network' | 'unknown';

export type AuthResult = { ok: true; redirectUrl: string } | { ok: false; error: AuthError };

export const isApiConfigured = Boolean(PUBLIC_API_URL);

async function post(path: string, body: unknown, errorByStatus: Record<number, AuthError>): Promise<AuthResult> {
  /** Test mode until the backend exists: every valid form opens the demo dashboard. */
  if (!PUBLIC_API_URL) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { ok: true, redirectUrl: site.appUrl };
  }

  try {
    const response = await fetch(new URL(path, PUBLIC_API_URL), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data = (await response.json().catch(() => ({}))) as { redirectUrl?: string };
      return { ok: true, redirectUrl: data.redirectUrl ?? site.appUrl };
    }
    return { ok: false, error: errorByStatus[response.status] ?? (response.status >= 500 ? 'unavailable' : 'unknown') };
  } catch {
    return { ok: false, error: 'network' };
  }
}

export const login = (input: LoginInput) => post('/auth/login', input, { 401: 'invalid-credentials' });

export const signup = (input: SignupInput) => post('/auth/signup', input, { 409: 'phone-taken' });

/** Cameroonian numbers: 9 digits, mobile (6…) or landline (2…). Accepts +237/00237 prefixes and spaces. */
export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '').replace(/^(00)?237(?=\d{9}$)/, '');
  return /^[26]\d{8}$/.test(digits) ? `+237${digits}` : null;
}

/** Formats the 9 local digits as "6 XX XX XX XX", dropping a pasted country code. */
export const formatPhone = (value: string) =>
  value
    .replace(/\D/g, '')
    .replace(/^(00)?237(?=\d{9})/, '')
    .slice(0, 9)
    .replace(/^(\d)(\d{0,2})(\d{0,2})(\d{0,2})(\d{0,2})$/, (_, a, b, c, d, e) =>
      [a, b, c, d, e].filter(Boolean).join(' '),
    );

export const MIN_PASSWORD_LENGTH = 8;
