/**
 * DosThemeToggle Component (DOS/Retro Style)
 *
 * A DOS-styled theme toggle with terminal aesthetic.
 * Perfect for dark-themed pages and retro interfaces.
 */

import React from 'react';
import { useTheme } from '@lib/theme/ThemeContext';

export default function DosThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  // In DOS mode, we toggle between light and dark
  // System preference less common in retro terminals
  const handleToggle = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  };

  const getCurrentModeLabel = () => {
    if (theme === 'system') {
      return resolvedTheme === 'dark' ? 'DARK' : 'LIGHT';
    }
    return theme === 'dark' ? 'DARK' : 'LIGHT';
  };

  const getNextModeLabel = () => {
    if (theme === 'system') {
      return resolvedTheme === 'dark' ? 'LIGHT' : 'DARK';
    }
    return theme === 'dark' ? 'LIGHT' : 'DARK';
  };

  return (
    <div className="dos-theme-toggle">
      <style>{`
        .dos-theme-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: var(--font-family-mono);
        }

        .dos-theme-label {
          font-size: var(--font-size-xs);
          color: var(--color-text);
          text-shadow: var(--text-shadow-dos, none);
          letter-spacing: 0.05em;
          user-select: none;
        }

        .dos-theme-btn {
          padding: 0.25rem 0.75rem;
          background: var(--color-surface);
          color: var(--color-primary);
          border: 2px solid var(--color-primary);
          border-radius: var(--radius-sm);
          font-size: var(--font-size-xs);
          font-weight: var(--font-weight-bold);
          font-family: var(--font-family-mono);
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          transition: all var(--transition-fast);
          text-shadow: var(--text-shadow-dos, none);
          white-space: nowrap;
        }

        .dos-theme-btn:hover {
          background: var(--color-primary);
          color: var(--color-background);
          text-shadow: none;
          box-shadow: var(--shadow-md);
        }

        .dos-theme-btn:focus-visible {
          outline: 2px solid var(--focus-outline-color);
          outline-offset: 2px;
          box-shadow: var(--focus-ring);
        }

        .dos-theme-btn:active {
          transform: translateY(1px);
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        /* Blinking cursor effect (optional) */
        .dos-cursor {
          display: inline-block;
          width: 0.5rem;
          height: 1rem;
          background: var(--color-primary);
          margin-left: 0.25rem;
          animation: dos-blink 1s step-end infinite;
        }

        @keyframes dos-blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }

        /* Light mode adjustments */
        [data-theme="light"] .dos-theme-btn {
          background: var(--color-surface);
          color: var(--color-primary);
          border-color: var(--color-primary);
          text-shadow: none;
        }

        [data-theme="light"] .dos-theme-btn:hover {
          background: var(--color-primary);
          color: white;
        }

        [data-theme="light"] .dos-theme-label {
          color: var(--color-text-secondary);
          text-shadow: none;
        }

        /* Mobile responsive */
        @media (max-width: 640px) {
          .dos-theme-label {
            display: none;
          }

          .dos-theme-btn {
            padding: 0.375rem 0.625rem;
          }
        }

        /* High contrast mode */
        @media (prefers-contrast: high) {
          .dos-theme-btn {
            border-width: 3px;
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .dos-cursor {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>

      <span className="dos-theme-label" aria-hidden="true">
        MODE:
      </span>
      <button
        onClick={handleToggle}
        className="dos-theme-btn"
        aria-label={`Switch to ${getNextModeLabel().toLowerCase()} mode. Current mode: ${getCurrentModeLabel().toLowerCase()}`}
        aria-pressed={false}
        title={`Switch to ${getNextModeLabel()} mode`}
      >
        [{getCurrentModeLabel()}]
      </button>
    </div>
  );
}
