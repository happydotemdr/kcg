/**
 * Unified App Header Component
 * Consistent navigation across all authenticated pages
 * Supports both modern and DOS themes
 */

import React from 'react';
import { UserButton } from '@clerk/astro/react';

interface AppHeaderProps {
  theme?: 'modern' | 'dos';
  currentPage?: 'dashboard' | 'chat' | 'chatgpt' | 'calendar' | 'other';
}

export default function AppHeader({ theme = 'modern', currentPage = 'other' }: AppHeaderProps) {
  const isDos = theme === 'dos';

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', key: 'dashboard' },
    { href: '/chat', label: 'Claude Chat', key: 'chat' },
    { href: '/chatgpt', label: 'ChatGPT', key: 'chatgpt' },
    { href: '/calendar-config', label: 'Calendar', key: 'calendar' },
  ];

  if (isDos) {
    return (
      <header style={{
        background: 'linear-gradient(180deg, #001100 0%, #000000 100%)',
        borderBottom: '2px solid #00ff00',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
        boxShadow: '0 0 10px rgba(0, 255, 0, 0.3)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        {/* Logo */}
        <a href="/" style={{
          color: '#00ff00',
          textDecoration: 'none',
          fontWeight: 700,
          fontSize: '1.125rem',
          textShadow: '0 0 5px rgba(0, 255, 0, 0.5)',
          letterSpacing: '0.05em',
        }}>
          [KCG.SYS]
        </a>

        {/* Nav Links */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flex: 1,
          justifyContent: 'center',
        }}>
          {navItems.map(item => (
            <a
              key={item.key}
              href={item.href}
              style={{
                color: currentPage === item.key ? '#000000' : '#00ff00',
                background: currentPage === item.key ? '#00ff00' : 'transparent',
                textDecoration: 'none',
                padding: '0.25rem 0.75rem',
                border: '1px solid #00ff00',
                fontSize: '0.75rem',
                fontWeight: 700,
                textShadow: currentPage === item.key ? 'none' : '0 0 5px rgba(0, 255, 0, 0.5)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#00ff00';
                e.currentTarget.style.color = '#000000';
                e.currentTarget.style.textShadow = 'none';
              }}
              onMouseLeave={(e) => {
                if (currentPage !== item.key) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#00ff00';
                  e.currentTarget.style.textShadow = '0 0 5px rgba(0, 255, 0, 0.5)';
                }
              }}
            >
              {item.label.toUpperCase()}
            </a>
          ))}
        </nav>

        {/* User Button */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <UserButton
            appearance={{
              variables: {
                colorPrimary: '#00ff00',
                colorText: '#00ff00',
                colorBackground: '#000000',
                colorInputBackground: '#001100',
                colorInputText: '#00ff00',
                fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
                borderRadius: '2px'
              }
            }}
          />
        </div>
      </header>
    );
  }

  // Modern theme
  return (
    <header style={{
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderBottom: '1px solid #e5e7eb',
      padding: '1rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <a href="/" style={{
        textDecoration: 'none',
        fontWeight: 800,
        fontSize: '1.25rem',
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        letterSpacing: '-0.03em',
      }}>
        Keep Choosing Good
      </a>

      {/* Nav Links */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2rem',
        flex: 1,
        justifyContent: 'center',
      }}>
        {navItems.map(item => (
          <a
            key={item.key}
            href={item.href}
            style={{
              color: currentPage === item.key ? '#4f46e5' : '#6b7280',
              textDecoration: 'none',
              fontWeight: currentPage === item.key ? 600 : 500,
              fontSize: '0.9375rem',
              position: 'relative',
              transition: 'color 0.2s',
              borderBottom: currentPage === item.key ? '2px solid #4f46e5' : 'none',
              paddingBottom: '0.25rem',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#4f46e5';
            }}
            onMouseLeave={(e) => {
              if (currentPage !== item.key) {
                e.currentTarget.style.color = '#6b7280';
              }
            }}
          >
            {item.label}
          </a>
        ))}
      </nav>

      {/* User Button */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <UserButton
          appearance={{
            variables: {
              colorPrimary: '#4f46e5',
              colorText: '#1f2937',
              borderRadius: '0.5rem'
            }
          }}
        />
      </div>
    </header>
  );
}
