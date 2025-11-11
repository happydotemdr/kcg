/**
 * Date Range Selector Component
 * Provides preset date ranges and custom date picker
 */

import React, { useState } from 'react';
import { getPresetDateRange, formatDateRange, dateToISOString, type DateRange } from '../../lib/usage-date-utils';

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export default function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const [showCustom, setShowCustom] = useState(value.preset === 'custom');

  const presets = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'last_7_days', label: 'Last 7 days' },
    { id: 'last_30_days', label: 'Last 30 days' },
    { id: 'this_month', label: 'This month' },
    { id: 'last_month', label: 'Last month' },
    { id: 'custom', label: 'Custom range' }
  ];

  const handlePresetClick = (presetId: string) => {
    if (presetId === 'custom') {
      setShowCustom(true);
      return;
    }

    const range = getPresetDateRange(presetId as any);
    onChange(range);
    setShowCustom(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {presets.map(preset => (
          <button
            key={preset.id}
            onClick={() => handlePresetClick(preset.id)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${value.preset === preset.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }
            `}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Current Range Display & Custom Inputs */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
          {formatDateRange(value.start, value.end)}
        </div>

        {/* Custom Date Inputs */}
        {showCustom && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateToISOString(value.start)}
              onChange={(e) => onChange({
                start: new Date(e.target.value + 'T00:00:00'),
                end: value.end,
                preset: 'custom'
              })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            <span className="text-gray-500 dark:text-gray-400">to</span>
            <input
              type="date"
              value={dateToISOString(value.end)}
              onChange={(e) => onChange({
                start: value.start,
                end: new Date(e.target.value + 'T23:59:59'),
                preset: 'custom'
              })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
        )}
      </div>
    </div>
  );
}
