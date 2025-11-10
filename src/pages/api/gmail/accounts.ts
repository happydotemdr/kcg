/**
 * GET /api/gmail/accounts
 * List all Gmail accounts for the authenticated user
 */

import type { APIRoute } from 'astro';
import { findGmailAccountsByUserId } from '../../../lib/db/repositories/gmail-accounts';
import { countEmailsByAccountId } from '../../../lib/db/repositories/email-metadata';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  try {
    // Check authentication
    const { userId } = locals.auth();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get all Gmail accounts for user
    const accounts = await findGmailAccountsByUserId(userId);

    console.log(`[Gmail Accounts] Found ${accounts.length} accounts for user ${userId}`);

    // Get email counts for each account
    const accountsWithCounts = await Promise.all(
      accounts.map(async (account) => {
        const emailCount = await countEmailsByAccountId(account.id);
        return {
          id: account.id,
          email: account.email,
          accountType: account.account_type,
          syncSettings: account.sync_settings,
          lastSynced: account.last_synced_at,
          emailCount,
          createdAt: account.created_at,
        };
      })
    );

    return new Response(
      JSON.stringify({
        success: true,
        accounts: accountsWithCounts,
        count: accountsWithCounts.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Gmail Accounts] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch Gmail accounts',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
