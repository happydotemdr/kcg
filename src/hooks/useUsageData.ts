/**
 * React Hooks for Usage Data Fetching
 * Provides hooks for all usage tracking endpoints with loading/error states
 */

import { useState, useEffect, useCallback } from 'react';
import {
  fetchUsageSummary,
  fetchConversations,
  fetchToolsBreakdown,
  fetchModelsBreakdown,
  type UsageSummaryResponse,
  type ConversationsResponse,
  type ToolsResponse,
  type ModelsResponse
} from '../lib/api/usage-api';

// ============================================================================
// Generic Hook State Interface
// ============================================================================

interface UseDataResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// Usage Summary Hook
// ============================================================================

/**
 * Hook for fetching usage summary data with time series
 */
export function useUsageSummary(params: {
  startDate: Date;
  endDate: Date;
  groupBy?: 'day' | 'week' | 'month';
  enabled?: boolean;
}): UseDataResult<UsageSummaryResponse> {
  const [state, setState] = useState<UseDataResult<UsageSummaryResponse>>({
    data: null,
    loading: true,
    error: null,
    refetch: async () => {}
  });

  const fetchData = useCallback(async () => {
    if (params.enabled === false) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await fetchUsageSummary({
        startDate: params.startDate,
        endDate: params.endDate,
        groupBy: params.groupBy
      });

      setState({
        data,
        loading: false,
        error: null,
        refetch: fetchData
      });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
        refetch: fetchData
      });
    }
  }, [params.startDate, params.endDate, params.groupBy, params.enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return state;
}

// ============================================================================
// Conversations Hook
// ============================================================================

/**
 * Hook for fetching conversations with pagination
 */
export function useConversations(params: {
  startDate?: Date;
  endDate?: Date;
  sortBy?: 'cost' | 'tokens' | 'date';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  includeDeleted?: boolean;
  enabled?: boolean;
}): UseDataResult<ConversationsResponse> {
  const [state, setState] = useState<UseDataResult<ConversationsResponse>>({
    data: null,
    loading: true,
    error: null,
    refetch: async () => {}
  });

  const fetchData = useCallback(async () => {
    if (params.enabled === false) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await fetchConversations({
        startDate: params.startDate,
        endDate: params.endDate,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        limit: params.limit,
        offset: params.offset,
        includeDeleted: params.includeDeleted
      });

      setState({
        data,
        loading: false,
        error: null,
        refetch: fetchData
      });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
        refetch: fetchData
      });
    }
  }, [
    params.startDate,
    params.endDate,
    params.sortBy,
    params.sortOrder,
    params.limit,
    params.offset,
    params.includeDeleted,
    params.enabled
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return state;
}

// ============================================================================
// Tools Breakdown Hook
// ============================================================================

/**
 * Hook for fetching tools breakdown
 */
export function useToolsBreakdown(params: {
  startDate: Date;
  endDate: Date;
  enabled?: boolean;
}): UseDataResult<ToolsResponse> {
  const [state, setState] = useState<UseDataResult<ToolsResponse>>({
    data: null,
    loading: true,
    error: null,
    refetch: async () => {}
  });

  const fetchData = useCallback(async () => {
    if (params.enabled === false) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await fetchToolsBreakdown({
        startDate: params.startDate,
        endDate: params.endDate
      });

      setState({
        data,
        loading: false,
        error: null,
        refetch: fetchData
      });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
        refetch: fetchData
      });
    }
  }, [params.startDate, params.endDate, params.enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return state;
}

// ============================================================================
// Models Breakdown Hook
// ============================================================================

/**
 * Hook for fetching models breakdown
 */
export function useModelsBreakdown(params: {
  startDate: Date;
  endDate: Date;
  enabled?: boolean;
}): UseDataResult<ModelsResponse> {
  const [state, setState] = useState<UseDataResult<ModelsResponse>>({
    data: null,
    loading: true,
    error: null,
    refetch: async () => {}
  });

  const fetchData = useCallback(async () => {
    if (params.enabled === false) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await fetchModelsBreakdown({
        startDate: params.startDate,
        endDate: params.endDate
      });

      setState({
        data,
        loading: false,
        error: null,
        refetch: fetchData
      });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
        refetch: fetchData
      });
    }
  }, [params.startDate, params.endDate, params.enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return state;
}
