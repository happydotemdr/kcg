/**
 * ContactSourcesBadge Component
 * Displays provider badges (Google, Microsoft) for a contact with sync status
 */

import React from 'react';

interface ContactSource {
  provider: 'google_contacts' | 'microsoft_contacts';
  last_synced_at: Date | null;
}

interface ContactSourcesBadgeProps {
  sources: ContactSource[];
}

export default function ContactSourcesBadge({ sources }: ContactSourcesBadgeProps) {
  const formatSyncTime = (date: Date | null): string => {
    if (!date) return 'Never synced';
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getProviderInfo = (provider: string) => {
    switch (provider) {
      case 'google_contacts':
        return { label: 'Google', icon: 'G' };
      case 'microsoft_contacts':
        return { label: 'Microsoft', icon: 'M' };
      default:
        return { label: provider, icon: '?' };
    }
  };

  if (sources.length === 0) {
    return (
      <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">
        No sources
      </span>
    );
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {sources.map((source, index) => {
        const { label, icon } = getProviderInfo(source.provider);
        const isSynced = source.last_synced_at !== null;
        const syncTime = formatSyncTime(source.last_synced_at);

        return (
          <span
            key={`${source.provider}-${index}`}
            className={`px-2 py-1 rounded text-xs font-medium inline-flex items-center gap-1 ${
              isSynced
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600'
            }`}
            title={`${label} - ${syncTime}`}
          >
            <span className="font-semibold">{icon}</span>
            <span>{label}</span>
            {isSynced && (
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3" />
              </svg>
            )}
          </span>
        );
      })}
    </div>
  );
}
