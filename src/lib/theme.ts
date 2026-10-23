export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'gs-theme';

export function getThemePreference(): ThemePreference {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'dark' || stored === 'system' ? stored : 'light';
}

export const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

export function applyTheme(preference: ThemePreference) {
  localStorage.setItem(THEME_STORAGE_KEY, preference);
  const dark = preference === 'dark' || (preference === 'system' && prefersDark());
  document.documentElement.classList.toggle('dark', dark);
  window.dispatchEvent(new CustomEvent('gs-theme-change', { detail: dark }));
  return dark;
}
