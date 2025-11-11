/**
 * Summary Cards Component
 * Displays 4 key metrics with visual indicators
 */

import React from 'react';

interface SummaryCardsProps {
  data: {
    total_cost: number;
    total_tokens: number;
    total_input_tokens: number;
    total_output_tokens: number;
    api_calls_count: number;
    average_cost_per_call: number;
    average_response_time_ms: number;
  };
}

export default function SummaryCards({ data }: SummaryCardsProps) {
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  const cards = [
    {
      label: 'Total Cost',
      value: `$${data.total_cost.toFixed(2)}`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      secondary: `$${data.average_cost_per_call.toFixed(4)} per call`,
      color: 'text-green-600 dark:text-green-400'
    },
    {
      label: 'Total Tokens',
      value: formatNumber(data.total_tokens),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
        </svg>
      ),
      secondary: `${formatNumber(data.total_input_tokens)} in / ${formatNumber(data.total_output_tokens)} out`,
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      label: 'API Calls',
      value: formatNumber(data.api_calls_count),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      secondary: `${(data.api_calls_count / 30).toFixed(1)} per day avg`,
      color: 'text-purple-600 dark:text-purple-400'
    },
    {
      label: 'Avg Response Time',
      value: `${data.average_response_time_ms.toFixed(0)}ms`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      secondary: `${(data.average_response_time_ms / 1000).toFixed(2)}s average`,
      color: 'text-orange-600 dark:text-orange-400'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow duration-200"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`${card.color}`}>
              {card.icon}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {card.label}
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {card.value}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              {card.secondary}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
