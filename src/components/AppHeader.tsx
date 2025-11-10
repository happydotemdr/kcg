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

interface AppHeaderProps {
  currentPage?: 'dashboard' | 'chat' | 'chatgpt' | 'calendar' | 'other';
}

export default function AppHeader({ currentPage = 'other' }: AppHeaderProps) {
  const resolvedTheme = useStore(resolvedThemeAtom);
  const isLightMode = resolvedTheme === 'light';
  const isDarkMode = resolvedTheme === 'dark';

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', key: 'dashboard' },
    { href: '/chat', label: 'Claude Chat', key: 'chat' },
    { href: '/chatgpt', label: 'ChatGPT', key: 'chatgpt' },
    { href: '/calendar-config', label: 'Calendar', key: 'calendar' },
  ];

  // Light mode: Modern clean UI
  // Dark mode: DOS terminal aesthetic
  const headerColors = isLightMode ? {
    // Modern Light Mode
    background: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#e5e7eb',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    logoGradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    logoText: null,
    navTextColor: '#6b7280',
    navActiveColor: '#4f46e5',
    clerkPrimary: '#4f46e5',
    clerkText: '#1f2937',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
    navPadding: '2rem',
    navBorder: 'none',
    navFontWeight: 500,
    navFontSize: '0.9375rem',
    logoFontWeight: 800,
    logoFontSize: '1.25rem',
    navActiveBorder: true,
  } : {
    // DOS Dark Mode
    background: 'linear-gradient(180deg, #001100 0%, #000000 100%)',
    borderColor: '#00ff00',
    boxShadow: '0 0 10px rgba(0, 255, 0, 0.3)',
    logoGradient: null,
    logoText: '[KCG.SYS]',
    navTextColor: '#00ff00',
    navActiveColor: '#000000',
    clerkPrimary: '#00ff00',
    clerkText: '#00ff00',
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    navPadding: '1rem',
    navBorder: `1px solid #00ff00`,
    navFontWeight: 700,
    navFontSize: '0.75rem',
    logoFontWeight: 700,
    logoFontSize: '1.125rem',
    navActiveBorder: false,
  };
  return (
    <header style={{
      background: headerColors.background,
      backdropFilter: isLightMode ? 'blur(10px)' : 'none',
      WebkitBackdropFilter: isLightMode ? 'blur(10px)' : 'none',
      borderBottom: isDarkMode ? `2px solid ${headerColors.borderColor}` : `1px solid ${headerColors.borderColor}`,
      padding: isDarkMode ? '0.75rem 1.5rem' : '1rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: headerColors.boxShadow,
      position: 'sticky',
      top: 0,
      zIndex: 100,
      fontFamily: headerColors.fontFamily,
    }}>
      {/* Logo */}
      <a href="/" style={{
        textDecoration: 'none',
        fontWeight: headerColors.logoFontWeight,
        fontSize: headerColors.logoFontSize,
        ...(headerColors.logoGradient ? {
          background: headerColors.logoGradient,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '-0.03em',
        } : {
          color: headerColors.navTextColor,
          textShadow: isDarkMode ? '0 0 5px rgba(0, 255, 0, 0.5)' : 'none',
          letterSpacing: '0.05em',
        })
      }}>
        {headerColors.logoText || 'Keep Choosing Good'}
      </a>

      {/* Nav Links */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        gap: headerColors.navPadding,
        flex: 1,
        justifyContent: 'center',
      }}>
        {navItems.map(item => (
          <a
            key={item.key}
            href={item.href}
            style={{
              color: currentPage === item.key ? (isDarkMode ? '#000000' : headerColors.navActiveColor) : headerColors.navTextColor,
              background: currentPage === item.key && isDarkMode ? '#00ff00' : 'transparent',
              textDecoration: 'none',
              fontWeight: headerColors.navFontWeight,
              fontSize: headerColors.navFontSize,
              position: 'relative',
              transition: 'all 0.2s',
              borderBottom: currentPage === item.key && headerColors.navActiveBorder ? `2px solid ${headerColors.navActiveColor}` : 'none',
              border: isDarkMode ? headerColors.navBorder : 'none',
              padding: isDarkMode ? '0.25rem 0.75rem' : '0.25rem 0',
              textShadow: isDarkMode && currentPage !== item.key ? '0 0 5px rgba(0, 255, 0, 0.5)' : 'none',
              textTransform: isDarkMode ? 'uppercase' : 'none',
            }}
            onMouseEnter={(e) => {
              if (isDarkMode) {
                e.currentTarget.style.background = '#00ff00';
                e.currentTarget.style.color = '#000000';
                e.currentTarget.style.textShadow = 'none';
              } else {
                e.currentTarget.style.color = headerColors.navActiveColor;
              }
            }}
            onMouseLeave={(e) => {
              if (currentPage !== item.key) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = headerColors.navTextColor;
                e.currentTarget.style.textShadow = isDarkMode ? '0 0 5px rgba(0, 255, 0, 0.5)' : 'none';
              }
            }}
          >
            {isDarkMode ? item.label.toUpperCase() : item.label}
          </a>
        ))}
      </nav>

      {/* Theme Toggle and User Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <ThemeToggle />
        <UserButton
          appearance={{
            variables: {
              colorPrimary: headerColors.clerkPrimary,
              colorText: headerColors.clerkText,
              borderRadius: isDarkMode ? '2px' : '0.5rem',
              ...(isDarkMode ? {
                colorBackground: '#000000',
                colorInputBackground: '#001100',
                colorInputText: '#00ff00',
                fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
              } : {})
            }
          }}
        />
      </div>
    </header>
  );
}
