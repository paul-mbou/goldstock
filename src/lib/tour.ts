/*
 * The guided tour of the merchant space opens by itself on the first visit of this browser,
 * and again after every signup. Kept in localStorage so it survives the session; any button
 * can replay it with `startTour()`.
 */

const TOUR_KEY = 'gs-tour';
const START_EVENT = 'gs-tour-start';

export function isTourSeen() {
  try {
    return localStorage.getItem(TOUR_KEY) === 'seen';
  } catch {
    return true;
  }
}

export function markTourSeen() {
  try {
    localStorage.setItem(TOUR_KEY, 'seen');
  } catch {
    /* Private mode: the tour may show again next time. */
  }
}

/** A new account always gets the tour, even on a browser that already saw it. */
export function resetTour() {
  try {
    localStorage.removeItem(TOUR_KEY);
  } catch {
    /* Private mode: nothing was stored. */
  }
}

export function startTour() {
  window.dispatchEvent(new Event(START_EVENT));
}

export function onTourStart(listener: () => void) {
  window.addEventListener(START_EVENT, listener);
  return () => window.removeEventListener(START_EVENT, listener);
}
