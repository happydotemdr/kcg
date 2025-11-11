/**
 * Skeleton Loader for Summary Cards
 * Matches the 4-card grid layout of SummaryCards
 */

export default function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((index) => (
        <div
          key={index}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
        >
          {/* Icon skeleton */}
          <div className="flex items-center justify-between mb-4">
            <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
          </div>

          {/* Content skeleton */}
          <div className="space-y-2">
            {/* Label */}
            <div className="w-24 h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />

            {/* Value */}
            <div className="w-32 h-9 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />

            {/* Secondary text */}
            <div className="w-28 h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
