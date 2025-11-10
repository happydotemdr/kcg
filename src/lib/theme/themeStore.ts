/**
 * Theme Store (Nano Stores)
 *
 * Manages theme state using Nano Stores for cross-island state sharing.
 * This replaces React Context which doesn't work across Astro islands.
 */

import { atom, computed } from 'nanostores';

// Theme types
export type Theme = 'light' | 'dark' | 'dark-pro' | 'system';
export type ResolvedTheme = 'light' | 'dark' | 'dark-pro';

// LocalStorage key
const STORAGE_KEY = 'kcg-theme-preference';

/**
 * Get system color scheme preference
 */
function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Get initial theme from localStorage or default to 'system'
 */
function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  return stored || 'system';
}

// Theme atom - stores the current theme preference
export const themeAtom = atom<Theme>(getInitialTheme());

// System preference atom - tracks OS theme preference
export const systemPreferenceAtom = atom<'light' | 'dark'>(getSystemPreference());

// Resolved theme - computed value that resolves 'system' to actual theme
export const resolvedThemeAtom = computed(
  [themeAtom, systemPreferenceAtom],
  (theme, systemPref) => {
    if (theme === 'system') {
      return systemPref;
    }
    return theme as ResolvedTheme;
  }
);

/**
 * Set theme and persist to localStorage
 */
export function setTheme(newTheme: Theme) {
  themeAtom.set(newTheme);

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, newTheme);

    // Apply theme to DOM
    const resolved = newTheme === 'system' ? systemPreferenceAtom.get() : newTheme;
    applyTheme(resolved);

    // Announce to screen readers
    const announcement = `Theme changed to ${newTheme === 'system' ? 'system preference' : newTheme} mode`;
    announceToScreenReader(announcement);
  }
}

/**
 * Apply theme to DOM
 */
function applyTheme(theme: ResolvedTheme) {
  if (typeof document === 'undefined') return;

  // Add transitioning class for smooth animations
  document.documentElement.setAttribute('data-theme-transitioning', 'true');

  // Set theme attribute
  document.documentElement.setAttribute('data-theme', theme);

  // Remove transitioning class after transition completes
  setTimeout(() => {
    document.documentElement.removeAttribute('data-theme-transitioning');
    document.documentElement.setAttribute('data-theme-transition-complete', 'true');

    // Clean up after a bit
    setTimeout(() => {
      document.documentElement.removeAttribute('data-theme-transition-complete');
    }, 100);
  }, 300); // Match --transition-slow
}

/**
 * Announce message to screen readers
 */
function announceToScreenReader(message: string) {
  if (typeof document === 'undefined') return;

  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only'; // Visually hidden
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Initialize theme system (call once on app load)
 */
export function initializeTheme() {
  if (typeof window === 'undefined') return;

  // Set initial system preference
  systemPreferenceAtom.set(getSystemPreference());

  // Listen for system preference changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handler = (e: MediaQueryListEvent) => {
    const newPreference = e.matches ? 'dark' : 'light';
    systemPreferenceAtom.set(newPreference);

    // Only update if theme is set to 'system'
    if (themeAtom.get() === 'system') {
      applyTheme(newPreference);
    }
  };

  // Modern browsers
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handler);
  }
  // Legacy browsers
  else if (mediaQuery.addListener) {
    mediaQuery.addListener(handler);
  }
}
