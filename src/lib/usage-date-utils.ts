/**
 * Date Utilities for Usage Dashboard
 * Handles date range presets and formatting
 */

export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
  preset: DateRangePreset;
}

/**
 * Get date range for a given preset
 */
export function getPresetDateRange(preset: DateRangePreset): DateRange {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  // Reset to start of day
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  switch (preset) {
    case 'today':
      return { start, end, preset };

    case 'yesterday':
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      return { start, end, preset };

    case 'last_7_days':
      start.setDate(start.getDate() - 7);
      return { start, end, preset };

    case 'last_30_days':
      start.setDate(start.getDate() - 30);
      return { start, end, preset };

    case 'this_month':
      start.setDate(1);
      return { start, end, preset };

    case 'last_month':
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
      end.setDate(0); // Last day of previous month
      return { start, end, preset };

    default:
      return { start, end, preset: 'custom' };
  }
}

/**
 * Format a date range for display
 */
export function formatDateRange(start: Date, end: Date): string {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const startStr = formatDate(start);
  const endStr = formatDate(end);

  if (startStr === endStr) {
    return startStr;
  }

  return `${startStr} - ${endStr}`;
}

/**
 * Convert date to ISO string (YYYY-MM-DD)
 */
export function dateToISOString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get default start date (30 days ago)
 */
export function getDefaultStartDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Get default end date (today)
 */
export function getDefaultEndDate(): Date {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}
