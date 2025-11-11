/**
 * React Hook for fetching conversation details
 * Follows the pattern from useUsageData.ts for consistency
 */

import { useState, useEffect, useCallback } from 'react';
import type { ConversationDetailsResult } from '../types/usage';

interface UseConversationDetailsParams {
  conversationId: string | null;
  enabled?: boolean;
}

interface UseConversationDetailsResult {
  data: ConversationDetailsResult | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useConversationDetails(
  params: UseConversationDetailsParams
): UseConversationDetailsResult {
  const [state, setState] = useState<{
    data: ConversationDetailsResult | null;
    loading: boolean;
    error: Error | null;
  }>({
    data: null,
    loading: true,
    error: null
  });

  const fetchData = useCallback(async () => {
    // Don't fetch if disabled or no conversation ID
    if (params.enabled === false || !params.conversationId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(
        `/api/usage/conversations/${params.conversationId}`,
        {
          credentials: 'include' // Include Clerk session cookie
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${response.status}`);
      }

      const data = await response.json();

      // Convert ISO date strings back to Date objects
      const parsedData: ConversationDetailsResult = {
        metadata: {
          ...data.metadata,
          first_message_at: new Date(data.metadata.first_message_at),
          last_message_at: new Date(data.metadata.last_message_at),
          deleted_at: data.metadata.deleted_at
            ? new Date(data.metadata.deleted_at)
            : null
        },
        messages: data.messages.map((msg: any) => ({
          ...msg,
          created_at: new Date(msg.created_at)
        })),
        tool_executions: data.tool_executions.map((tool: any) => ({
          ...tool,
          created_at: new Date(tool.created_at)
        })),
        summary: data.summary
      };

      setState({ data: parsedData, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error('Unknown error')
      });
    }
  }, [params.conversationId, params.enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    refetch: fetchData
  };
}
