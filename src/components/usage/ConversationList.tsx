/**
 * Conversation List Component
 * Displays paginated table of conversations with costs, search, filter, and sort capabilities
 */

import React, { useState, useEffect } from 'react';
import type { ConversationCostResult } from '../../types/usage';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface ConversationListProps {
  conversations: ConversationCostResult[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  sortBy: 'cost' | 'tokens' | 'date';
  sortOrder: 'asc' | 'desc';
  includeDeleted: boolean;
  searchQuery: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSortChange: (sortBy: 'cost' | 'tokens' | 'date', sortOrder: 'asc' | 'desc') => void;
  onSearchChange: (query: string) => void;
  onIncludeDeletedChange: (include: boolean) => void;
  onConversationClick: (conversationId: string) => void;
  onExport: (format: 'csv' | 'json') => void;
}

// ============================================================================
// Component
// ============================================================================

export default function ConversationList({
  conversations,
  totalCount,
  currentPage,
  pageSize,
  sortBy,
  sortOrder,
  includeDeleted,
  searchQuery,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onSearchChange,
  onIncludeDeletedChange,
  onConversationClick,
  onExport
}: ConversationListProps) {
  // ============================================================================
  // Local State
  // ============================================================================

  // Local search input state for debouncing
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * Debounce search input - only call onSearchChange after 300ms of no typing
   */
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (localSearchQuery !== searchQuery) {
        onSearchChange(localSearchQuery);
      }
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timeoutId);
  }, [localSearchQuery, searchQuery, onSearchChange]);

  /**
   * Sync local search query with prop if it changes externally
   */
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  // ============================================================================
  // Helper Functions
  // ============================================================================

  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(4)}`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  /**
   * Handle column sort click - toggles sort order if same column, otherwise sets new column with desc order
   */
  const handleColumnSort = (column: 'cost' | 'tokens' | 'date') => {
    if (sortBy === column) {
      // Toggle order if clicking same column
      onSortChange(column, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to descending for new column
      onSortChange(column, 'desc');
    }
  };

  /**
   * Render sort indicator icon for a column
   */
  const renderSortIndicator = (column: 'cost' | 'tokens' | 'date') => {
    if (sortBy !== column) {
      // Show neutral sort icon for non-active columns
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    // Show active sort direction
    if (sortOrder === 'asc') {
      return (
        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      );
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-4">
      {/* Header with Title and Export Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Conversations ({totalCount})
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => onExport('csv')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={() => onExport('json')}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-100 dark:border-gray-700 p-4 shadow-md hover:shadow-lg transition-all duration-150">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <label htmlFor="search" className="sr-only">
              Search conversations
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                id="search"
                type="text"
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                placeholder="Search conversations by title..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              {localSearchQuery && (
                <button
                  onClick={() => setLocalSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="Clear search"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Show Deleted Conversations Toggle */}
          <div className="flex items-center gap-3">
            <label
              htmlFor="includeDeleted"
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <input
                id="includeDeleted"
                type="checkbox"
                checked={includeDeleted}
                onChange={(e) => onIncludeDeletedChange(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Show deleted conversations
              </span>
            </label>

            {/* Results count indicator */}
            {searchQuery && (
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                {totalCount} result{totalCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-100 dark:border-gray-700 overflow-hidden shadow-md hover:shadow-lg transition-all duration-150">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {/* Title - Non-sortable */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Title
                </th>

                {/* Date - Sortable */}
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleColumnSort('date')}
                    className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  >
                    Date
                    {renderSortIndicator('date')}
                  </button>
                </th>

                {/* Cost - Sortable */}
                <th className="px-6 py-3 text-right">
                  <button
                    onClick={() => handleColumnSort('cost')}
                    className="flex items-center justify-end gap-1 w-full text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  >
                    Cost
                    {renderSortIndicator('cost')}
                  </button>
                </th>

                {/* Tokens - Sortable */}
                <th className="px-6 py-3 text-right">
                  <button
                    onClick={() => handleColumnSort('tokens')}
                    className="flex items-center justify-end gap-1 w-full text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  >
                    Tokens
                    {renderSortIndicator('tokens')}
                  </button>
                </th>

                {/* Messages - Non-sortable */}
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Messages
                </th>

                {/* Status - Non-sortable */}
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {conversations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="text-gray-500 dark:text-gray-400">
                      <svg
                        className="mx-auto h-12 w-12 mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                        />
                      </svg>
                      <p className="text-lg font-medium">No conversations found</p>
                      <p className="text-sm mt-1">
                        {searchQuery
                          ? 'Try adjusting your search or filters'
                          : 'Start a conversation to see usage data here'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                conversations.map((conversation) => (
                  <tr
                    key={conversation.conversation_id}
                    onClick={() => onConversationClick(conversation.conversation_id)}
                    className={`
                      cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                      ${conversation.deleted_at ? 'opacity-60' : ''}
                    `}
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">
                        {conversation.title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(conversation.last_message_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(conversation.total_cost)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {formatNumber(conversation.total_tokens)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {conversation.message_count}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {conversation.deleted_at ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          Deleted
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-100 dark:border-gray-700 p-4 shadow-md hover:shadow-lg transition-all duration-150">
          <div className="flex items-center justify-between">
            {/* Page Info and Size Selector */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalCount)} of {totalCount} conversations
              </span>

              <div className="flex items-center gap-2">
                <label htmlFor="pageSize" className="text-sm text-gray-600 dark:text-gray-400">
                  Per page:
                </label>
                <select
                  id="pageSize"
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center gap-2">
              {/* First Page */}
              <button
                onClick={() => onPageChange(0)}
                disabled={currentPage === 0}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="First page"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>

              {/* Previous Page */}
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 0}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Previous page"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {(() => {
                  const pages = [];
                  const maxPagesToShow = 5;
                  let startPage = Math.max(0, currentPage - Math.floor(maxPagesToShow / 2));
                  let endPage = Math.min(totalPages - 1, startPage + maxPagesToShow - 1);

                  // Adjust startPage if we're near the end
                  if (endPage - startPage < maxPagesToShow - 1) {
                    startPage = Math.max(0, endPage - maxPagesToShow + 1);
                  }

                  // Add first page + ellipsis if needed
                  if (startPage > 0) {
                    pages.push(
                      <button
                        key={0}
                        onClick={() => onPageChange(0)}
                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                      >
                        1
                      </button>
                    );
                    if (startPage > 1) {
                      pages.push(
                        <span key="ellipsis-start" className="px-2 text-gray-500 dark:text-gray-400">
                          ...
                        </span>
                      );
                    }
                  }

                  // Add page numbers
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => onPageChange(i)}
                        className={`
                          px-3 py-1.5 text-sm border rounded-md transition-colors
                          ${currentPage === i
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600'
                          }
                        `}
                      >
                        {i + 1}
                      </button>
                    );
                  }

                  // Add ellipsis + last page if needed
                  if (endPage < totalPages - 1) {
                    if (endPage < totalPages - 2) {
                      pages.push(
                        <span key="ellipsis-end" className="px-2 text-gray-500 dark:text-gray-400">
                          ...
                        </span>
                      );
                    }
                    pages.push(
                      <button
                        key={totalPages - 1}
                        onClick={() => onPageChange(totalPages - 1)}
                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                      >
                        {totalPages}
                      </button>
                    );
                  }

                  return pages;
                })()}
              </div>

              {/* Next Page */}
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages - 1}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Next page"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Last Page */}
              <button
                onClick={() => onPageChange(totalPages - 1)}
                disabled={currentPage >= totalPages - 1}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Last page"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
