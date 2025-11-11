/**
 * Main Usage Dashboard Component
 * Orchestrates the dashboard state and tab navigation
 */

import React, { useState, useEffect } from 'react';
import UsageDashboardLayout from './UsageDashboardLayout';
import { getDefaultStartDate, getDefaultEndDate, type DateRange } from '../../lib/usage-date-utils';
import { useUsageSummary, useConversations, useToolsBreakdown, useModelsBreakdown } from '../../hooks/useUsageData';
import ErrorMessage from './ErrorMessage';
import SummaryCards from './SummaryCards';
import ConversationList from './ConversationList';
import ConversationDetails from './ConversationDetails';
import TokenBreakdownChart from './TokenBreakdownChart';
import ApiCallsChart from './ApiCallsChart';
import CostTrendChart from './CostTrendChart';
import ToolUsageChart from './ToolUsageChart';
import ModelDistributionChart from './ModelDistributionChart';
import SummaryCardsSkeleton from './skeletons/SummaryCardsSkeleton';
import ChartSkeleton from './skeletons/ChartSkeleton';
import ConversationListSkeleton from './skeletons/ConversationListSkeleton';

export default function UsageDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>({
    start: getDefaultStartDate(),
    end: getDefaultEndDate(),
    preset: 'last_30_days'
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'conversations' | 'tools' | 'models'>('overview');

  // Conversations tab state
  const [conversationsPage, setConversationsPage] = useState(0);
  const [conversationsPageSize, setConversationsPageSize] = useState(50);
  const [conversationsSortBy, setConversationsSortBy] = useState<'cost' | 'tokens' | 'date'>('cost');
  const [conversationsSortOrder, setConversationsSortOrder] = useState<'asc' | 'desc'>('desc');
  const [conversationsSearchQuery, setConversationsSearchQuery] = useState('');
  const [conversationsIncludeDeleted, setConversationsIncludeDeleted] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    sortBy: conversationsSortBy,
    sortOrder: conversationsSortOrder,
    limit: conversationsPageSize,
    offset: conversationsPage * conversationsPageSize,
    includeDeleted: conversationsIncludeDeleted,
    search: conversationsSearchQuery,
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

  // ============================================================================
  // Modal State Management & Scroll Lock
  // ============================================================================

  // Scroll lock: Prevent body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  // ============================================================================
  // Conversation List Handlers
  // ============================================================================

  const handleConversationPageChange = (page: number) => {
    setConversationsPage(page);
  };

  const handleConversationPageSizeChange = (size: number) => {
    setConversationsPageSize(size);
    setConversationsPage(0); // Reset to first page when changing page size
  };

  const handleConversationSortChange = (
    sortBy: 'cost' | 'tokens' | 'date',
    sortOrder: 'asc' | 'desc'
  ) => {
    setConversationsSortBy(sortBy);
    setConversationsSortOrder(sortOrder);
  };

  const handleConversationSearchChange = (query: string) => {
    setConversationsSearchQuery(query);
    setConversationsPage(0); // Reset to first page when searching
  };

  const handleConversationIncludeDeletedChange = (include: boolean) => {
    setConversationsIncludeDeleted(include);
    setConversationsPage(0); // Reset to first page when changing filter
  };

  const handleConversationClick = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    // Optional: Clear selected conversation after animation
    setTimeout(() => setSelectedConversationId(null), 300);
  };

  const handleConversationExport = async (format: 'csv' | 'json') => {
    try {
      const queryParams = new URLSearchParams({
        start_date: dateRange.start.toISOString().split('T')[0],
        end_date: dateRange.end.toISOString().split('T')[0],
        format: format,
        include_deleted: conversationsIncludeDeleted.toString()
      });

      const response = await fetch(`/api/usage/export?${queryParams}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `usage-export-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  // Convert dateRange preset to valid chart groupBy value
  const getGroupBy = (): 'day' | 'week' | 'month' => {
    const preset = dateRange.preset;
    // Map all presets to day/week/month for charts
    if (preset === 'last_30_days' || preset === 'this_month' || preset === 'last_month') {
      return 'day';
    }
    if (preset === 'last_7_days') {
      return 'day';
    }
    // today, yesterday, custom default to day
    return 'day';
  };

  return (
    <UsageDashboardLayout
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      activeTab={activeTab}
      onTabChange={setActiveTab as (tab: string) => void}
    >
      {activeTab === 'overview' && (
        <div>
          {summaryData.error && <ErrorMessage error={summaryData.error} onRetry={summaryData.refetch} />}
          {summaryData.loading ? (
            <div className="space-y-6">
              <SummaryCardsSkeleton />
              <div className="space-y-6">
                <ChartSkeleton />
                <ChartSkeleton />
                <ChartSkeleton />
              </div>
            </div>
          ) : summaryData.data ? (
            <div className="space-y-6">
              <SummaryCards
                data={summaryData.data.summary}
                startDate={dateRange.start.toISOString()}
                endDate={dateRange.end.toISOString()}
              />

              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Cost & Token Trends
                  </h3>
                  <CostTrendChart data={summaryData.data.summary.time_series} groupBy={getGroupBy()} />
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Token Usage Breakdown
                  </h3>
                  <TokenBreakdownChart data={summaryData.data.summary.time_series} groupBy={getGroupBy()} />
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    API Call Volume
                  </h3>
                  <ApiCallsChart data={summaryData.data.summary.time_series} groupBy={getGroupBy()} />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {activeTab === 'conversations' && (
        <div>
          {conversationsData.error && <ErrorMessage error={conversationsData.error} onRetry={conversationsData.refetch} />}
          {conversationsData.loading ? (
            <ConversationListSkeleton rowCount={conversationsPageSize} />
          ) : conversationsData.data ? (
            <ConversationList
              conversations={conversationsData.data.conversations}
              totalCount={conversationsData.data.pagination.total_count}
              currentPage={conversationsPage}
              pageSize={conversationsPageSize}
              sortBy={conversationsSortBy}
              sortOrder={conversationsSortOrder}
              includeDeleted={conversationsIncludeDeleted}
              searchQuery={conversationsSearchQuery}
              onPageChange={handleConversationPageChange}
              onPageSizeChange={handleConversationPageSizeChange}
              onSortChange={handleConversationSortChange}
              onSearchChange={handleConversationSearchChange}
              onIncludeDeletedChange={handleConversationIncludeDeletedChange}
              onConversationClick={handleConversationClick}
              onExport={handleConversationExport}
            />
          ) : null}
        </div>
      )}

      {activeTab === 'tools' && (
        <div>
          {toolsData.error && <ErrorMessage error={toolsData.error} onRetry={toolsData.refetch} />}
          {toolsData.loading ? (
            <ChartSkeleton />
          ) : toolsData.data ? (
            <div className="space-y-6">
              <ToolUsageChart data={toolsData.data} />
            </div>
          ) : null}
        </div>
      )}

      {activeTab === 'models' && (
        <div>
          {modelsData.error && <ErrorMessage error={modelsData.error} onRetry={modelsData.refetch} />}
          {modelsData.loading ? (
            <ChartSkeleton />
          ) : modelsData.data ? (
            <div className="space-y-6">
              <ModelDistributionChart data={modelsData.data} />
            </div>
          ) : null}
        </div>
      )}

      {/* Conversation Details Modal */}
      <ConversationDetails
        isOpen={isModalOpen}
        conversationId={selectedConversationId}
        onClose={handleModalClose}
      />
    </UsageDashboardLayout>
  );
}
