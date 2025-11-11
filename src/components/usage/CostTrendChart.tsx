import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface CostTrendChartProps {
  data: Array<{
    period: string;
    cost: number;
    tokens: number;
    api_calls: number;
  }>;
  groupBy: 'day' | 'week' | 'month';
}

interface ChartDataPoint {
  date: string;
  cost: number;
  tokens: number;
  api_calls: number;
}

/**
 * Format date based on grouping period
 */
function formatDate(dateString: string, groupBy: 'day' | 'week' | 'month'): string {
  const date = new Date(dateString);

  switch (groupBy) {
    case 'day':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'week':
      return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    case 'month':
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    default:
      return dateString;
  }
}

/**
 * Format large numbers with K/M abbreviations
 */
function formatTokens(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * Format cost as currency
 */
function formatCost(value: number): string {
  return `$${value.toFixed(2)}`;
}

/**
 * Custom tooltip component
 */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-3">
      <p className="font-semibold text-gray-900 dark:text-white mb-2">{label}</p>
      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-gray-700 dark:text-gray-300">
            Cost: <span className="font-semibold">{formatCost(payload[0]?.value || 0)}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-gray-700 dark:text-gray-300">
            Tokens: <span className="font-semibold">{(payload[1]?.value || 0).toLocaleString()}</span>
          </span>
        </div>
        <div className="text-gray-600 dark:text-gray-400">
          API Calls: <span className="font-semibold">{payload[0]?.payload?.api_calls || 0}</span>
        </div>
      </div>
    </div>
  );
}

export default function CostTrendChart({ data, groupBy }: CostTrendChartProps) {
  // Empty state - check before transforming data
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-100 dark:border-gray-700 p-6 shadow-md hover:shadow-lg transition-all duration-150">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Cost & Token Trends
        </h3>
        <div className="flex items-center justify-center h-[350px] text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p className="mt-2 text-sm">No usage data for selected period</p>
          </div>
        </div>
      </div>
    );
  }

  // Transform data for chart
  const chartData: ChartDataPoint[] = data.map(item => ({
    date: formatDate(item.period, groupBy),
    cost: item.cost,
    tokens: item.tokens,
    api_calls: item.api_calls,
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-100 dark:border-gray-700 p-6 shadow-md hover:shadow-lg transition-all duration-150">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Cost & Token Trends
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-gray-200 dark:stroke-gray-700"
          />
          <XAxis
            dataKey="date"
            tick={{ fill: 'currentColor' }}
            className="text-gray-600 dark:text-gray-400 text-sm"
            tickLine={{ stroke: 'currentColor' }}
            axisLine={{ stroke: 'currentColor' }}
          />
          <YAxis
            yAxisId="left"
            orientation="left"
            tickFormatter={formatCost}
            tick={{ fill: 'currentColor' }}
            className="text-gray-600 dark:text-gray-400 text-sm"
            tickLine={{ stroke: 'currentColor' }}
            axisLine={{ stroke: 'currentColor' }}
            label={{
              value: 'Cost (USD)',
              angle: -90,
              position: 'insideLeft',
              className: 'fill-gray-600 dark:fill-gray-400',
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={formatTokens}
            tick={{ fill: 'currentColor' }}
            className="text-gray-600 dark:text-gray-400 text-sm"
            tickLine={{ stroke: 'currentColor' }}
            axisLine={{ stroke: 'currentColor' }}
            label={{
              value: 'Tokens',
              angle: 90,
              position: 'insideRight',
              className: 'fill-gray-600 dark:fill-gray-400',
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{
              paddingTop: '20px',
            }}
            iconType="line"
            formatter={(value) => (
              <span className="text-gray-700 dark:text-gray-300">{value}</span>
            )}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="cost"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={{ fill: '#3B82F6', r: 4 }}
            activeDot={{ r: 6 }}
            name="Cost"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="tokens"
            stroke="#10B981"
            strokeWidth={2}
            dot={{ fill: '#10B981', r: 4 }}
            activeDot={{ r: 6 }}
            name="Tokens"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
