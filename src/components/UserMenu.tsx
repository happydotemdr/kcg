/**
 * UserMenu Component
 * Account avatar with dashboard link and Clerk UserButton
 * Works with both modern and DOS themes
 *
 * Note: This component assumes the user is authenticated.
 * Use on protected pages only (pages with auth middleware).
 */

import React from 'react';
import { UserButton } from '@clerk/astro/react';

interface UserMenuProps {
  theme?: 'modern' | 'dos';
}

export default function UserMenu({ theme = 'modern' }: UserMenuProps) {
  const isDos = theme === 'dos';

  // Styles as constants
  const styles = {
    modernContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
    } as React.CSSProperties,

    modernDashboardLink: {
      padding: '0.5rem 1rem',
      background: 'rgba(79, 70, 229, 0.1)',
      color: '#4f46e5',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      fontWeight: 600,
      textDecoration: 'none',
      transition: 'all 0.2s',
    } as React.CSSProperties,

    dosContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    } as React.CSSProperties,

    dosDashboardLink: {
      padding: '0.25rem 0.5rem',
      background: '#001100',
      color: '#00ff00',
      border: '1px solid #00ff00',
      fontSize: '0.75rem',
      fontWeight: 700,
      textDecoration: 'none',
      transition: 'all 0.2s',
      textShadow: '0 0 5px rgba(0, 255, 0, 0.5)',
    } as React.CSSProperties,
  };

  return (
    <div style={isDos ? styles.dosContainer : styles.modernContainer}>
      <a
        href="/dashboard"
        style={isDos ? styles.dosDashboardLink : styles.modernDashboardLink}
        title="Go to Dashboard"
        onMouseEnter={(e) => {
          if (isDos) {
            e.currentTarget.style.background = '#00ff00';
            e.currentTarget.style.color = '#000000';
            e.currentTarget.style.textShadow = 'none';
          } else {
            e.currentTarget.style.background = '#4f46e5';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }
        }}
        onMouseLeave={(e) => {
          if (isDos) {
            e.currentTarget.style.background = '#001100';
            e.currentTarget.style.color = '#00ff00';
            e.currentTarget.style.textShadow = '0 0 5px rgba(0, 255, 0, 0.5)';
          } else {
            e.currentTarget.style.background = 'rgba(79, 70, 229, 0.1)';
            e.currentTarget.style.color = '#4f46e5';
            e.currentTarget.style.transform = 'translateY(0)';
          }
        }}
      >
        {isDos ? '[DASH]' : 'Dashboard'}
      </a>

      <UserButton
        appearance={{
          variables: isDos ? {
            colorPrimary: '#00ff00',
            colorText: '#00ff00',
            colorBackground: '#000000',
            colorInputBackground: '#001100',
            colorInputText: '#00ff00',
            fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
            borderRadius: '2px'
          } : {
            colorPrimary: '#4f46e5',
            colorText: '#1f2937',
            borderRadius: '0.5rem'
          }
        }}
      />
    </div>
  );
}
