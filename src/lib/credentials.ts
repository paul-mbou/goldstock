/** Minimum password length; must match Supabase → Authentication → Providers → Email. */
export const MIN_PASSWORD_LENGTH = 8;

/** Password rules shared by signup, settings and recovery (ADR 0010). */
export function passwordIssue(password: string): 'empty' | 'short' | null {
  if (!password) return 'empty';
  if (password.length < MIN_PASSWORD_LENGTH) return 'short';
  return null;
}

/** True when the URL carries a Supabase recovery (password reset) link. */
export function isRecoveryLink(query: URLSearchParams, hash: URLSearchParams) {
  return (query.get('type') ?? hash.get('type')) === 'recovery';
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
