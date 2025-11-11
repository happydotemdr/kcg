/**
 * Demo Component for ModelDistributionChart
 * Shows the chart with sample data for testing
 */

import React from 'react';
import ModelDistributionChart from './ModelDistributionChart';
import type { ModelsResponse } from '../../lib/api/usage-api';

const sampleData: ModelsResponse = {
  models: [
    {
      model: 'claude-sonnet-4-20250514',
      api_calls_count: 150,
      total_input_tokens: 75000,
      total_output_tokens: 45000,
      total_cost: 12.50,
      percentage_of_total_cost: 45.5
    },
    {
      model: 'claude-3-5-sonnet-20241022',
      api_calls_count: 200,
      total_input_tokens: 95000,
      total_output_tokens: 52000,
      total_cost: 9.75,
      percentage_of_total_cost: 35.5
    },
    {
      model: 'claude-3-5-haiku-20241022',
      api_calls_count: 300,
      total_input_tokens: 125000,
      total_output_tokens: 68000,
      total_cost: 4.20,
      percentage_of_total_cost: 15.3
    },
    {
      model: 'claude-opus-4-20250514',
      api_calls_count: 50,
      total_input_tokens: 35000,
      total_output_tokens: 22000,
      total_cost: 1.02,
      percentage_of_total_cost: 3.7
    }
  ],
  summary: {
    total_models_used: 4,
    total_cost: 27.47,
    most_expensive_model: 'claude-sonnet-4-20250514',
    most_used_model: 'claude-3-5-haiku-20241022'
  },
  date_range: {
    start_date: '2025-01-01',
    end_date: '2025-01-31'
  }
};

export default function ModelDistributionChartDemo() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Model Distribution Chart Demo
        </h1>

        <ModelDistributionChart data={sampleData} />

        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Component Features:
          </h2>
          <ul className="list-disc list-inside text-blue-800 dark:text-blue-200 space-y-1">
            <li>Interactive donut chart with hover tooltips</li>
            <li>Color-coded model segments</li>
            <li>Detailed legend with cost, percentage, and call counts</li>
            <li>Center label showing total cost</li>
            <li>Summary statistics at the bottom</li>
            <li>Responsive design (stacks on mobile)</li>
            <li>Dark mode support</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
