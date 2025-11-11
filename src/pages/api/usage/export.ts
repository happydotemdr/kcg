/**
 * Usage Export API Endpoint
 * Generates downloadable CSV or JSON exports of usage data
 */

import type { APIRoute } from 'astro';
import { findUserByClerkId } from '../../../lib/db/repositories/users';
import {
  getUserUsageSummary,
  getConversationCosts,
  getToolUsageBreakdown,
  getModelUsageBreakdown
} from '../../../lib/db/repositories/claude-usage';

export const prerender = false;

// Maximum export size (10MB)
const MAX_EXPORT_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Parse and validate query parameters
 */
function parseQueryParams(url: URL): {
  startDate: Date;
  endDate: Date;
  format: 'csv' | 'json';
  include: 'all' | 'summary' | 'conversations' | 'tools' | 'models';
} {
  const params = url.searchParams;

  // Parse date range (default to last 30 days)
  const endDate = params.get('end_date')
    ? new Date(params.get('end_date')!)
    : new Date();

  const startDate = params.get('start_date')
    ? new Date(params.get('start_date')!)
    : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Validate dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('Invalid date format. Use ISO 8601 format (YYYY-MM-DD)');
  }

  if (startDate > endDate) {
    throw new Error('start_date must be before end_date');
  }

  // Parse format (default to CSV)
  const format = params.get('format') || 'csv';
  if (format !== 'csv' && format !== 'json') {
    throw new Error('Invalid format. Must be "csv" or "json"');
  }

  // Parse include parameter (default to all)
  const include = params.get('include') || 'all';
  if (!['all', 'summary', 'conversations', 'tools', 'models'].includes(include)) {
    throw new Error('Invalid include parameter. Must be "all", "summary", "conversations", "tools", or "models"');
  }

  return {
    startDate,
    endDate,
    format: format as 'csv' | 'json',
    include: include as 'all' | 'summary' | 'conversations' | 'tools' | 'models'
  };
}

/**
 * Escape CSV value (handle quotes and commas)
 */
function escapeCsv(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Format number with commas (e.g., 1234567 -> 1,234,567)
 */
function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Format currency (e.g., 123.45 -> $123.45)
 */
function formatCurrency(num: number): string {
  return `$${num.toFixed(2)}`;
}

/**
 * Format percentage (e.g., 0.975 -> 97.5%)
 */
function formatPercentage(num: number): string {
  return `${(num * 100).toFixed(1)}%`;
}

/**
 * Format date to ISO 8601 string
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Generate CSV export
 */
async function generateCsv(
  userId: string,
  startDate: Date,
  endDate: Date,
  include: 'all' | 'summary' | 'conversations' | 'tools' | 'models'
): Promise<string> {
  const lines: string[] = [];

  // Generate summary section
  if (include === 'all' || include === 'summary') {
    const summary = await getUserUsageSummary(userId, startDate, endDate);

    lines.push('=== SUMMARY ===');
    lines.push('Metric,Value');
    lines.push(`Date Range,${formatDate(startDate)} to ${formatDate(endDate)}`);
    lines.push(`Total Cost,${formatCurrency(summary.total_cost)}`);
    lines.push(`Total Tokens,${formatNumber(summary.total_tokens)}`);
    lines.push(`API Calls,${formatNumber(summary.api_calls_count)}`);
    lines.push(`Unique Conversations,${formatNumber(summary.unique_conversations)}`);
    lines.push(`Tool Calls,${formatNumber(summary.tool_calls_count)}`);
    lines.push(`Avg Cost Per Call,${formatCurrency(summary.average_cost_per_call)}`);
    lines.push(`Avg Response Time (ms),${summary.average_response_time_ms.toFixed(0)}`);
    lines.push('');

    // Daily breakdown
    if (summary.time_series.length > 0) {
      lines.push('=== DAILY BREAKDOWN ===');
      lines.push('Date,Cost,Tokens,API Calls');
      for (const day of summary.time_series) {
        lines.push(`${day.period},${formatCurrency(day.cost)},${formatNumber(day.tokens)},${day.api_calls}`);
      }
      lines.push('');
    }
  }

  // Generate conversations section
  if (include === 'all' || include === 'conversations') {
    const { conversations } = await getConversationCosts({
      user_id: userId,
      start_date: startDate,
      end_date: endDate,
      sort_by: 'cost',
      sort_order: 'desc',
      limit: 1000, // Get top 1000 conversations
      offset: 0
    });

    if (conversations.length > 0) {
      lines.push('=== CONVERSATIONS ===');
      lines.push('ID,Title,Cost,Tokens,Messages,First Message,Last Message');
      for (const conv of conversations) {
        lines.push([
          escapeCsv(conv.conversation_id),
          escapeCsv(conv.title),
          formatCurrency(conv.total_cost),
          formatNumber(conv.total_tokens),
          conv.message_count,
          conv.first_message_at.toISOString(),
          conv.last_message_at.toISOString()
        ].join(','));
      }
      lines.push('');
    }
  }

  // Generate tools section
  if (include === 'all' || include === 'tools') {
    const tools = await getToolUsageBreakdown(userId, startDate, endDate);

    if (tools.length > 0) {
      lines.push('=== TOOLS ===');
      lines.push('Tool Name,Calls,Avg Execution Time (ms),Success Rate,Estimated Cost');
      for (const tool of tools) {
        lines.push([
          escapeCsv(tool.tool_name),
          tool.call_count,
          tool.average_execution_time_ms.toFixed(0),
          formatPercentage(tool.success_rate),
          formatCurrency(tool.estimated_associated_cost)
        ].join(','));
      }
      lines.push('');
    }
  }

  // Generate models section
  if (include === 'all' || include === 'models') {
    const models = await getModelUsageBreakdown(userId, startDate, endDate);

    if (models.length > 0) {
      lines.push('=== MODELS ===');
      lines.push('Model,API Calls,Input Tokens,Output Tokens,Cost,% of Total');
      for (const model of models) {
        lines.push([
          escapeCsv(model.model),
          formatNumber(model.api_calls_count),
          formatNumber(model.total_input_tokens),
          formatNumber(model.total_output_tokens),
          formatCurrency(model.total_cost),
          formatPercentage(model.percentage_of_total_cost / 100)
        ].join(','));
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Generate JSON export
 */
async function generateJson(
  userId: string,
  startDate: Date,
  endDate: Date,
  include: 'all' | 'summary' | 'conversations' | 'tools' | 'models'
): Promise<object> {
  const result: any = {
    export_info: {
      generated_at: new Date().toISOString(),
      date_range: {
        start_date: formatDate(startDate),
        end_date: formatDate(endDate)
      },
      format: 'json'
    }
  };

  // Include summary
  if (include === 'all' || include === 'summary') {
    result.summary = await getUserUsageSummary(userId, startDate, endDate);
    result.daily_breakdown = result.summary.time_series;
    delete result.summary.time_series; // Move to top level
  }

  // Include conversations
  if (include === 'all' || include === 'conversations') {
    const { conversations, total_count } = await getConversationCosts({
      user_id: userId,
      start_date: startDate,
      end_date: endDate,
      sort_by: 'cost',
      sort_order: 'desc',
      limit: 1000,
      offset: 0
    });
    result.conversations = {
      items: conversations,
      total_count
    };
  }

  // Include tools
  if (include === 'all' || include === 'tools') {
    result.tools = await getToolUsageBreakdown(userId, startDate, endDate);
  }

  // Include models
  if (include === 'all' || include === 'models') {
    result.models = await getModelUsageBreakdown(userId, startDate, endDate);
  }

  return result;
}

/**
 * GET /api/usage/export
 * Export usage data in CSV or JSON format
 */
export const GET: APIRoute = async ({ locals, request }) => {
  try {
    // 1. Authenticate user
    const auth = await locals.auth();
    if (!auth.userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Get database user ID
    const user = await findUserByClerkId(auth.userId);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Parse and validate query parameters
    const url = new URL(request.url);
    const { startDate, endDate, format, include } = parseQueryParams(url);

    // 4. Generate export
    let content: string;
    let contentType: string;
    let filename: string;

    if (format === 'csv') {
      content = await generateCsv(user.id, startDate, endDate, include);
      contentType = 'text/csv; charset=utf-8';
      filename = `usage-export-${formatDate(startDate)}-to-${formatDate(endDate)}.csv`;
    } else {
      const data = await generateJson(user.id, startDate, endDate, include);
      content = JSON.stringify(data, null, 2);
      contentType = 'application/json';
      filename = `usage-export-${formatDate(startDate)}-to-${formatDate(endDate)}.json`;
    }

    // 5. Check export size
    const contentSizeBytes = Buffer.byteLength(content, 'utf-8');
    if (contentSizeBytes > MAX_EXPORT_SIZE_BYTES) {
      return new Response(JSON.stringify({
        error: 'Export too large',
        message: `Export size (${(contentSizeBytes / 1024 / 1024).toFixed(2)} MB) exceeds maximum allowed size (10 MB). Try narrowing the date range or using a more specific include filter.`
      }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 6. Return export with appropriate headers
    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(contentSizeBytes),
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Export error:', error);

    // Handle specific error types
    if (error instanceof Error && error.message.includes('Invalid')) {
      return new Response(JSON.stringify({
        error: 'Bad Request',
        message: error.message
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      error: 'Failed to generate export',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
