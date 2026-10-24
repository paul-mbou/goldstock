import { useSyncExternalStore } from 'react';

/*
 * Desktop sidebar: full width or folded to an icon rail. The choice is kept in localStorage
 * and mirrored on <html data-sidebar>, which the `rail:` Tailwind variant reads, so the
 * layout is right on first paint (see the inline script in AppLayout).
 */

export const SIDEBAR_STORAGE_KEY = 'gs-sidebar';
const CHANGE_EVENT = 'gs-sidebar-change';

const isCollapsed = () => document.documentElement.dataset.sidebar === 'collapsed';

export function setSidebarCollapsed(collapsed: boolean) {
  if (collapsed) document.documentElement.dataset.sidebar = 'collapsed';
  else delete document.documentElement.dataset.sidebar;
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? 'collapsed' : 'expanded');
  } catch {
    /* Private mode: the choice lasts until the next page. */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(listener: () => void) {
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}

export const useSidebarCollapsed = () => useSyncExternalStore(subscribe, isCollapsed, () => false);
