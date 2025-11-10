/**
 * POST /api/gmail/search
 * Search emails with advanced filtering
 */

import type { APIRoute } from 'astro';
import { findGmailAccountsByUserId } from '../../../lib/db/repositories/gmail-accounts';
import { emailSearchEngine } from '../../../lib/email-search-engine';
import type { EmailSearchParams } from '../../../lib/email-search-engine';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check authentication
    const { userId } = locals.auth();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get search parameters
    const searchParams = await request.json() as Partial<EmailSearchParams>;

    // Validate account ownership
    const accounts = await findGmailAccountsByUserId(userId);

    let accountId = searchParams.accountId;

    if (!accountId) {
      // Use first account if not specified
      if (accounts.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No Gmail accounts connected' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      accountId = accounts[0].id;
    } else {
      // Verify account ownership
      const hasAccess = accounts.some(a => a.id === accountId);
      if (!hasAccess) {
        return new Response(
          JSON.stringify({ error: 'Gmail account not found or unauthorized' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('[Gmail Search] Searching emails with params:', {
      accountId: accountId.substring(0, 8) + '...',
      ...searchParams,
    });

    // Perform search
    const result = await emailSearchEngine.search({
      ...searchParams,
      accountId,
    } as EmailSearchParams);

    console.log(`[Gmail Search] Found ${result.emails.length} emails`);

    return new Response(
      JSON.stringify({
        success: true,
        emails: result.emails,
        nextPageToken: result.nextPageToken,
        query: result.query,
        count: result.emails.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Gmail Search] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to search emails',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
