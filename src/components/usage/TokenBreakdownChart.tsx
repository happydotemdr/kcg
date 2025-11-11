import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface TokenBreakdownChartProps {
  data: Array<{
    period: string;
    input_tokens: number;
    output_tokens: number;
    cache_read_tokens: number;
    cache_creation_tokens: number;
  }>;
  groupBy: 'day' | 'week' | 'month';
}

interface ChartDataPoint {
  date: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens: number;
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
            Input: <span className="font-semibold">{(payload[0]?.value || 0).toLocaleString()}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-gray-700 dark:text-gray-300">
            Output: <span className="font-semibold">{(payload[1]?.value || 0).toLocaleString()}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="text-gray-700 dark:text-gray-300">
            Cache Read: <span className="font-semibold">{(payload[2]?.value || 0).toLocaleString()}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-gray-700 dark:text-gray-300">
            Cache Creation: <span className="font-semibold">{(payload[3]?.value || 0).toLocaleString()}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function TokenBreakdownChart({ data, groupBy }: TokenBreakdownChartProps) {
  // Empty state - check before transforming data
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Token Breakdown
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
            <p className="mt-2 text-sm">No token data for selected period</p>
          </div>
        </div>
      </div>
    );
  }

  // Transform data for chart
  const chartData: ChartDataPoint[] = data.map(item => ({
    date: formatDate(item.period, groupBy),
    input_tokens: item.input_tokens,
    output_tokens: item.output_tokens,
    cache_read_tokens: item.cache_read_tokens,
    cache_creation_tokens: item.cache_creation_tokens,
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Token Breakdown
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart
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
            tickFormatter={formatTokens}
            tick={{ fill: 'currentColor' }}
            className="text-gray-600 dark:text-gray-400 text-sm"
            tickLine={{ stroke: 'currentColor' }}
            axisLine={{ stroke: 'currentColor' }}
            label={{
              value: 'Tokens',
              angle: -90,
              position: 'insideLeft',
              className: 'fill-gray-600 dark:fill-gray-400',
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{
              paddingTop: '20px',
            }}
            formatter={(value: string) => (
              <span className="text-gray-700 dark:text-gray-300">
                {value.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </span>
            )}
          />
          <Area
            type="monotone"
            dataKey="input_tokens"
            stackId="1"
            stroke="#3B82F6"
            fill="#3B82F6"
            fillOpacity={0.6}
            name="input_tokens"
          />
          <Area
            type="monotone"
            dataKey="output_tokens"
            stackId="1"
            stroke="#10B981"
            fill="#10B981"
            fillOpacity={0.6}
            name="output_tokens"
          />
          <Area
            type="monotone"
            dataKey="cache_read_tokens"
            stackId="1"
            stroke="#8B5CF6"
            fill="#8B5CF6"
            fillOpacity={0.6}
            name="cache_read_tokens"
          />
          <Area
            type="monotone"
            dataKey="cache_creation_tokens"
            stackId="1"
            stroke="#F97316"
            fill="#F97316"
            fillOpacity={0.6}
            name="cache_creation_tokens"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
