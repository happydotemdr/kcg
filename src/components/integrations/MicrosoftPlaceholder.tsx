/**
 * MicrosoftPlaceholder Component
 * Shows a grayed-out placeholder for Microsoft 365 integration
 */

import React from 'react';

export default function MicrosoftPlaceholder() {
  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 opacity-60">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-700 mb-1">Microsoft 365 Integration</h3>
          <p className="text-sm text-gray-600">Calendar, Outlook, Contacts - Coming Soon</p>
        </div>

        {/* Microsoft Logo */}
        <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 24 24" fill="none">
          <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
          <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
          <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
          <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
        </svg>
      </div>

      {/* Service List */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>Outlook Calendar</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          <span>Outlook Mail</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span>Microsoft Contacts</span>
        </div>
      </div>

      {/* Disabled Connect Button */}
      <div className="pt-4 border-t border-gray-300">
        <button
          disabled
          className="w-full px-4 py-2 text-sm font-medium text-gray-500 bg-gray-200 rounded-md cursor-not-allowed relative group"
          title="Microsoft integrations planned for future release"
        >
          Connect Microsoft Account

          {/* Tooltip on hover */}
          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Microsoft integrations planned for future release
          </span>
        </button>
      </div>

      {/* Future Release Note */}
      <p className="mt-3 text-xs text-gray-500 text-center">
        Planned for future release
      </p>
    </div>
  );
}
