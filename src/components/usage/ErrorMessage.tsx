/**
 * Error Message Component
 * Displays error state with optional retry button
 */

interface ErrorMessageProps {
  error: Error;
  onRetry?: () => void;
}

export default function ErrorMessage({ error, onRetry }: ErrorMessageProps) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-6 w-6 text-red-600 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
            Error loading data
          </h3>
          <p className="mt-2 text-sm text-red-700 dark:text-red-300">
            {error.message}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 text-sm font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 focus:outline-none focus:underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
