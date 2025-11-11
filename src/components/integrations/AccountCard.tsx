/**
 * AccountCard Component
 * Displays a connected Google account with service status and actions
 */

import React from 'react';

interface AccountCardProps {
  email: string;
  label: string;
  isPrimary: boolean;
  hasCalendar: boolean;
  hasGmail: boolean;
  hasContacts: boolean;
  onDisconnect: () => void;
  onSetPrimary: () => void;
}

export default function AccountCard({
  email,
  label,
  isPrimary,
  hasCalendar,
  hasGmail,
  hasContacts,
  onDisconnect,
  onSetPrimary,
}: AccountCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">{email}</h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              {label}
            </span>
            {isPrimary && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Primary
              </span>
            )}
          </div>
        </div>

        {/* Google Logo */}
        <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      </div>

      {/* Service Status */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <svg className={`w-4 h-4 ${hasCalendar ? 'text-green-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {hasCalendar ? (
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3"/>
            ) : (
              <path d="M18 6L6 18M6 6l12 12"/>
            )}
          </svg>
          <span className={hasCalendar ? 'text-gray-700' : 'text-gray-500'}>
            Calendar {hasCalendar ? '(Active)' : '(Not configured)'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <svg className={`w-4 h-4 ${hasGmail ? 'text-green-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {hasGmail ? (
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3"/>
            ) : (
              <path d="M18 6L6 18M6 6l12 12"/>
            )}
          </svg>
          <span className={hasGmail ? 'text-gray-700' : 'text-gray-500'}>
            Gmail {hasGmail ? '(Active)' : '(Not configured)'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <svg className={`w-4 h-4 ${hasContacts ? 'text-green-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {hasContacts ? (
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3"/>
            ) : (
              <path d="M18 6L6 18M6 6l12 12"/>
            )}
          </svg>
          <span className={hasContacts ? 'text-gray-700' : 'text-gray-500'}>
            Contacts {hasContacts ? '(Active)' : '(Not configured)'}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-gray-200">
        {!isPrimary && (
          <button
            onClick={onSetPrimary}
            className="flex-1 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors"
          >
            Set as Primary
          </button>
        )}
        <button
          onClick={onDisconnect}
          className="flex-1 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}
