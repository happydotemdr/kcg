/**
 * IntegrationsManager Component
 * Main container for the integrations page with state management
 */

import React, { useState, useEffect } from 'react';
import AccountCard from './AccountCard';
import AddAccountCard from './AddAccountCard';
import MicrosoftPlaceholder from './MicrosoftPlaceholder';

interface GoogleAccount {
  email: string;
  label: string | null;
  isPrimary: boolean;
  hasCalendar: boolean;
  hasGmail: boolean;
  hasContacts: boolean;
}

export default function IntegrationsManager() {
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check for success messages in URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');

    if (success === 'added') {
      setSuccessMessage('Google account connected successfully!');
      // Clear URL param
      window.history.replaceState({}, '', window.location.pathname);
      // Auto-hide after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } else if (success === 'true') {
      setSuccessMessage('Operation completed successfully!');
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  }, []);

  // Load accounts from API
  const loadAccounts = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/google/status');

      if (!response.ok) {
        throw new Error('Failed to load accounts');
      }

      const data = await response.json();
      setAccounts(data.accounts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
      console.error('Load accounts error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load accounts on mount
  useEffect(() => {
    loadAccounts();
  }, []);

  // Handle disconnect with confirmation
  const handleDisconnect = async (email: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to disconnect ${email}?\n\nThis will remove access to Calendar, Gmail, and Contacts for this account.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `/api/google/disconnect?googleAccountEmail=${encodeURIComponent(email)}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to disconnect account');
      }

      setSuccessMessage(`${email} disconnected successfully`);
      setTimeout(() => setSuccessMessage(null), 5000);

      // Reload accounts
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect account');
      console.error('Disconnect error:', err);
    }
  };

  // Handle set primary
  const handleSetPrimary = async (email: string) => {
    try {
      const response = await fetch('/api/google/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setPrimary', email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set primary account');
      }

      setSuccessMessage(`${email} set as primary account`);
      setTimeout(() => setSuccessMessage(null), 5000);

      // Reload accounts
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set primary account');
      console.error('Set primary error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3"/>
            </svg>
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-600 hover:text-green-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            <p className="text-gray-600">Loading integrations...</p>
          </div>
        </div>
      )}

      {/* Google Accounts Section */}
      {!loading && (
        <>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Google Accounts</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Existing accounts */}
              {accounts.map((account) => (
                <AccountCard
                  key={account.email}
                  email={account.email}
                  label={account.label || 'Personal'}
                  isPrimary={account.isPrimary}
                  hasCalendar={account.hasCalendar}
                  hasGmail={account.hasGmail}
                  hasContacts={account.hasContacts}
                  onDisconnect={() => handleDisconnect(account.email)}
                  onSetPrimary={() => handleSetPrimary(account.email)}
                />
              ))}

              {/* Add account card */}
              <AddAccountCard />
            </div>
          </div>

          {/* Microsoft Section */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Microsoft 365</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MicrosoftPlaceholder />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
