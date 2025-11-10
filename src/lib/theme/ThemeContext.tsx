/**
 * Theme Context
 *
 * Manages theme state and persistence across the application.
 * Supports light, dark (DOS), dark-pro, and system themes.
 */

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// Theme types
export type Theme = 'light' | 'dark' | 'dark-pro' | 'system';
export type ResolvedTheme = 'light' | 'dark' | 'dark-pro';

// Context interface
interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: ResolvedTheme;
  systemPreference: 'light' | 'dark';
}

// Create context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// LocalStorage key
const STORAGE_KEY = 'kcg-theme-preference';

/**
 * ThemeProvider Component
 *
 * Wraps the app and provides theme state to all children.
 * Handles:
 * - Theme persistence via localStorage
 * - System preference detection
 * - DOM updates (data-theme attribute)
 * - Transition state management
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [systemPreference, setSystemPreference] = useState<'light' | 'dark'>('light');

  /**
   * Get system color scheme preference
   */
  const getSystemPreference = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  /**
   * Resolve theme to actual value (system -> light/dark)
   */
  const resolveTheme = (themeToResolve: Theme): ResolvedTheme => {
    if (themeToResolve === 'system') {
      return getSystemPreference();
    }
    return themeToResolve as ResolvedTheme;
  };

  /**
   * Apply theme to DOM
   */
  const applyTheme = (themeToApply: ResolvedTheme) => {
    if (typeof document === 'undefined') return;

    // Add transitioning class for smooth animations
    document.documentElement.setAttribute('data-theme-transitioning', 'true');

    // Set theme attribute
    document.documentElement.setAttribute('data-theme', themeToApply);

    // Remove transitioning class after transition completes
    setTimeout(() => {
      document.documentElement.removeAttribute('data-theme-transitioning');
      document.documentElement.setAttribute('data-theme-transition-complete', 'true');

      // Clean up after a bit
      setTimeout(() => {
        document.documentElement.removeAttribute('data-theme-transition-complete');
      }, 100);
    }, 300); // Match --transition-slow
  };

  /**
   * Initialize theme on mount
   * Note: The inline script in each page already sets the initial theme
   * to prevent FOUC. We just need to sync our state with what's already applied.
   */
  useEffect(() => {
    // Get stored preference
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;

    // Get system preference
    const sysPref = getSystemPreference();
    setSystemPreference(sysPref);

    // Determine initial theme
    const initialTheme = stored || 'system';
    setThemeState(initialTheme);

    // Resolve theme (but don't re-apply, inline script already did this)
    const resolved = resolveTheme(initialTheme);
    setResolvedTheme(resolved);

    // Only apply if there's a mismatch (shouldn't happen in normal cases)
    const currentTheme = document.documentElement.getAttribute('data-theme') as ResolvedTheme;
    if (currentTheme !== resolved) {
      applyTheme(resolved);
    }
  }, []);

  /**
   * Listen for system preference changes
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handler = (e: MediaQueryListEvent) => {
      const newPreference = e.matches ? 'dark' : 'light';
      setSystemPreference(newPreference);

      // Only update if theme is set to 'system'
      if (theme === 'system') {
        setResolvedTheme(newPreference);
        applyTheme(newPreference);
      }
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
    // Legacy browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, [theme]);

  /**
   * Set theme and persist to localStorage
   */
  const setTheme = (newTheme: Theme) => {
    // Update state
    setThemeState(newTheme);

    // Persist to localStorage
    localStorage.setItem(STORAGE_KEY, newTheme);

    // Resolve and apply
    const resolved = resolveTheme(newTheme);
    setResolvedTheme(resolved);
    applyTheme(resolved);

    // Announce theme change to screen readers
    const announcement = `Theme changed to ${newTheme === 'system' ? 'system preference' : newTheme} mode`;
    announceToScreenReader(announcement);
  };

  /**
   * Announce message to screen readers
   */
  const announceToScreenReader = (message: string) => {
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
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        resolvedTheme,
        systemPreference,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * useTheme Hook
 *
 * Access theme context from any component.
 * Must be used within ThemeProvider.
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}

// Export context for advanced use cases
export { ThemeContext };
