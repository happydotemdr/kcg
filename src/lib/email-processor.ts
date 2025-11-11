/**
 * Email Processor
 * Cost-optimized email processing with AI-powered classification
 */

import Anthropic from '@anthropic-ai/sdk';
import { gmailAgent } from './gmail-agent';
import type { ProcessedEmail } from './gmail-agent';
import {
  upsertEmailMetadata,
} from './db/repositories/email-metadata';
import { createProcessingLog } from './db/repositories/email-processing-log';
import type { EmailImportance, ExtractedActions } from './db/types';
import { classifyContact, checkAndAutoVerify } from './email-contact-processor';
import { extractContactFromSignature, extractDomain } from './email-contact-extractor';
import * as emailContactsRepo from './db/repositories/email-contacts';
import * as contactAssocRepo from './db/repositories/email-contact-associations';
import { findGmailAccountById } from './db/repositories/gmail-accounts';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

/**
 * Email Classification Result
 */
export interface EmailClassification {
  category: string[];
  importance: EmailImportance;
  extractedDates: Date[];
  extractedActions: ExtractedActions;
  confidence: number; // 0-1
}

/**
 * Email Processor Configuration
 */
export interface ProcessorConfig {
  batchSize?: number;
  useAI?: boolean;
  storeFullBody?: boolean; // Usually false for cost optimization
}

/**
 * Cost-Optimized Email Processor
 */
export class EmailProcessor {
  private config: Required<ProcessorConfig>;

  constructor(config: ProcessorConfig = {}) {
    this.config = {
      batchSize: config.batchSize || 10,
      useAI: config.useAI !== undefined ? config.useAI : true,
      storeFullBody: config.storeFullBody || false,
    };
  }

  /**
   * Process emails in batches with AI classification
   */
  async processEmails(
    accountId: string,
    emails: ProcessedEmail[]
  ): Promise<{
    processed: number;
    classifications: Map<string, EmailClassification>;
    errors: string[];
  }> {
    const startTime = Date.now();
    console.log(`[EmailProcessor] Processing ${emails.length} emails for account ${accountId}`);

    const classifications = new Map<string, EmailClassification>();
    const errors: string[] = [];
    let processed = 0;

    // Process in batches to manage cost and rate limits
    for (let i = 0; i < emails.length; i += this.config.batchSize) {
      const batch = emails.slice(i, i + this.config.batchSize);
      console.log(`[EmailProcessor] Processing batch ${Math.floor(i / this.config.batchSize) + 1}/${Math.ceil(emails.length / this.config.batchSize)}`);

      try {
        const batchResults = await this.processBatch(accountId, batch);
        batchResults.forEach((classification, emailId) => {
          classifications.set(emailId, classification);
        });
        processed += batch.length;
      } catch (error) {
        console.error('[EmailProcessor] Batch processing error:', error);
        errors.push(`Batch ${i}-${i + this.config.batchSize}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`[EmailProcessor] Processed ${processed}/${emails.length} emails in ${processingTime}ms`);

    // Log processing results
    await createProcessingLog({
      account_id: accountId,
      user_id: accountId, // Will be overridden with actual user ID
      action: 'classify_emails',
      email_ids: emails.map(e => e.id),
      results: {
        totalProcessed: processed,
        totalErrors: errors.length,
        processingTimeMs: processingTime,
      },
      ai_confidence: null,
      user_confirmed: null,
      success: errors.length === 0,
      error_message: errors.length > 0 ? errors.join('; ') : null,
      processing_time_ms: processingTime,
    });

    return {
      processed,
      classifications,
      errors,
    };
  }

  /**
   * Process a batch of emails
   */
  private async processBatch(
    accountId: string,
    emails: ProcessedEmail[]
  ): Promise<Map<string, EmailClassification>> {
    const classifications = new Map<string, EmailClassification>();

    // Quick filter: Use rule-based classification for obvious cases
    const { needsAI, classified } = this.quickFilter(emails);

    classified.forEach((classification, emailId) => {
      classifications.set(emailId, classification);
    });

    console.log(`[EmailProcessor] Quick filtered: ${classified.size} emails, ${needsAI.length} need AI`);

    // AI classification for remaining emails (if enabled)
    if (this.config.useAI && needsAI.length > 0) {
      const aiClassifications = await this.classifyWithAI(accountId, needsAI);
      aiClassifications.forEach((classification, emailId) => {
        classifications.set(emailId, classification);
      });
    } else if (needsAI.length > 0) {
      // Fallback: Use default classification
      needsAI.forEach(email => {
        classifications.set(email.id, this.getDefaultClassification());
      });
    }

    // Store metadata in database
    for (const email of emails) {
      const classification = classifications.get(email.id);
      if (classification) {
        await this.storeEmailMetadata(accountId, email, classification);
      }
    }

    return classifications;
  }

  /**
   * Quick rule-based filtering for obvious classifications
   */
  private quickFilter(emails: ProcessedEmail[]): {
    needsAI: ProcessedEmail[];
    classified: Map<string, EmailClassification>;
  } {
    const needsAI: ProcessedEmail[] = [];
    const classified = new Map<string, EmailClassification>();

    for (const email of emails) {
      const quickClass = this.tryQuickClassification(email);
      if (quickClass) {
        classified.set(email.id, quickClass);
      } else {
        needsAI.push(email);
      }
    }

    return { needsAI, classified };
  }

  /**
   * Try quick rule-based classification
   */
  private tryQuickClassification(email: ProcessedEmail): EmailClassification | null {
    const subject = email.subject.toLowerCase();
    const from = email.from.toLowerCase();

    // Calendar-related
    if (
      subject.includes('calendar') ||
      subject.includes('meeting') ||
      subject.includes('event') ||
      subject.includes('schedule') ||
      from.includes('calendar')
    ) {
      return {
        category: ['calendar'],
        importance: 'high',
        extractedDates: [],
        extractedActions: { actions: ['Check calendar'] },
        confidence: 0.9,
      };
    }

    // Invoices/Bills
    if (
      subject.includes('invoice') ||
      subject.includes('bill') ||
      subject.includes('payment due') ||
      subject.includes('statement')
    ) {
      return {
        category: ['invoice'],
        importance: 'high',
        extractedDates: [],
        extractedActions: { actions: ['Review and pay'] },
        confidence: 0.85,
      };
    }

    // Newsletters (low priority)
    if (
      from.includes('newsletter') ||
      from.includes('no-reply') ||
      from.includes('noreply') ||
      subject.includes('unsubscribe')
    ) {
      return {
        category: ['newsletter'],
        importance: 'low',
        extractedDates: [],
        extractedActions: { actions: [] },
        confidence: 0.8,
      };
    }

    // School-related
    if (
      from.includes('school') ||
      from.includes('.edu') ||
      subject.includes('homework') ||
      subject.includes('assignment')
    ) {
      return {
        category: ['school'],
        importance: 'high',
        extractedDates: [],
        extractedActions: { actions: ['Review with student'] },
        confidence: 0.85,
      };
    }

    return null;
  }

  /**
   * Classify emails using Claude AI
   */
  private async classifyWithAI(
    _accountId: string,
    emails: ProcessedEmail[]
  ): Promise<Map<string, EmailClassification>> {
    console.log(`[EmailProcessor] Classifying ${emails.length} emails with AI`);

    // Prepare email summaries for Claude (to minimize token usage)
    const emailSummaries = emails.map(email => ({
      id: email.id,
      from: email.from,
      subject: email.subject,
      snippet: email.snippet,
      hasAttachments: email.attachments.length > 0,
    }));

    const prompt = `You are an intelligent email classifier for family life optimization. Analyze these emails and provide classifications.

For each email, determine:
1. Category (one or more): calendar, permission_slip, invoice, announcement, receipt, newsletter, school, personal, work
2. Importance: critical, high, medium, low
3. Extracted dates (if any, in ISO format)
4. Extracted actions (if any)

Emails to classify:
${JSON.stringify(emailSummaries, null, 2)}

Respond with a JSON array of classifications, one per email (same order):
[
  {
    "emailId": "...",
    "category": ["category1", "category2"],
    "importance": "high",
    "extractedDates": ["2025-11-15T14:00:00Z"],
    "extractedActions": {
      "actions": ["RSVP by Friday", "Bring permission slip"],
      "deadline": "2025-11-15",
      "priority": "high"
    },
    "confidence": 0.95
  }
]`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = message.content[0];
      if (content.type === 'text') {
        // Strip markdown code blocks if present (```json ... ```)
        let jsonText = content.text.trim();
        const codeBlockMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
        if (codeBlockMatch) {
          jsonText = codeBlockMatch[1].trim();
        }

        const classifications = JSON.parse(jsonText);
        const result = new Map<string, EmailClassification>();

        classifications.forEach((cls: any) => {
          result.set(cls.emailId, {
            category: cls.category || ['general'],
            importance: cls.importance || 'medium',
            extractedDates: (cls.extractedDates || []).map((d: string) => new Date(d)),
            extractedActions: cls.extractedActions || { actions: [] },
            confidence: cls.confidence || 0.7,
          });
        });

        return result;
      }
    } catch (error) {
      console.error('[EmailProcessor] AI classification error:', error);
      // Fallback to default classification
    }

    // Fallback: Return default classifications
    const fallbackMap = new Map<string, EmailClassification>();
    emails.forEach(email => {
      fallbackMap.set(email.id, this.getDefaultClassification());
    });
    return fallbackMap;
  }

  /**
   * Get default classification
   */
  private getDefaultClassification(): EmailClassification {
    return {
      category: ['general'],
      importance: 'medium',
      extractedDates: [],
      extractedActions: { actions: [] },
      confidence: 0.5,
    };
  }

  /**
   * Store email metadata in database
   */
  private async storeEmailMetadata(
    accountId: string,
    email: ProcessedEmail,
    classification: EmailClassification
  ): Promise<void> {
    try {
      const storedEmail = await upsertEmailMetadata({
        account_id: accountId,
        gmail_message_id: email.id,
        gmail_thread_id: email.threadId,
        sender: email.from,
        sender_domain: this.extractDomain(email.from),
        recipients: email.to,
        subject: email.subject,
        sent_date: email.date,
        snippet: email.snippet,
        labels: email.labels,
        category: classification.category,
        importance: classification.importance,
        extracted_dates: classification.extractedDates,
        extracted_actions: classification.extractedActions,
        has_attachments: email.attachments.length > 0,
        attachment_info: email.attachments.map(att => ({
          filename: att.filename,
          size: att.size,
          mimeType: att.mimeType,
          attachmentId: att.attachmentId,
        })),
        last_analyzed_at: new Date(),
        calendar_events_created: [],
      });

      // Extract and classify sender contact (non-blocking)
      await this.extractContactFromEmail(accountId, storedEmail.id, email);
    } catch (error) {
      console.error('[EmailProcessor] Error storing metadata:', error);
      throw error;
    }
  }

  /**
   * Extract contact from email and create association
   */
  private async extractContactFromEmail(
    accountId: string,
    emailMetadataId: string,
    email: ProcessedEmail
  ): Promise<void> {
    try {
      // Check if this email already has contact associations (avoid reprocessing)
      const existingAssociations = await contactAssocRepo.findByEmailId(emailMetadataId);
      if (existingAssociations.length > 0) {
        // Already processed this email's contacts
        return;
      }

      // Get user ID from account
      const account = await findGmailAccountById(accountId);
      if (!account) {
        console.warn(`[EmailProcessor] Account ${accountId} not found for contact extraction`);
        return;
      }

      const userId = account.user_id;

      // Extract sender name from "Name <email>" format
      const fromMatch = email.from.match(/^(.+?)\s*<(.+)>$/);
      const fromEmail = fromMatch ? fromMatch[2].trim() : email.from.trim();
      const fromName = fromMatch ? fromMatch[1].trim() : null;

      // Classify contact using AI
      const classification = await classifyContact(email.snippet, fromEmail, email.subject);

      // Extract additional info from signature
      const signatureInfo = extractContactFromSignature(email.snippet);
      const domain = extractDomain(fromEmail);

      // Upsert contact (increment count if exists)
      const contact = await emailContactsRepo.upsertContact(userId, fromEmail, {
        display_name: fromName || null,
        organization: signatureInfo.organization,
        domain,
        phone_numbers: signatureInfo.phones,
        source_type: classification.sourceType,
        tags: classification.tags,
        confidence_score: classification.confidenceScore,
        extraction_metadata: {
          reasoning: classification.reasoning,
          last_extracted: new Date()
        },
        first_seen: new Date(),
        last_seen: new Date(),
      });

      // Check and auto-verify contact
      const verificationResult = await checkAndAutoVerify(userId, contact.id, contact);
      console.log(`Contact ${contact.email} verification:`, verificationResult);

      // Create association between email and contact
      await contactAssocRepo.createAssociation({
        email_metadata_id: emailMetadataId,
        contact_id: contact.id,
        role: 'sender',
        extraction_confidence: classification.confidenceScore,
      });

      console.log(`[EmailProcessor] Contact extracted: ${fromEmail} (confidence: ${classification.confidenceScore})`);
    } catch (error) {
      // Non-blocking: log error but don't break email processing
      console.error('[EmailProcessor] Contact extraction failed:', error);
    }
  }

  /**
   * Extract domain from email address
   */
  private extractDomain(email: string): string | null {
    const match = email.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    return match ? match[1] : null;
  }

  /**
   * Sync and process new emails for an account
   */
  async syncAccount(accountId: string, maxEmails: number = 50): Promise<{
    synced: number;
    processed: number;
    errors: string[];
  }> {
    console.log(`[EmailProcessor] Starting sync for account ${accountId}`);

    try {
      // Fetch recent emails
      const result = await gmailAgent.fetchEmails({
        accountId,
        query: 'in:inbox',
        maxResults: maxEmails,
      });

      console.log(`[EmailProcessor] Fetched ${result.emails.length} emails`);

      // Process emails
      const processResult = await this.processEmails(accountId, result.emails);

      return {
        synced: result.emails.length,
        processed: processResult.processed,
        errors: processResult.errors,
      };
    } catch (error) {
      console.error('[EmailProcessor] Sync error:', error);
      return {
        synced: 0,
        processed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }
}

// Export singleton instance
export const emailProcessor = new EmailProcessor({
  batchSize: 10,
  useAI: true,
  storeFullBody: false,
});
