import {
  FunctionsFetchError,
  FunctionsHttpError,
  isAuthRetryableFetchError,
  AuthError as SupabaseAuthError,
  type User,
} from '@supabase/supabase-js';
import type { BusinessId } from '../data/businesses';
import { site } from '../data/site';
import { saveDemoSetup } from './demo-setup';
import {
  displayPhone,
  formatPhone,
  isRecoveryLink,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  normalizePhone,
  passwordIssue,
} from './credentials';
import { fetchOwner, fetchShop } from './shop';
import { getSupabase, isSupabaseConfigured, setRememberDevice } from './supabase';
import { resetTour } from './tour';

export {
  displayPhone,
  formatPhone,
  isRecoveryLink,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  normalizePhone,
  passwordIssue,
};

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

/** Where the password-recovery link lands; must also be listed in Redirect URLs. */
const resetPasswordUrl = () => new URL(site.resetPasswordUrl, window.location.origin).href;

/**
 * The merchant space stays closed until the address is confirmed. Supabase "Confirm email" already
 * refuses those sign-ins; this keeps them out even if the setting is switched off by mistake.
 */
const isConfirmed = (user: User | null | undefined) => Boolean(user?.email_confirmed_at);

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
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const reason = authErrorOf(error);
    return reason === 'confirm-email' ? { ok: true, next: 'check-email' } : { ok: false, error: reason };
  }
  if (!isConfirmed(data.user)) {
    await supabase.auth.signOut({ scope: 'local' });
    return { ok: true, next: 'check-email' };
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
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signUp({
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
  if (!isConfirmed(data.user)) {
    await supabase.auth.signOut({ scope: 'local' });
    return { ok: true, next: 'check-email' };
  }

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
    // Only signup confirmation links belong on this page (not recovery / magic / email-change).
    if (query.get('type') !== 'signup') return { ok: false, error: 'invalid' };
    ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'signup' }));
  } else if (accessToken && refreshToken) {
    ({ error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }));
  } else if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else {
    // Link opened twice: the first visit already signed this browser in.
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: 'invalid' };
  }

  if (error) {
    const reason = authErrorOf(error);
    if (reason === 'network') return { ok: false, error: 'network' };
    return { ok: false, error: error.code === 'otp_expired' ? 'expired' : 'invalid' };
  }

  const { data: confirmed, error: userError } = await supabase.auth.getUser();
  if (userError || !isConfirmed(confirmed.user)) {
    await supabase.auth.signOut({ scope: 'local' });
    return { ok: false, error: 'invalid' };
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
 * Emails a one-time recovery link. Always reports success for an unknown address so accounts
 * cannot be probed (Supabase already does that server-side).
 */
export async function requestPasswordReset(email: string): Promise<ResendResult> {
  if (!isAuthLive) {
    await demoDelay();
    return { ok: true };
  }
  const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
    redirectTo: resetPasswordUrl(),
  });
  if (!error) return { ok: true };
  const reason = authErrorOf(error);
  return { ok: false, error: reason === 'rate-limited' || reason === 'network' ? reason : 'unknown' };
}

/**
 * Opens the session from a recovery link (`token_hash` + type=recovery, hash tokens, or PKCE code).
 * Call this once on `/reinitialiser-mot-de-passe` before asking for the new password.
 */
export async function completePasswordRecovery(): Promise<ConfirmResult> {
  if (!isAuthLive) return { ok: true, next: 'app' };

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
    if (!isRecoveryLink(query, hash)) return { ok: false, error: 'invalid' };
    ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' }));
  } else if (accessToken && refreshToken) {
    if (hash.get('type') && !isRecoveryLink(query, hash)) return { ok: false, error: 'invalid' };
    ({ error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }));
  } else if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: 'invalid' };
  }

  if (error) {
    const reason = authErrorOf(error);
    if (reason === 'network') return { ok: false, error: 'network' };
    return { ok: false, error: error.code === 'otp_expired' ? 'expired' : 'invalid' };
  }

  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) {
    await supabase.auth.signOut({ scope: 'local' });
    return { ok: false, error: 'invalid' };
  }
  return { ok: true, next: 'app' };
}

/** Sets the new password after `completePasswordRecovery`, then signs other devices out. */
export async function setRecoveredPassword(next: string): Promise<PasswordResult> {
  if (passwordIssue(next)) return { ok: false, error: 'weak-password' };
  if (!isAuthLive) {
    await demoDelay();
    return { ok: true };
  }
  const supabase = getSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { ok: false, error: 'unknown' };

  const { error } = await supabase.auth.updateUser({ password: next });
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

/**
 * Checks the current password via `current_password` (keeps the same session_id, so the emailed
 * code step is not lost when EMAIL_CODE_ENABLED is back on), then signs every other device out.
 * Requires « Secure password change » in Supabase → Authentication → Providers → Email.
 */
export async function changePassword(current: string, next: string): Promise<PasswordResult> {
  if (!isAuthLive) {
    await demoDelay();
    return { ok: true };
  }
  const supabase = getSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user?.email) return { ok: false, error: 'unknown' };

  const { error } = await supabase.auth.updateUser({ password: next, current_password: current });
  if (error) {
    if (error.code === 'same_password') return { ok: false, error: 'same-password' };
    if (error.code === 'invalid_credentials' || /current.?password|incorrect/i.test(error.message)) {
      return { ok: false, error: 'wrong-password' };
    }
    const reason = authErrorOf(error);
    return {
      ok: false,
      error: reason === 'weak-password' || reason === 'rate-limited' || reason === 'network' ? reason : 'unknown',
    };
  }
  await supabase.auth.signOut({ scope: 'others' });
  return { ok: true };
}

export type AuthState =
  | { status: 'granted' }
  | { status: 'sign-in' }
  | { status: 'confirm-email'; email: string }
  | { status: 'verify'; email: string };

/** Where the visitor stands: signed out, address to confirm, waiting for the emailed code, or fully signed in. */
export async function getAuthState(): Promise<AuthState> {
  if (!isAuthLive) return { status: 'granted' };
  const supabase = getSupabase();
  // getUser() revalidates with Auth (getSession() only reads local storage).
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) {
    await supabase.auth.signOut({ scope: 'local' });
    return { status: 'sign-in' };
  }
  if (!isConfirmed(data.user)) return { status: 'confirm-email', email: data.user.email ?? '' };
  if (!EMAIL_CODE_ENABLED) return { status: 'granted' };
  const { data: verified, error } = await supabase.rpc('second_factor_verified');
  if (error) return { status: 'sign-in' };
  return verified ? { status: 'granted' } : { status: 'verify', email: data.user.email ?? '' };
}

export async function signOut() {
  if (isAuthLive) await getSupabase().auth.signOut();
}
