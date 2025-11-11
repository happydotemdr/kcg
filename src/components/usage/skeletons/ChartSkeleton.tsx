/**
 * Skeleton Loader for Chart Components
 * Generic skeleton for all chart types
 */

export default function ChartSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      {/* Chart title skeleton */}
      <div className="w-48 h-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse mb-4" />

      {/* Chart area skeleton */}
      <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded animate-pulse flex items-end justify-around p-4 gap-2">
        {/* Simulated bar chart bars with varying heights */}
        {[60, 80, 45, 90, 70, 55, 85].map((height, index) => (
          <div
            key={index}
            className="flex-1 bg-gray-300 dark:bg-gray-600 rounded-t animate-pulse"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  );
}
