/**
 * GET /api/auth/gmail/status
 * Check if user has connected their Gmail account
 */

import type { APIRoute } from 'astro';
import { findGmailAccountsByUserId, isGmailTokenExpired } from '../../../../lib/db/repositories/gmail-accounts';

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

    // Find all Gmail accounts for user
    const accounts = await findGmailAccountsByUserId(userId);

    if (accounts.length === 0) {
      return new Response(
        JSON.stringify({
          connected: false,
          accounts: [],
          message: 'No Gmail accounts connected',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check token expiration for each account
    const accountsWithStatus = accounts.map(account => ({
      id: account.id,
      email: account.email,
      accountType: account.account_type,
      connected: !isGmailTokenExpired(account),
      lastSynced: account.last_synced_at,
      syncSettings: account.sync_settings,
    }));

    const allConnected = accountsWithStatus.every(a => a.connected);

    return new Response(
      JSON.stringify({
        connected: allConnected,
        accounts: accountsWithStatus,
        message: allConnected ? 'All Gmail accounts connected' : 'Some accounts need reconnection',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Gmail Status] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to check Gmail connection status',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
