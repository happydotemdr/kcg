/**
 * ContactSyncControls Component
 * Action buttons for contact sync operations (export, enable/disable sync)
 */

import React, { useState } from 'react';

interface ContactSource {
  provider: string;
}

interface ContactSyncControlsProps {
  contactId: string;
  currentSources: ContactSource[];
  onSyncComplete?: () => void;
}

export default function ContactSyncControls({
  contactId,
  currentSources,
  onSyncComplete,
}: ContactSyncControlsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isTogglingSync, setIsTogglingSync] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const hasGoogleSource = currentSources.some((s) => s.provider === 'google_contacts');

  const handleExportToGoogle = async () => {
    setIsExporting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/google/contacts/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Export failed');
      }

      setMessage({ type: 'success', text: 'Contact exported to Google Contacts' });
      onSyncComplete?.();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Export failed',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleToggleSync = async (enable: boolean) => {
    setIsTogglingSync(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sync_enabled: enable }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Sync toggle failed');
      }

      setMessage({
        type: 'success',
        text: enable ? 'Sync enabled' : 'Sync disabled',
      });
      onSyncComplete?.();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Sync toggle failed',
      });
    } finally {
      setIsTogglingSync(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        {!hasGoogleSource && (
          <button
            onClick={handleExportToGoogle}
            disabled={isExporting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
          >
            {isExporting ? 'Exporting...' : 'Export to Google Contacts'}
          </button>
        )}

        {hasGoogleSource && (
          <>
            <button
              onClick={() => handleToggleSync(true)}
              disabled={isTogglingSync}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
            >
              {isTogglingSync ? 'Enabling...' : 'Enable Sync'}
            </button>
            <button
              onClick={() => handleToggleSync(false)}
              disabled={isTogglingSync}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
            >
              {isTogglingSync ? 'Disabling...' : 'Disable Sync'}
            </button>
          </>
        )}
      </div>

      {/* Message Display */}
      {message && (
        <div
          className={`px-4 py-2 rounded-md text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
