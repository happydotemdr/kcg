import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useConversationDetails } from '../../hooks/useConversationDetails';

/**
 * Props for ConversationDetails modal component
 */
interface ConversationDetailsProps {
  isOpen: boolean;
  conversationId: string | null;
  onClose: () => void;
}

/**
 * ConversationDetails Modal Component
 *
 * Displays detailed per-message cost breakdown for a conversation.
 * Implements portal rendering, keyboard navigation, and accessibility patterns.
 */
export default function ConversationDetails({
  isOpen,
  conversationId,
  onClose
}: ConversationDetailsProps) {
  // Ref for focus management and accessibility
  const modalRef = useRef<HTMLDivElement>(null);

  // Fetch conversation details
  const { data, loading, error, refetch } = useConversationDetails({
    conversationId,
    enabled: isOpen && conversationId !== null
  });

  // Handle Escape key to close modal (keyboard accessibility)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Focus trap - auto-focus first interactive element when modal opens
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const firstFocusable = modalRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }
  }, [isOpen]);

  // Early return if modal is not open or no conversation selected
  if (!isOpen || !conversationId) return null;

  // Render modal into document.body using portal (escapes parent container styles)
  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="bg-white dark:bg-gray-800 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 id="modal-title" className="text-2xl font-bold text-gray-900 dark:text-white">
            {data ? data.metadata.title : 'Conversation Details'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <svg
              className="w-6 h-6 text-gray-600 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Modal Body with Loading/Error/Content States */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          {loading && (
            <div className="p-6">
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
              <p className="text-center text-gray-600 dark:text-gray-400 mt-4">
                Loading conversation details...
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="p-6">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                      Failed to load conversation details
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      {error.message}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => refetch()}
                  className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {data && !loading && !error && (
            <div className="p-6">
              {/* Metadata Section */}
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg mb-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Model</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {data.metadata.model}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Date Range</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(data.metadata.first_message_at).toLocaleDateString()} - {new Date(data.metadata.last_message_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {data.metadata.deleted_at ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      Deleted
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Active
                    </span>
                  )}
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Cost</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${data.metadata.total_cost.toFixed(4)}
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Tokens</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {data.metadata.total_tokens.toLocaleString()}
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Messages</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {data.metadata.message_count}
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg Cost/Message</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${data.summary.average_cost_per_message.toFixed(4)}
                  </p>
                </div>
              </div>

              {/* Messages Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Per-Message Breakdown
                </h3>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Role</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Input</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Output</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Cache Read</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Cache Write</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {data.messages.map((message) => (
                          <tr key={message.message_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                message.role === 'user'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                  : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                              }`}>
                                {message.role}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">
                              {message.input_tokens.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">
                              {message.output_tokens.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                              {message.cache_read_tokens > 0 ? message.cache_read_tokens.toLocaleString() : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                              {message.cache_creation_tokens > 0 ? message.cache_creation_tokens.toLocaleString() : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                              {message.total_tokens.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                              ${message.estimated_cost_usd.toFixed(4)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">Total</td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                            {data.summary.total_input_tokens.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                            {data.summary.total_output_tokens.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-gray-600 dark:text-gray-400">
                            {data.summary.total_cache_read_tokens > 0 ? data.summary.total_cache_read_tokens.toLocaleString() : '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-gray-600 dark:text-gray-400">
                            {data.summary.total_cache_creation_tokens > 0 ? data.summary.total_cache_creation_tokens.toLocaleString() : '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                            {data.metadata.total_tokens.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                            ${data.metadata.total_cost.toFixed(4)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>

              {/* Tool Executions Section */}
              {data.tool_executions.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Tool Executions ({data.tool_executions.length})
                  </h3>

                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tool Name</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Execution Time</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {data.tool_executions.map((tool) => (
                            <tr key={tool.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-4 py-3">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {tool.tool_name}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                                {tool.execution_time_ms ? `${tool.execution_time_ms}ms` : '-'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {tool.success ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    Success
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    Failed
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {tool.error_message ? (
                                  <p className="text-sm text-red-600 dark:text-red-400">{tool.error_message}</p>
                                ) : tool.tool_output_summary ? (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs">
                                    {tool.tool_output_summary}
                                  </p>
                                ) : (
                                  <span className="text-sm text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
