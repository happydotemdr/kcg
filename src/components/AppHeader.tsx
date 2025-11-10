/**
 * Unified App Header Component
 * Consistent navigation across all authenticated pages
 * Globally responsive to light/dark theme:
 * - Light mode: Modern clean UI everywhere
 * - Dark mode: DOS terminal aesthetic everywhere
 */

import React from 'react';
import { UserButton } from '@clerk/astro/react';
import { useStore } from '@nanostores/react';
import { resolvedThemeAtom } from '@lib/theme/themeStore';
import ThemeToggle from './theme/ThemeToggle';
import styles from './AppHeader.module.css';

interface AppHeaderProps {
  currentPage?: 'dashboard' | 'chat' | 'chatgpt' | 'calendar' | 'other';
}

export default function AppHeader({ currentPage = 'other' }: AppHeaderProps) {
  const resolvedTheme = useStore(resolvedThemeAtom);
  const isDarkMode = resolvedTheme === 'dark';

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', key: 'dashboard' },
    { href: '/chat', label: 'Claude Chat', key: 'chat' },
    { href: '/chatgpt', label: 'ChatGPT', key: 'chatgpt' },
    { href: '/calendar-config', label: 'Calendar', key: 'calendar' },
  ];

  // Clerk UserButton theme configuration
  const clerkTheme = isDarkMode ? {
    colorPrimary: '#00ff00',
    colorText: '#00ff00',
    borderRadius: '2px',
    colorBackground: '#000000',
    colorInputBackground: '#001100',
    colorInputText: '#00ff00',
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
  } : {
    colorPrimary: '#4f46e5',
    colorText: '#1f2937',
    borderRadius: '0.5rem',
  };

  return (
    <header className={styles.header}>
      {/* Logo */}
      <a href="/" className={styles.logo}>
        {isDarkMode ? '[KCG.SYS]' : 'Keep Choosing Good'}
      </a>

      {/* Nav Links */}
      <nav className={styles.nav}>
        {navItems.map(item => (
          <a
            key={item.key}
            href={item.href}
            className={`${styles.navLink} ${currentPage === item.key ? styles.active : ''}`}
          >
            {isDarkMode ? item.label.toUpperCase() : item.label}
          </a>
        ))}
      </nav>

      {/* Theme Toggle and User Button */}
      <div className={styles.userControls}>
        <ThemeToggle />
        <UserButton
          appearance={{
            variables: clerkTheme
          }}
        />
      </div>
    </header>
  );
}
