import {
  FunctionsFetchError,
  FunctionsHttpError,
  isAuthRetryableFetchError,
  AuthError as SupabaseAuthError,
} from '@supabase/supabase-js';
import type { BusinessId } from '../data/businesses';
import { site } from '../data/site';
import { saveDemoSetup } from './demo-setup';
import { fetchOwner, fetchShop } from './shop';
import { getSupabase, isSupabaseConfigured, setRememberDevice } from './supabase';
import { resetTour } from './tour';

/** False while Supabase is not configured: login and signup then open the demo dashboard (ADR 0002). */
export const isAuthLive = isSupabaseConfigured;

/*
 * Emailed 6-digit code at every sign-in (ADR 0004), paused until Resend has a verified sending
 * domain (ADR 0005). Meanwhile Supabase "Confirm email" must stay on. To resume: set this back
 * to true and restore `second_factor_verified()` from the first migration in a new one.
 */
export const EMAIL_CODE_ENABLED = false;

export type LoginInput = { email: string; password: string; remember: boolean };

export type SignupInput = {
  fullName: string;
  shopName: string;
  /** The shop's single line of business; it cannot be changed after signup. */
  business: BusinessId;
  email: string;
  phone?: string;
  city: string;
  password: string;
};

export type AuthError =
  | 'invalid-credentials'
  | 'account-exists'
  | 'weak-password'
  | 'confirm-email'
  | 'rate-limited'
  | 'unavailable'
  | 'network'
  | 'unknown';

/**
 * `verify`: the password is right, the emailed code is still to come.
 * `check-email`: the account exists but its address is not confirmed yet.
 */
export type AuthResult = { ok: true; next: 'app' | 'verify' | 'check-email' } | { ok: false; error: AuthError };

export type ResendError = 'rate-limited' | 'network' | 'unknown';
export type ResendResult = { ok: true } | { ok: false; error: ResendError };

export type ConfirmError = 'expired' | 'invalid' | 'network' | 'unknown';
export type ConfirmResult = { ok: true; next: 'app' | 'verify' } | { ok: false; error: ConfirmError };

export type CodeError =
  | 'invalid-code'
  | 'expired'
  | 'too-many-attempts'
  | 'rate-limited'
  | 'email-failed'
  | 'not-signed-in'
  | 'network'
  | 'unknown';

export type CodeResult =
  { ok: true; retryAfter?: number } | { ok: false; error: CodeError; retryAfter?: number; attemptsLeft?: number };

const demoDelay = () => new Promise((resolve) => setTimeout(resolve, 500));

function authErrorOf(error: SupabaseAuthError): AuthError {
  if (isAuthRetryableFetchError(error)) return error.status === 0 ? 'network' : 'unavailable';
  switch (error.code) {
    case 'invalid_credentials':
      return 'invalid-credentials';
    case 'user_already_exists':
    case 'email_exists':
      return 'account-exists';
    case 'weak_password':
      return 'weak-password';
    case 'email_not_confirmed':
      return 'confirm-email';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'rate-limited';
  }
  return (error.status ?? 0) >= 500 ? 'unavailable' : 'unknown';
}

/** Where the confirmation link lands; it must be listed in Supabase → Authentication → URL Configuration. */
const confirmUrl = () => new URL(site.confirmEmailUrl, window.location.origin).href;

/** A fresh session either still owes the emailed code or may open the merchant space right away. */
async function afterSignIn(): Promise<'app' | 'verify'> {
  if (EMAIL_CODE_ENABLED) return 'verify';
  await prepareDashboard();
  return 'app';
}

export async function login({ email, password, remember }: LoginInput): Promise<AuthResult> {
  if (!isAuthLive) {
    await demoDelay();
    return { ok: true, next: 'app' };
  }
  setRememberDevice(remember);
  const { error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) {
    const reason = authErrorOf(error);
    return reason === 'confirm-email' ? { ok: true, next: 'check-email' } : { ok: false, error: reason };
  }
  return { ok: true, next: await afterSignIn() };
}

export async function signup(input: SignupInput): Promise<AuthResult> {
  const setup = {
    business: input.business,
    shopName: input.shopName,
    city: input.city,
    ownerName: input.fullName,
    phone: input.phone ? displayPhone(input.phone) : '',
  };
  resetTour();
  if (!isAuthLive) {
    saveDemoSetup(setup);
    await demoDelay();
    return { ok: true, next: 'app' };
  }

  setRememberDevice(true);
  const { data, error } = await getSupabase().auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: confirmUrl(),
      // Read by the `handle_new_user` trigger to create the profile and the shop.
      data: {
        full_name: input.fullName,
        shop_name: input.shopName,
        business: input.business,
        city: input.city,
        phone: input.phone ?? null,
      },
    },
  });
  if (error) return { ok: false, error: authErrorOf(error) };
  // With "Confirm email" on, Supabase answers an existing address with a user that has no identity.
  if (!data.user?.identities?.length) return { ok: false, error: 'account-exists' };
  if (!data.session) return { ok: true, next: 'check-email' };

  saveDemoSetup(setup);
  return { ok: true, next: await afterSignIn() };
}

/** Sends the confirmation link again (Supabase allows one every 60 s per address). */
export async function resendConfirmation(email: string): Promise<ResendResult> {
  const { error } = await getSupabase().auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: confirmUrl() },
  });
  if (!error) return { ok: true };
  const reason = authErrorOf(error);
  return { ok: false, error: reason === 'rate-limited' || reason === 'network' ? reason : 'unknown' };
}

/**
 * Opens the session carried by the confirmation link, whichever form Supabase used:
 * `token_hash` (custom template), `#access_token` (default link) or `?code=` (PKCE, same browser).
 */
export async function completeEmailConfirmation(): Promise<ConfirmResult> {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.slice(1));
  window.history.replaceState(null, '', window.location.pathname);

  const linkError = query.get('error_code') ?? hash.get('error_code');
  if (linkError) return { ok: false, error: linkError === 'otp_expired' ? 'expired' : 'invalid' };

  const supabase = getSupabase();
  setRememberDevice(true);

  const tokenHash = query.get('token_hash');
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  const code = query.get('code');

  let error: SupabaseAuthError | null = null;
  if (tokenHash) {
    const type = query.get('type') === 'signup' ? 'signup' : 'email';
    ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
  } else if (accessToken && refreshToken) {
    ({ error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }));
  } else if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else {
    // Link opened twice: the first visit already signed this browser in.
    const { data } = await supabase.auth.getSession();
    if (!data.session) return { ok: false, error: 'invalid' };
  }

  if (error) {
    const reason = authErrorOf(error);
    if (reason === 'network') return { ok: false, error: 'network' };
    return { ok: false, error: error.code === 'otp_expired' ? 'expired' : 'invalid' };
  }
  return { ok: true, next: await afterSignIn() };
}

async function callEmailOtp(body: { action: 'send' } | { action: 'verify'; code: string }): Promise<CodeResult> {
  const { data, error } = await getSupabase().functions.invoke<{ retryAfter?: number }>('email-otp', { body });
  if (!error) return { ok: true, retryAfter: data?.retryAfter };
  if (error instanceof FunctionsHttpError) {
    const payload = await (error.context as Response).json().catch(() => ({}));
    const known: CodeError[] = [
      'invalid-code',
      'expired',
      'too-many-attempts',
      'rate-limited',
      'email-failed',
      'not-signed-in',
    ];
    return {
      ok: false,
      error: known.includes(payload.error) ? payload.error : 'unknown',
      retryAfter: payload.retryAfter,
      attemptsLeft: payload.attemptsLeft,
    };
  }
  return { ok: false, error: error instanceof FunctionsFetchError ? 'network' : 'unknown' };
}

/** Emails a fresh 6-digit code to the signed-in account. */
export const sendEmailCode = () => callEmailOtp({ action: 'send' });

/** Checks the emailed code; on success the session may open the merchant space. */
export async function verifyEmailCode(code: string): Promise<CodeResult> {
  const result = await callEmailOtp({ action: 'verify', code });
  if (result.ok) await prepareDashboard();
  return result;
}

/** Until the dashboard reads Supabase, the merchant space opens on the account's own shop and owner. */
async function prepareDashboard() {
  const [shop, owner] = await Promise.all([fetchShop(), fetchOwner()]);
  if (!shop) return;
  saveDemoSetup({
    business: shop.business,
    shopName: shop.name,
    city: shop.city,
    logoUrl: shop.logoUrl,
    ownerName: owner?.fullName,
    phone: owner?.phone ? displayPhone(owner.phone) : '',
  });
}

export type PasswordError =
  'wrong-password' | 'same-password' | 'weak-password' | 'rate-limited' | 'network' | 'unknown';
export type PasswordResult = { ok: true } | { ok: false; error: PasswordError };

/**
 * Checks the current password by signing in again, sets the new one, then signs every other
 * device out. Signing in again opens a fresh session: once EMAIL_CODE_ENABLED is back on,
 * that session must be marked verified too or the owner gets sent back to the code step.
 */
export async function changePassword(current: string, next: string): Promise<PasswordResult> {
  if (!isAuthLive) {
    await demoDelay();
    return { ok: true };
  }
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  const email = data.session?.user.email;
  if (!email) return { ok: false, error: 'unknown' };

  const { error: checkError } = await supabase.auth.signInWithPassword({ email, password: current });
  if (checkError) {
    const reason = authErrorOf(checkError);
    if (reason === 'invalid-credentials') return { ok: false, error: 'wrong-password' };
    return { ok: false, error: reason === 'rate-limited' || reason === 'network' ? reason : 'unknown' };
  }

  const { error } = await supabase.auth.updateUser({ password: next, current_password: current });
  if (error) {
    if (error.code === 'same_password') return { ok: false, error: 'same-password' };
    const reason = authErrorOf(error);
    return {
      ok: false,
      error: reason === 'weak-password' || reason === 'rate-limited' || reason === 'network' ? reason : 'unknown',
    };
  }
  await supabase.auth.signOut({ scope: 'others' });
  return { ok: true };
}

export type AuthState = { status: 'granted' } | { status: 'sign-in' } | { status: 'verify'; email: string };

/** Where the visitor stands: signed out, waiting for the emailed code, or fully signed in. */
export async function getAuthState(): Promise<AuthState> {
  if (!isAuthLive) return { status: 'granted' };
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  if (!data.session) return { status: 'sign-in' };
  if (!EMAIL_CODE_ENABLED) return { status: 'granted' };
  const { data: verified, error } = await supabase.rpc('second_factor_verified');
  if (error) return { status: 'sign-in' };
  return verified ? { status: 'granted' } : { status: 'verify', email: data.session.user.email ?? '' };
}

export async function signOut() {
  if (isAuthLive) await getSupabase().auth.signOut();
}

export function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null;
}

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

/** "+237699412208" → "+237 6 99 41 22 08", as phone numbers are shown in the merchant space. */
export const displayPhone = (phone: string) => `+237 ${formatPhone(phone)}`;

export const MIN_PASSWORD_LENGTH = 8;
