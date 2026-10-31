import { describe, expect, it } from 'vitest';
import { isRecoveryLink, MIN_PASSWORD_LENGTH, normalizeEmail, passwordIssue } from './credentials';

describe('passwordIssue', () => {
  it('rejects empty and short passwords', () => {
    expect(passwordIssue('')).toBe('empty');
    expect(passwordIssue('1234567')).toBe('short');
    expect(passwordIssue('a'.repeat(MIN_PASSWORD_LENGTH - 1))).toBe('short');
  });

  it('accepts passwords that meet the minimum length', () => {
    expect(passwordIssue('a'.repeat(MIN_PASSWORD_LENGTH))).toBeNull();
    expect(passwordIssue('MotDePasseFort1')).toBeNull();
  });
});

describe('isRecoveryLink', () => {
  it('detects type=recovery in the query or the hash', () => {
    expect(isRecoveryLink(new URLSearchParams('type=recovery&token_hash=abc'), new URLSearchParams())).toBe(true);
    expect(isRecoveryLink(new URLSearchParams(), new URLSearchParams('type=recovery&access_token=x'))).toBe(true);
  });

  it('rejects signup and missing types', () => {
    expect(isRecoveryLink(new URLSearchParams('type=signup'), new URLSearchParams())).toBe(false);
    expect(isRecoveryLink(new URLSearchParams(), new URLSearchParams())).toBe(false);
  });
});

describe('normalizeEmail', () => {
  it('normalises and validates emails', () => {
    expect(normalizeEmail('  Awa@Exemple.COM ')).toBe('awa@exemple.com');
    expect(normalizeEmail('pas-un-email')).toBeNull();
  });
});
