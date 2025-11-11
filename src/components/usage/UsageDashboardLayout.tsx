/**
 * Usage Dashboard Layout Component
 * Provides the structure with header, date selector, tabs, and content area
 */

import React from 'react';
import DateRangeSelector from './DateRangeSelector';
import type { DateRange } from '../../lib/usage-date-utils';

interface UsageDashboardLayoutProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

export default function UsageDashboardLayout({
  dateRange,
  onDateRangeChange,
  activeTab,
  onTabChange,
  children
}: UsageDashboardLayoutProps) {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'conversations', label: 'Conversations', icon: '💬' },
    { id: 'tools', label: 'Tools', icon: '🛠️' },
    { id: 'models', label: 'Models', icon: '🤖' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            AI Usage & Costs
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Track your Claude AI token usage, costs, and conversation analytics
          </p>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <DateRangeSelector
            value={dateRange}
            onChange={onDateRangeChange}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" role="tablist">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                  ${activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}
