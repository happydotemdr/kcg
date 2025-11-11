/**
 * Unified App Header Component
 * Consistent navigation across all authenticated pages
 * Clean, modern light UI with Tailwind utilities
 */

import React from 'react';
import { UserButton } from '@clerk/astro/react';

interface AppHeaderProps {
  currentPage?: 'dashboard' | 'chat' | 'integrations' | 'contacts' | 'usage' | 'other';
}

export default function AppHeader({ currentPage = 'other' }: AppHeaderProps) {
  const navItems = [
    { href: '/dashboard', label: 'Dashboard', key: 'dashboard' },
    { href: '/chat', label: 'Claude Chat', key: 'chat' },
    { href: '/integrations', label: 'Integrations', key: 'integrations' },
    { href: '/contacts', label: 'Contacts', key: 'contacts' },
    { href: '/usage', label: 'Usage', key: 'usage' },
  ];

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <a
          href="/"
          className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
        >
          Keep Choosing Good
        </a>

        {/* Nav Links */}
        <nav className="flex items-center gap-6">
          {navItems.map(item => (
            <a
              key={item.key}
              href={item.href}
              className={`text-sm font-medium transition-colors pb-1 ${
                currentPage === item.key
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* User Button */}
        <div className="flex items-center">
          <UserButton
            appearance={{
              variables: {
                colorPrimary: '#4f46e5',
                colorText: '#1f2937',
                borderRadius: '0.5rem',
              }
            }}
          />
        </div>
      </div>
    </header>
  );
}
