/**
 * Main Usage Dashboard Component
 * Orchestrates the dashboard state and tab navigation
 */

import React, { useState } from 'react';
import UsageDashboardLayout from './UsageDashboardLayout';
import { getDefaultStartDate, getDefaultEndDate, type DateRange } from '../../lib/usage-date-utils';
import { useUsageSummary, useConversations, useToolsBreakdown, useModelsBreakdown } from '../../hooks/useUsageData';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import SummaryCards from './SummaryCards';

export default function UsageDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>({
    start: getDefaultStartDate(),
    end: getDefaultEndDate(),
    preset: 'last_30_days'
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'conversations' | 'tools' | 'models'>('overview');

  // Fetch data with hooks (only fetch for active tab)
  const summaryData = useUsageSummary({
    startDate: dateRange.start,
    endDate: dateRange.end,
    groupBy: 'day',
    enabled: activeTab === 'overview'
  });

  const conversationsData = useConversations({
    startDate: dateRange.start,
    endDate: dateRange.end,
    sortBy: 'cost',
    sortOrder: 'desc',
    limit: 50,
    offset: 0,
    enabled: activeTab === 'conversations'
  });

  const toolsData = useToolsBreakdown({
    startDate: dateRange.start,
    endDate: dateRange.end,
    enabled: activeTab === 'tools'
  });

  const modelsData = useModelsBreakdown({
    startDate: dateRange.start,
    endDate: dateRange.end,
    enabled: activeTab === 'models'
  });

  return (
    <UsageDashboardLayout
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      activeTab={activeTab}
      onTabChange={setActiveTab as (tab: string) => void}
    >
      {activeTab === 'overview' && (
        <div>
          {summaryData.loading && <LoadingSpinner message="Loading usage summary..." />}
          {summaryData.error && <ErrorMessage error={summaryData.error} onRetry={summaryData.refetch} />}
          {summaryData.data && (
            <div className="space-y-6">
              <SummaryCards data={summaryData.data.summary} />
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Raw Data (Phase 8 will add visualizations)
                </h3>
                <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-96">
                  {JSON.stringify(summaryData.data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'conversations' && (
        <div>
          {conversationsData.loading && <LoadingSpinner message="Loading conversations..." />}
          {conversationsData.error && <ErrorMessage error={conversationsData.error} onRetry={conversationsData.refetch} />}
          {conversationsData.data && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Conversations ({conversationsData.data.pagination.total_count})
                </h2>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Raw Data (Phase 9 will add table view)
                  </h3>
                  <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-96">
                    {JSON.stringify(conversationsData.data, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'tools' && (
        <div>
          {toolsData.loading && <LoadingSpinner message="Loading tool usage..." />}
          {toolsData.error && <ErrorMessage error={toolsData.error} onRetry={toolsData.refetch} />}
          {toolsData.data && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Tool Usage
                </h2>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Calls</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {toolsData.data.summary.total_tool_calls}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Execution Time</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {(toolsData.data.summary.total_execution_time_ms / 1000).toFixed(2)}s
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {(toolsData.data.summary.average_success_rate * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Raw Data (Phase 10 will add visualizations)
                  </h3>
                  <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-96">
                    {JSON.stringify(toolsData.data, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'models' && (
        <div>
          {modelsData.loading && <LoadingSpinner message="Loading model usage..." />}
          {modelsData.error && <ErrorMessage error={modelsData.error} onRetry={modelsData.refetch} />}
          {modelsData.data && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Model Usage
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Models Used</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {modelsData.data.summary.total_models_used}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Cost</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      ${modelsData.data.summary.total_cost.toFixed(4)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Most Used</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {modelsData.data.summary.most_used_model || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Most Expensive</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {modelsData.data.summary.most_expensive_model || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Raw Data (Phase 10 will add visualizations)
                  </h3>
                  <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-96">
                    {JSON.stringify(modelsData.data, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </UsageDashboardLayout>
  );
}
