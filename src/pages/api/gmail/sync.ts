/**
 * POST /api/gmail/sync
 * Sync and process emails for a Gmail account
 */

import type { APIRoute } from 'astro';
import { findGmailAccountsByUserId } from '../../../lib/db/repositories/gmail-accounts';
import { emailProcessor } from '../../../lib/email-processor';

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

    // Get request body
    const body = await request.json().catch(() => ({}));
    const { accountId, maxEmails } = body;

    // Validate account ownership
    const accounts = await findGmailAccountsByUserId(userId);

    let targetAccount;
    if (accountId) {
      // Sync specific account
      targetAccount = accounts.find(a => a.id === accountId);
      if (!targetAccount) {
        return new Response(
          JSON.stringify({ error: 'Gmail account not found or unauthorized' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Sync first account if no specific account provided
      if (accounts.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No Gmail accounts connected' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      targetAccount = accounts[0];
    }

    console.log(`[Gmail Sync] Starting sync for account ${targetAccount.email}`);

    // Sync and process emails
    const result = await emailProcessor.syncAccount(
      targetAccount.id,
      maxEmails || 50
    );

    console.log(`[Gmail Sync] Completed: synced=${result.synced}, processed=${result.processed}`);

    return new Response(
      JSON.stringify({
        success: true,
        accountId: targetAccount.id,
        accountEmail: targetAccount.email,
        synced: result.synced,
        processed: result.processed,
        errors: result.errors,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Gmail Sync] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to sync emails',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
