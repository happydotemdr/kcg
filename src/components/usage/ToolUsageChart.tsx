import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ToolUsageChartProps {
  data: {
    tools: Array<{
      tool_name: string;
      call_count: number;
      average_execution_time_ms: number;
      success_rate: number;
      estimated_associated_cost: number;
    }>;
    summary: {
      total_tool_calls: number;
      average_success_rate: number;
    };
  };
}

export default function ToolUsageChart({ data }: ToolUsageChartProps) {
  // Format tool names: remove _TOOL suffix and convert to Title Case
  const formatToolName = (name: string): string => {
    const withoutSuffix = name.replace(/_TOOL$/, '');
    const titleCase = withoutSuffix
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');

    // Truncate if longer than 30 characters
    return titleCase.length > 30 ? titleCase.slice(0, 27) + '...' : titleCase;
  };

  // Get bar color based on success rate
  const getBarColor = (successRate: number): string => {
    if (successRate >= 0.95) return '#10B981'; // Green
    if (successRate >= 0.85) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  };

  // Sort tools by call count descending and prepare chart data
  const chartData = data.tools
    .sort((a, b) => b.call_count - a.call_count)
    .map(tool => ({
      name: formatToolName(tool.tool_name),
      fullName: tool.tool_name,
      calls: tool.call_count,
      execTime: tool.average_execution_time_ms,
      successRate: tool.success_rate,
      cost: tool.estimated_associated_cost,
      color: getBarColor(tool.success_rate)
    }));

  // Find most used tool
  const mostUsedTool = chartData.length > 0 ? chartData[0] : null;

  // Calculate chart height based on number of tools
  const chartHeight = Math.min(400, chartData.length * 50);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-sm mb-2">{data.name}</p>
        <div className="space-y-1 text-xs">
          <p className="text-gray-600 dark:text-gray-300">
            Calls: <span className="font-medium text-gray-900 dark:text-white">{data.calls}</span>
          </p>
          <p className="text-gray-600 dark:text-gray-300">
            Avg execution: <span className="font-medium text-gray-900 dark:text-white">{data.execTime.toFixed(0)}ms</span>
          </p>
          <p className="text-gray-600 dark:text-gray-300">
            Success rate: <span className="font-medium text-gray-900 dark:text-white">{(data.successRate * 100).toFixed(1)}%</span>
          </p>
          <p className="text-gray-600 dark:text-gray-300">
            Associated cost: <span className="font-medium text-gray-900 dark:text-white">${data.cost.toFixed(2)}</span>
          </p>
        </div>
      </div>
    );
  };

  // Empty state
  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-100 dark:border-gray-700 p-6 shadow-md hover:shadow-lg transition-all duration-150">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Tool Usage</h3>
        <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
          No tool usage in this period
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-100 dark:border-gray-700 p-6 shadow-md hover:shadow-lg transition-all duration-150">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Tool Usage</h3>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Calls</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {data.summary.total_tool_calls}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Avg Success Rate</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {(data.summary.average_success_rate * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Most Used</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={mostUsedTool?.name}>
            {mostUsedTool?.name}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: chartHeight, maxHeight: 400, overflow: 'auto' }}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 40, left: 120, bottom: 5 }}
          >
            <XAxis type="number" />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12 }}
              width={110}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="calls" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10B981' }}></div>
          <span className="text-gray-600 dark:text-gray-400">≥95% success</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#F59E0B' }}></div>
          <span className="text-gray-600 dark:text-gray-400">85-95% success</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#EF4444' }}></div>
          <span className="text-gray-600 dark:text-gray-400">&lt;85% success</span>
        </div>
      </div>
    </div>
  );
}
