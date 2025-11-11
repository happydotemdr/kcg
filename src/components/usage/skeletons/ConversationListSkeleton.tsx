/**
 * Skeleton Loader for Conversation List Table
 * Matches the table structure with header, search, and rows
 */

interface ConversationListSkeletonProps {
  rowCount?: number;
}

export default function ConversationListSkeleton({ rowCount = 10 }: ConversationListSkeletonProps) {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="w-48 h-8 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="w-28 h-10 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
          <div className="w-28 h-10 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
        </div>
      </div>

      {/* Search and filter skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 h-10 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
          <div className="w-64 h-10 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            {/* Table header skeleton */}
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left">
                  <div className="w-12 h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
                </th>
                <th className="px-6 py-3 text-left">
                  <div className="w-16 h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
                </th>
                <th className="px-6 py-3 text-right">
                  <div className="w-12 h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse ml-auto" />
                </th>
                <th className="px-6 py-3 text-right">
                  <div className="w-16 h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse ml-auto" />
                </th>
                <th className="px-6 py-3 text-center">
                  <div className="w-20 h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse mx-auto" />
                </th>
                <th className="px-6 py-3 text-center">
                  <div className="w-16 h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse mx-auto" />
                </th>
              </tr>
            </thead>

            {/* Table body skeleton */}
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {Array.from({ length: rowCount }).map((_, index) => (
                <tr key={index}>
                  {/* Title */}
                  <td className="px-6 py-4">
                    <div className="w-48 h-5 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
                  </td>
                  {/* Date */}
                  <td className="px-6 py-4">
                    <div className="w-32 h-5 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
                  </td>
                  {/* Cost */}
                  <td className="px-6 py-4 text-right">
                    <div className="w-20 h-5 bg-gray-300 dark:bg-gray-600 rounded animate-pulse ml-auto" />
                  </td>
                  {/* Tokens */}
                  <td className="px-6 py-4 text-right">
                    <div className="w-16 h-5 bg-gray-300 dark:bg-gray-600 rounded animate-pulse ml-auto" />
                  </td>
                  {/* Messages */}
                  <td className="px-6 py-4">
                    <div className="w-8 h-5 bg-gray-300 dark:bg-gray-600 rounded animate-pulse mx-auto" />
                  </td>
                  {/* Status */}
                  <td className="px-6 py-4">
                    <div className="w-16 h-6 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse mx-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
