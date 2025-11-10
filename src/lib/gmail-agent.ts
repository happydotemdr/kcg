/**
 * Gmail Agent Core
 * Handles Gmail API integration with efficient fetching and processing
 */

import { google } from 'googleapis';
import type { gmail_v1 } from 'googleapis';
import {
  findGmailAccountById,
  updateGmailAccountTokens,
  updateLastSyncedAt,
  isGmailTokenExpired,
} from './db/repositories/gmail-accounts';
import type { GmailAccount } from './db/types';

// OAuth2 configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4321/api/auth/gmail/callback';

// Required scopes for Gmail access
export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly', // Read emails
  'https://www.googleapis.com/auth/gmail.compose', // Create drafts
  'https://www.googleapis.com/auth/gmail.modify', // Modify labels
  'https://mail.google.com/', // Full access (for send)
];

/**
 * Create OAuth2 client for Gmail
 */
export function createGmailOAuth2Client() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

/**
 * Generate authorization URL for Gmail
 */
export function getGmailAuthorizationUrl(userId: string): string {
  const oauth2Client = createGmailOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GMAIL_SCOPES,
    prompt: 'consent',
    state: encodeURIComponent(userId), // Pass user ID in state
  });
}

/**
 * Exchange authorization code for Gmail tokens
 */
export async function exchangeGmailCodeForTokens(code: string) {
  const oauth2Client = createGmailOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Get authenticated Gmail client for an account
 */
async function getAuthenticatedGmailClient(accountId: string) {
  const account = await findGmailAccountById(accountId);

  if (!account) {
    throw new Error('Gmail account not found. Please connect your Gmail account first.');
  }

  const oauth2Client = createGmailOAuth2Client();
  oauth2Client.setCredentials({
    access_token: account.gmail_access_token,
    refresh_token: account.gmail_refresh_token,
    token_type: account.gmail_token_type,
    expiry_date: account.gmail_expiry_date,
  });

  // Handle token refresh automatically
  oauth2Client.on('tokens', async (tokens) => {
    // Update tokens in database when refreshed
    if (tokens.access_token) {
      await updateGmailAccountTokens(accountId, {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || account.gmail_refresh_token || undefined,
        token_type: tokens.token_type || undefined,
        expiry_date: tokens.expiry_date || undefined,
        scope: tokens.scope || undefined,
      });
    }
  });

  return oauth2Client;
}

/**
 * Processed Email Interface
 */
export interface ProcessedEmail {
  id: string;
  threadId: string;
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  date: Date;
  snippet: string;
  body: string; // Plain text only
  labels: string[];
  attachments: AttachmentMetadata[];
}

/**
 * Attachment Metadata
 */
export interface AttachmentMetadata {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
}

/**
 * Email Fetch Parameters
 */
export interface FetchEmailsParams {
  accountId: string;
  query?: string; // Gmail search query
  maxResults?: number;
  pageToken?: string;
  labelIds?: string[];
}

/**
 * Gmail Agent Class
 */
export class GmailAgent {
  /**
   * Fetch emails with efficient batching (metadata only initially)
   */
  async fetchEmails(params: FetchEmailsParams): Promise<{
    emails: ProcessedEmail[];
    nextPageToken?: string;
  }> {
    const startTime = Date.now();
    console.log(`[GmailAgent] Fetching emails for account ${params.accountId}`);

    try {
      const auth = await getAuthenticatedGmailClient(params.accountId);
      const gmail = google.gmail({ version: 'v1', auth });

      // Step 1: List message IDs (lightweight)
      const listResponse = await gmail.users.messages.list({
        userId: 'me',
        q: params.query || 'in:inbox',
        maxResults: params.maxResults || 20,
        pageToken: params.pageToken,
        labelIds: params.labelIds,
      });

      const messages = listResponse.data.messages || [];
      console.log(`[GmailAgent] Found ${messages.length} messages`);

      if (messages.length === 0) {
        return { emails: [] };
      }

      // Step 2: Batch fetch message metadata
      const emails = await this.batchFetchMessages(gmail, messages.map(m => m.id!));

      // Update last synced timestamp
      await updateLastSyncedAt(params.accountId);

      const processingTime = Date.now() - startTime;
      console.log(`[GmailAgent] Fetched ${emails.length} emails in ${processingTime}ms`);

      return {
        emails,
        nextPageToken: listResponse.data.nextPageToken || undefined,
      };
    } catch (error) {
      console.error('[GmailAgent] Error fetching emails:', error);
      throw new Error(`Failed to fetch emails: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Batch fetch messages for efficiency
   * Uses Gmail batch API to minimize API calls
   */
  private async batchFetchMessages(
    gmail: gmail_v3.Gmail,
    messageIds: string[]
  ): Promise<ProcessedEmail[]> {
    const batchSize = 50; // Gmail API batch limit
    const batches: string[][] = [];

    // Split into batches
    for (let i = 0; i < messageIds.length; i += batchSize) {
      batches.push(messageIds.slice(i, i + batchSize));
    }

    const allEmails: ProcessedEmail[] = [];

    // Process each batch
    for (const batch of batches) {
      const batchPromises = batch.map(id =>
        gmail.users.messages.get({
          userId: 'me',
          id,
          format: 'metadata', // Crucial: metadata only for cost optimization
          metadataHeaders: ['From', 'To', 'Cc', 'Subject', 'Date'], // Only fetch needed headers
        })
      );

      const responses = await Promise.all(batchPromises);

      // Process responses
      for (const response of responses) {
        try {
          const email = this.processEmailMetadata(response.data);
          allEmails.push(email);
        } catch (error) {
          console.error('[GmailAgent] Error processing email:', error);
          // Continue with other emails
        }
      }
    }

    return allEmails;
  }

  /**
   * Process email metadata into standardized format
   */
  private processEmailMetadata(message: gmail_v1.Schema$Message): ProcessedEmail {
    const headers = message.payload?.headers || [];

    const getHeader = (name: string): string => {
      const header = headers.find((h: gmail_v1.Schema$MessagePartHeader) => h.name?.toLowerCase() === name.toLowerCase());
      return header?.value || '';
    };

    const parseEmailList = (headerValue: string): string[] => {
      if (!headerValue) return [];
      return headerValue.split(',').map(e => e.trim());
    };

    return {
      id: message.id!,
      threadId: message.threadId!,
      from: getHeader('From'),
      to: parseEmailList(getHeader('To')),
      cc: parseEmailList(getHeader('Cc')),
      subject: getHeader('Subject'),
      date: new Date(getHeader('Date') || Date.now()),
      snippet: message.snippet || '',
      body: '', // Will be fetched on-demand
      labels: message.labelIds || [],
      attachments: this.extractAttachmentInfo(message.payload),
    };
  }

  /**
   * Extract attachment metadata without downloading
   */
  private extractAttachmentInfo(payload: gmail_v3.Schema$MessagePart | undefined): AttachmentMetadata[] {
    if (!payload) return [];

    const attachments: AttachmentMetadata[] = [];

    const extractFromPart = (part: gmail_v3.Schema$MessagePart) => {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType || 'application/octet-stream',
          size: part.body.size || 0,
          attachmentId: part.body.attachmentId,
        });
      }

      if (part.parts) {
        part.parts.forEach(extractFromPart);
      }
    };

    extractFromPart(payload);
    return attachments;
  }

  /**
   * Fetch full email body on-demand (plain text only)
   */
  async fetchEmailBody(accountId: string, messageId: string): Promise<string> {
    try {
      const auth = await getAuthenticatedGmailClient(accountId);
      const gmail = google.gmail({ version: 'v1', auth });

      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full', // Now fetch full content
      });

      return this.extractPlainText(response.data.payload);
    } catch (error) {
      console.error('[GmailAgent] Error fetching email body:', error);
      throw new Error(`Failed to fetch email body: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract plain text from email payload (avoid HTML)
   */
  private extractPlainText(payload: gmail_v3.Schema$MessagePart | undefined): string {
    if (!payload) return '';

    // Check if this part is plain text
    if (payload.mimeType === 'text/plain' && payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    // Recursively search for text/plain parts
    if (payload.parts) {
      for (const part of payload.parts) {
        const text = this.extractPlainText(part);
        if (text) return text;
      }
    }

    // Fallback: strip HTML if only HTML available
    if (payload.mimeType === 'text/html' && payload.body?.data) {
      const html = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      return this.stripHtml(html);
    }

    return '';
  }

  /**
   * Strip HTML tags (basic implementation)
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>.*<\/style>/gm, '')
      .replace(/<script[^>]*>.*<\/script>/gm, '')
      .replace(/<[^>]+>/gm, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Get user's Gmail profile info
   */
  async getProfile(accountId: string): Promise<{
    email: string;
    messagesTotal: number;
    threadsTotal: number;
  }> {
    try {
      const auth = await getAuthenticatedGmailClient(accountId);
      const gmail = google.gmail({ version: 'v1', auth });

      const response = await gmail.users.getProfile({
        userId: 'me',
      });

      return {
        email: response.data.emailAddress || '',
        messagesTotal: response.data.messagesTotal || 0,
        threadsTotal: response.data.threadsTotal || 0,
      };
    } catch (error) {
      console.error('[GmailAgent] Error fetching profile:', error);
      throw new Error(`Failed to fetch profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List available labels
   */
  async listLabels(accountId: string): Promise<Array<{ id: string; name: string; type: string }>> {
    try {
      const auth = await getAuthenticatedGmailClient(accountId);
      const gmail = google.gmail({ version: 'v1', auth });

      const response = await gmail.users.labels.list({
        userId: 'me',
      });

      const labels = response.data.labels || [];
      return labels.map(label => ({
        id: label.id!,
        name: label.name!,
        type: label.type!,
      }));
    } catch (error) {
      console.error('[GmailAgent] Error listing labels:', error);
      throw new Error(`Failed to list labels: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if account is connected
   */
  async isConnected(accountId: string): Promise<boolean> {
    try {
      const account = await findGmailAccountById(accountId);
      if (!account) return false;
      if (isGmailTokenExpired(account)) return false;
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const gmailAgent = new GmailAgent();
