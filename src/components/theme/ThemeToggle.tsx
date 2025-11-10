/**
 * ThemeToggle Component (Modern Style)
 *
 * A clean, modern theme toggle with icons for light/dark/system modes.
 * Perfect for light-themed pages and navigation bars.
 */

import { useStore } from '@nanostores/react';
import { themeAtom, setTheme, type Theme } from '@lib/theme/themeStore';

export default function ThemeToggle() {
  const theme = useStore(themeAtom);

  const themes: Array<{ value: Theme; label: string; icon: string; ariaLabel: string }> = [
    {
      value: 'light',
      label: 'Light',
      icon: '☀️',
      ariaLabel: 'Switch to light mode',
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: '🌙',
      ariaLabel: 'Switch to dark mode',
    },
    {
      value: 'system',
      label: 'Auto',
      icon: '💻',
      ariaLabel: 'Use system theme preference',
    },
  ];

  return (
    <div className="theme-toggle" role="group" aria-label="Theme selector">
      <style>{`
        .theme-toggle {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 0.25rem;
        }

        .theme-toggle-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
          padding: 0.5rem 0.75rem;
          background: transparent;
          border: none;
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-medium);
          cursor: pointer;
          transition: all var(--transition-fast);
          font-family: var(--font-family-base);
          white-space: nowrap;
        }

        .theme-toggle-btn:hover {
          background: var(--color-surface-hover);
          color: var(--color-text);
        }

        .theme-toggle-btn:focus-visible {
          outline: 2px solid var(--focus-outline-color);
          outline-offset: 2px;
          box-shadow: var(--focus-ring);
        }

        .theme-toggle-btn.active {
          background: var(--color-primary);
          color: white;
          font-weight: var(--font-weight-semibold);
        }

        .theme-toggle-btn.active:hover {
          background: var(--color-primary-dark);
        }

        .theme-icon {
          font-size: 1.125rem;
          line-height: 1;
          display: flex;
          align-items: center;
        }

        .theme-label {
          font-size: var(--font-size-sm);
        }

        /* Compact mode for mobile */
        @media (max-width: 640px) {
          .theme-label {
            display: none;
          }

          .theme-toggle-btn {
            padding: 0.5rem;
          }

          .theme-icon {
            font-size: 1.25rem;
          }
        }

        /* High contrast mode */
        @media (prefers-contrast: high) {
          .theme-toggle {
            border-width: 2px;
          }

          .theme-toggle-btn.active {
            outline: 2px solid currentColor;
            outline-offset: -2px;
          }
        }
      `}</style>

      {themes.map((themeOption) => (
        <button
          key={themeOption.value}
          onClick={() => setTheme(themeOption.value)}
          className={`theme-toggle-btn ${theme === themeOption.value ? 'active' : ''}`}
          aria-label={themeOption.ariaLabel}
          aria-pressed={theme === themeOption.value}
          title={themeOption.label}
        >
          <span className="theme-icon" aria-hidden="true">
            {themeOption.icon}
          </span>
          <span className="theme-label">{themeOption.label}</span>
        </button>
      ))}
    </div>
  );
}
