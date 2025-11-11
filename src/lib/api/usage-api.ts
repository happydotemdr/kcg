/**
 * API Client for Usage Tracking Endpoints
 * Provides type-safe functions for fetching usage data from the backend
 */

import { dateToISOString } from '../usage-date-utils';
import type {
  UsageSummaryResult,
  ConversationCostResult,
  ToolUsageBreakdown,
  ModelUsageBreakdown
} from '../../types/usage';

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Response from GET /api/usage/summary
 */
export interface UsageSummaryResponse {
  summary: UsageSummaryResult;
  date_range: {
    start_date: string;
    end_date: string;
    group_by: string;
  };
}

/**
 * Response from GET /api/usage/conversations
 */
export interface ConversationsResponse {
  conversations: ConversationCostResult[];
  pagination: {
    total_count: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
  filters: {
    start_date?: string;
    end_date?: string;
    sort_by: string;
    sort_order: string;
    include_deleted: boolean;
  };
}

/**
 * Response from GET /api/usage/tools
 */
export interface ToolsResponse {
  tools: ToolUsageBreakdown[];
  summary: {
    total_tool_calls: number;
    total_execution_time_ms: number;
    average_success_rate: number;
  };
  date_range: {
    start_date: string;
    end_date: string;
  };
}

/**
 * Response from GET /api/usage/models
 */
export interface ModelsResponse {
  models: ModelUsageBreakdown[];
  summary: {
    total_models_used: number;
    total_cost: number;
    most_expensive_model: string | null;
    most_used_model: string | null;
  };
  date_range: {
    start_date: string;
    end_date: string;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generic fetch wrapper with error handling and authentication
 */
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    credentials: 'include' // Include Clerk session cookie
  });

  if (!response.ok) {
    // Try to parse error message from response
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `API request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

// ============================================================================
// API Client Functions
// ============================================================================

/**
 * Fetch usage summary with time series data
 */
export async function fetchUsageSummary(params: {
  startDate: Date;
  endDate: Date;
  groupBy?: 'day' | 'week' | 'month';
}): Promise<UsageSummaryResponse> {
  const query = new URLSearchParams({
    start_date: dateToISOString(params.startDate),
    end_date: dateToISOString(params.endDate),
    ...(params.groupBy && { group_by: params.groupBy })
  });

  return fetchAPI<UsageSummaryResponse>(`/api/usage/summary?${query}`);
}

/**
 * Fetch paginated conversations with costs
 */
export async function fetchConversations(params: {
  startDate?: Date;
  endDate?: Date;
  sortBy?: 'cost' | 'tokens' | 'date';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  includeDeleted?: boolean;
}): Promise<ConversationsResponse> {
  const query = new URLSearchParams();

  if (params.startDate) query.append('start_date', dateToISOString(params.startDate));
  if (params.endDate) query.append('end_date', dateToISOString(params.endDate));
  if (params.sortBy) query.append('sort_by', params.sortBy);
  if (params.sortOrder) query.append('sort_order', params.sortOrder);
  if (params.limit) query.append('limit', params.limit.toString());
  if (params.offset) query.append('offset', params.offset.toString());
  if (params.includeDeleted) query.append('include_deleted', 'true');

  return fetchAPI<ConversationsResponse>(`/api/usage/conversations?${query}`);
}

/**
 * Fetch tool usage breakdown
 */
export async function fetchToolsBreakdown(params: {
  startDate: Date;
  endDate: Date;
}): Promise<ToolsResponse> {
  const query = new URLSearchParams({
    start_date: dateToISOString(params.startDate),
    end_date: dateToISOString(params.endDate)
  });

  return fetchAPI<ToolsResponse>(`/api/usage/tools?${query}`);
}

/**
 * Fetch model usage breakdown
 */
export async function fetchModelsBreakdown(params: {
  startDate: Date;
  endDate: Date;
}): Promise<ModelsResponse> {
  const query = new URLSearchParams({
    start_date: dateToISOString(params.startDate),
    end_date: dateToISOString(params.endDate)
  });

  return fetchAPI<ModelsResponse>(`/api/usage/models?${query}`);
}

/**
 * Trigger export download (redirects to download endpoint)
 */
export async function downloadUsageExport(params: {
  startDate: Date;
  endDate: Date;
  format: 'csv' | 'json';
  include?: 'all' | 'summary' | 'conversations' | 'tools' | 'models';
}): Promise<void> {
  const query = new URLSearchParams({
    start_date: dateToISOString(params.startDate),
    end_date: dateToISOString(params.endDate),
    format: params.format,
    ...(params.include && { include: params.include })
  });

  // Use window.location to trigger download
  window.location.href = `/api/usage/export?${query}`;
}
