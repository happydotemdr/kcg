/**
 * UserMenu Component
 * Account avatar with dashboard link and Clerk UserButton
 *
 * Note: This component assumes the user is authenticated.
 * Use on protected pages only (pages with auth middleware).
 */

import { UserButton } from '@clerk/astro/react';

export default function UserMenu() {
  return (
    <div className="flex items-center gap-3">
      <a
        href="/dashboard"
        title="Go to Dashboard"
        className="px-4 py-2 rounded-md text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white transition-all duration-200"
      >
        Dashboard
      </a>

      <UserButton
        appearance={{
          variables: {
            colorPrimary: '#4f46e5',
            colorText: '#1f2937',
            borderRadius: '0.5rem',
          },
        }}
      />
    </div>
  );
}
