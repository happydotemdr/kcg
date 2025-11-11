/**
 * Model Distribution Chart Component
 * Displays cost distribution across different Claude models using a donut chart
 */

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { ModelsResponse } from '../../lib/api/usage-api';

// ============================================================================
// Types
// ============================================================================

interface ModelDistributionChartProps {
  data: ModelsResponse;
}

interface ChartDataPoint {
  name: string;
  value: number;
  percentage: number;
  calls: number;
  color: string;
  originalModel: string;
  [key: string]: string | number; // Index signature for Recharts compatibility
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Color mapping for different Claude models
 */
const MODEL_COLORS: Record<string, string> = {
  'claude-sonnet-4-20250514': '#3B82F6',        // Blue
  'claude-3-5-sonnet-20241022': '#8B5CF6',      // Purple
  'claude-3-5-haiku-20241022': '#10B981',       // Green
  'claude-opus-4-20250514': '#F59E0B',          // Orange
};

/**
 * Default color for unknown models
 */
const DEFAULT_COLOR = '#6B7280';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert technical model name to user-friendly display name
 */
function formatModelName(model: string): string {
  const modelMap: Record<string, string> = {
    'claude-sonnet-4-20250514': 'Claude Sonnet 4',
    'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
    'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku',
    'claude-opus-4-20250514': 'Claude Opus 4',
  };

  return modelMap[model] || model;
}

/**
 * Format currency value
 */
function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

/**
 * Format percentage value
 */
function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

// ============================================================================
// Custom Tooltip Component
// ============================================================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataPoint;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
      <p className="font-semibold text-gray-900 dark:text-white mb-2">
        {data.name}
      </p>
      <div className="space-y-1 text-sm">
        <p className="text-gray-600 dark:text-gray-400">
          Cost: <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(data.value)}</span>
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          Percentage: <span className="font-medium text-gray-900 dark:text-white">{formatPercentage(data.percentage)}</span>
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          API Calls: <span className="font-medium text-gray-900 dark:text-white">{data.calls.toLocaleString()}</span>
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Custom Legend Component
// ============================================================================

interface CustomLegendProps {
  payload?: Array<{
    value: string;
    color: string;
    payload: ChartDataPoint;
  }>;
}

function CustomLegend({ payload }: CustomLegendProps) {
  if (!payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {payload.map((entry, index) => {
        const data = entry.payload;
        return (
          <div key={`legend-${index}`} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: data.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 dark:text-white truncate">
                {data.name}
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                {formatCurrency(data.value)} ({formatPercentage(data.percentage)})
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                {data.calls.toLocaleString()} calls
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ModelDistributionChart({ data }: ModelDistributionChartProps) {
  // Prepare chart data
  const chartData: ChartDataPoint[] = data.models.map(model => ({
    name: formatModelName(model.model),
    value: model.total_cost,
    percentage: model.percentage_of_total_cost,
    calls: model.api_calls_count,
    color: MODEL_COLORS[model.model] || DEFAULT_COLOR,
    originalModel: model.model
  }));

  // Empty state
  if (chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-100 dark:border-gray-700 p-6 shadow-md hover:shadow-lg transition-all duration-150">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Cost by Model
        </h3>
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          No model usage data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-100 dark:border-gray-700 p-6 shadow-md hover:shadow-lg transition-all duration-150">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        Cost by Model
      </h3>

      <div className="flex flex-col lg:flex-row items-center gap-8">
        {/* Chart */}
        <div className="w-full lg:w-2/3">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Center label overlay */}
          <div className="relative -mt-[200px] mb-[100px] flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(data.summary.total_cost)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Total Cost
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="w-full lg:w-1/3">
          <CustomLegend payload={chartData.map(item => ({
            value: item.name,
            color: item.color,
            payload: item
          }))} />
        </div>
      </div>

      {/* Summary Stats */}
      {data.summary.most_expensive_model && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Most Expensive: </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatModelName(data.summary.most_expensive_model)}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Total Models: </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {data.summary.total_models_used}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
