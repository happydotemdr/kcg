/**
 * GET /api/gmail/emails/[id]
 * Get specific email with full body content
 */

import type { APIRoute } from 'astro';
import { findGmailAccountsByUserId } from '../../../../lib/db/repositories/gmail-accounts';
import { findEmailMetadataByGmailId } from '../../../../lib/db/repositories/email-metadata';
import { gmailAgent } from '../../../../lib/gmail-agent';

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // Check authentication
    const { userId } = locals.auth();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const emailId = params.id;

    if (!emailId) {
      return new Response(
        JSON.stringify({ error: 'Email ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Gmail Email] Fetching email ${emailId}`);

    // Find email metadata
    const metadata = await findEmailMetadataByGmailId(emailId);

    if (!metadata) {
      return new Response(
        JSON.stringify({ error: 'Email not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify user owns the account
    const accounts = await findGmailAccountsByUserId(userId);
    const hasAccess = accounts.some(a => a.id === metadata.account_id);

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized access to this email' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Gmail Email] Fetching full body...');

    // Fetch full email body on-demand
    const fullBody = await gmailAgent.fetchEmailBody(metadata.account_id, emailId);

    console.log('[Gmail Email] Successfully fetched email');

    return new Response(
      JSON.stringify({
        success: true,
        email: {
          id: metadata.gmail_message_id,
          threadId: metadata.gmail_thread_id,
          from: metadata.sender,
          to: metadata.recipients,
          subject: metadata.subject,
          date: metadata.sent_date,
          snippet: metadata.snippet,
          body: fullBody,
          labels: metadata.labels,
          category: metadata.category,
          importance: metadata.importance,
          extractedDates: metadata.extracted_dates,
          extractedActions: metadata.extracted_actions,
          hasAttachments: metadata.has_attachments,
          attachments: metadata.attachment_info,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Gmail Email] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch email',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
