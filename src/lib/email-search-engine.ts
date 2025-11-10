/**
 * Email Search Engine
 * Advanced search capabilities for Gmail with multi-dimensional filtering
 */

import { gmailAgent } from './gmail-agent';
import type { ProcessedEmail } from './gmail-agent';

/**
 * Email Search Parameters
 * Comprehensive search filters for Gmail
 */
export interface EmailSearchParams {
  // Account selection
  accountId: string;

  // Basic filters
  from?: string | string[];
  to?: string;
  domain?: string; // e.g., "@school.edu"
  subject?: string;
  body?: string;

  // Date range
  dateRange?: {
    start: Date;
    end: Date;
  };

  // Attachments
  hasAttachment?: boolean;

  // Gmail-specific
  isUnread?: boolean;
  isStarred?: boolean;
  labels?: string[];

  // Smart categories
  category?: 'calendar' | 'permission_slip' | 'invoice' | 'announcement' | 'receipt' | 'newsletter';
  importance?: 'critical' | 'high' | 'medium' | 'low';

  // Thread support
  includeThreads?: boolean;

  // Pagination
  maxResults?: number;
  pageToken?: string;
}

/**
 * Email Search Engine
 */
export class EmailSearchEngine {
  /**
   * Search emails with comprehensive filtering
   */
  async search(params: EmailSearchParams): Promise<{
    emails: ProcessedEmail[];
    nextPageToken?: string;
    query: string;
  }> {
    console.log('[EmailSearchEngine] Starting search with params:', {
      ...params,
      accountId: params.accountId.substring(0, 8) + '...',
    });

    // Build Gmail query string
    const query = this.buildGmailQuery(params);
    console.log('[EmailSearchEngine] Generated Gmail query:', query);

    // Fetch emails using GmailAgent
    const result = await gmailAgent.fetchEmails({
      accountId: params.accountId,
      query,
      maxResults: params.maxResults || 50,
      pageToken: params.pageToken,
    });

    console.log(`[EmailSearchEngine] Found ${result.emails.length} emails`);

    return {
      ...result,
      query,
    };
  }

  /**
   * Build Gmail query string from search parameters
   * Uses Gmail's powerful search syntax
   */
  buildGmailQuery(params: EmailSearchParams): string {
    const parts: string[] = [];

    // From filter (can be single or multiple)
    if (params.from) {
      const froms = Array.isArray(params.from) ? params.from : [params.from];
      if (froms.length === 1) {
        parts.push(`from:${froms[0]}`);
      } else {
        parts.push(`(${froms.map(f => `from:${f}`).join(' OR ')})`);
      }
    }

    // To filter
    if (params.to) {
      parts.push(`to:${params.to}`);
    }

    // Domain filter (emails from specific domain)
    if (params.domain) {
      parts.push(`from:${params.domain}`);
    }

    // Subject filter
    if (params.subject) {
      parts.push(`subject:"${params.subject}"`);
    }

    // Body filter (full-text search)
    if (params.body) {
      parts.push(`"${params.body}"`);
    }

    // Date range filter
    if (params.dateRange) {
      parts.push(`after:${this.formatDate(params.dateRange.start)}`);
      parts.push(`before:${this.formatDate(params.dateRange.end)}`);
    }

    // Attachment filter
    if (params.hasAttachment) {
      parts.push('has:attachment');
    }

    // Unread filter
    if (params.isUnread) {
      parts.push('is:unread');
    }

    // Starred filter
    if (params.isStarred) {
      parts.push('is:starred');
    }

    // Labels filter
    if (params.labels && params.labels.length > 0) {
      params.labels.forEach(label => {
        parts.push(`label:${label}`);
      });
    }

    // Smart category filter
    if (params.category) {
      const categoryQuery = this.getCategoryQuery(params.category);
      if (categoryQuery) {
        parts.push(categoryQuery);
      }
    }

    // Importance filter (mapped to Gmail priority/important)
    if (params.importance) {
      const importanceQuery = this.getImportanceQuery(params.importance);
      if (importanceQuery) {
        parts.push(importanceQuery);
      }
    }

    // If no filters provided, default to inbox
    if (parts.length === 0) {
      return 'in:inbox';
    }

    return parts.join(' ');
  }

  /**
   * Get Gmail query for specific category
   */
  private getCategoryQuery(category: string): string {
    const categoryMappings: Record<string, string> = {
      calendar: '(subject:calendar OR subject:schedule OR subject:event OR subject:meeting OR from:calendar)',
      permission_slip: '(subject:permission OR subject:consent OR subject:"field trip" OR subject:authorization)',
      invoice: '(subject:invoice OR subject:bill OR subject:"payment due" OR subject:receipt)',
      announcement: '(subject:announcement OR subject:update OR subject:notice OR subject:reminder)',
      receipt: '(subject:receipt OR subject:"order confirmation" OR subject:purchase)',
      newsletter: '(subject:newsletter OR subject:digest OR list:)',
    };

    return categoryMappings[category] || '';
  }

  /**
   * Get Gmail query for importance level
   */
  private getImportanceQuery(importance: string): string {
    const importanceMappings: Record<string, string> = {
      critical: 'is:important is:starred',
      high: 'is:important',
      medium: '', // No specific filter
      low: '-is:important',
    };

    return importanceMappings[importance] || '';
  }

  /**
   * Format date for Gmail query (YYYY/MM/DD)
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  /**
   * Quick search by sender domain
   */
  async searchByDomain(accountId: string, domain: string, maxResults?: number): Promise<ProcessedEmail[]> {
    const result = await this.search({
      accountId,
      domain,
      maxResults,
    });
    return result.emails;
  }

  /**
   * Search unread emails
   */
  async searchUnread(accountId: string, maxResults?: number): Promise<ProcessedEmail[]> {
    const result = await this.search({
      accountId,
      isUnread: true,
      maxResults,
    });
    return result.emails;
  }

  /**
   * Search important/starred emails
   */
  async searchImportant(accountId: string, maxResults?: number): Promise<ProcessedEmail[]> {
    const result = await this.search({
      accountId,
      isStarred: true,
      maxResults,
    });
    return result.emails;
  }

  /**
   * Search emails with attachments
   */
  async searchWithAttachments(accountId: string, maxResults?: number): Promise<ProcessedEmail[]> {
    const result = await this.search({
      accountId,
      hasAttachment: true,
      maxResults,
    });
    return result.emails;
  }

  /**
   * Search emails in date range
   */
  async searchByDateRange(
    accountId: string,
    start: Date,
    end: Date,
    maxResults?: number
  ): Promise<ProcessedEmail[]> {
    const result = await this.search({
      accountId,
      dateRange: { start, end },
      maxResults,
    });
    return result.emails;
  }

  /**
   * Search recent emails (last N days)
   */
  async searchRecent(accountId: string, days: number = 7, maxResults?: number): Promise<ProcessedEmail[]> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    return this.searchByDateRange(accountId, start, end, maxResults);
  }

  /**
   * Search by category
   */
  async searchByCategory(
    accountId: string,
    category: 'calendar' | 'permission_slip' | 'invoice' | 'announcement' | 'receipt' | 'newsletter',
    maxResults?: number
  ): Promise<ProcessedEmail[]> {
    const result = await this.search({
      accountId,
      category,
      maxResults,
    });
    return result.emails;
  }

  /**
   * Multi-sender search
   */
  async searchFromSenders(
    accountId: string,
    senders: string[],
    maxResults?: number
  ): Promise<ProcessedEmail[]> {
    const result = await this.search({
      accountId,
      from: senders,
      maxResults,
    });
    return result.emails;
  }

  /**
   * Advanced search with custom Gmail query
   */
  async customSearch(accountId: string, gmailQuery: string, maxResults?: number): Promise<ProcessedEmail[]> {
    const result = await gmailAgent.fetchEmails({
      accountId,
      query: gmailQuery,
      maxResults: maxResults || 50,
    });
    return result.emails;
  }

  /**
   * Full-text search across subject and body
   */
  async fullTextSearch(accountId: string, searchText: string, maxResults?: number): Promise<ProcessedEmail[]> {
    const result = await this.search({
      accountId,
      body: searchText,
      maxResults,
    });
    return result.emails;
  }
}

// Export singleton instance
export const emailSearchEngine = new EmailSearchEngine();

/**
 * Helper: Build Gmail query for common scenarios
 */
export const GmailQueryBuilder = {
  /**
   * School-related emails
   */
  school: (domains: string[] = []) => {
    const domainQuery = domains.length > 0 ? domains.map(d => `from:${d}`).join(' OR ') : '';
    const keywords = 'subject:(school OR teacher OR class OR homework OR assignment)';
    return domainQuery ? `(${domainQuery}) OR (${keywords})` : keywords;
  },

  /**
   * Bills and invoices
   */
  bills: () => 'subject:(invoice OR bill OR payment OR due OR statement)',

  /**
   * Travel confirmations
   */
  travel: () => 'subject:(flight OR hotel OR booking OR confirmation OR itinerary)',

  /**
   * Shopping receipts
   */
  receipts: () => 'subject:(receipt OR order OR purchase OR confirmation) has:attachment',

  /**
   * Family calendar events
   */
  familyEvents: () => 'subject:(event OR appointment OR reminder OR schedule OR calendar)',

  /**
   * Work-related (common work domains)
   */
  work: (workDomains: string[] = []) => {
    const keywords = 'subject:(meeting OR project OR deadline OR review OR urgent)';
    if (workDomains.length > 0) {
      const domainQuery = workDomains.map(d => `from:${d}`).join(' OR ');
      return `(${domainQuery}) AND (${keywords})`;
    }
    return keywords;
  },

  /**
   * Newsletters (bulk emails)
   */
  newsletters: () => 'list: OR (subject:newsletter OR subject:digest)',

  /**
   * Action required emails
   */
  actionRequired: () => 'subject:(action required OR urgent OR important OR asap OR deadline)',
};
