/**
 * POST /api/auth/gmail/disconnect
 * Disconnect Gmail account and remove tokens
 */

import type { APIRoute } from 'astro';
import {
  deleteGmailAccountByUserIdAndEmail,
  findGmailAccountsByUserId,
} from '../../../../lib/db/repositories/gmail-accounts';
import { deleteEmailsByAccountId } from '../../../../lib/db/repositories/email-metadata';
import { deleteLogsByAccountId } from '../../../../lib/db/repositories/email-processing-log';

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

    // Get email from request body (optional - if not provided, disconnect all)
    const body = await request.json().catch(() => ({}));
    const email = body.email;

    if (email) {
      // Disconnect specific account
      console.log(`[Gmail Disconnect] Disconnecting account ${email} for user ${userId}`);

      // Find account to get ID for cascading deletes
      const accounts = await findGmailAccountsByUserId(userId);
      const account = accounts.find(a => a.email === email);

      if (account) {
        // Delete associated data first
        await deleteEmailsByAccountId(account.id);
        await deleteLogsByAccountId(account.id);

        // Delete account
        const deleted = await deleteGmailAccountByUserIdAndEmail(userId, email);

        if (!deleted) {
          return new Response(
            JSON.stringify({ error: 'Gmail account not found' }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[Gmail Disconnect] Successfully disconnected ${email}`);

        return new Response(
          JSON.stringify({
            success: true,
            message: `Gmail account ${email} disconnected successfully`,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } else {
        return new Response(
          JSON.stringify({ error: 'Gmail account not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Disconnect all accounts
      console.log(`[Gmail Disconnect] Disconnecting all accounts for user ${userId}`);

      const accounts = await findGmailAccountsByUserId(userId);

      for (const account of accounts) {
        await deleteEmailsByAccountId(account.id);
        await deleteLogsByAccountId(account.id);
        await deleteGmailAccountByUserIdAndEmail(userId, account.email);
      }

      console.log(`[Gmail Disconnect] Successfully disconnected ${accounts.length} account(s)`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Successfully disconnected ${accounts.length} Gmail account(s)`,
          count: accounts.length,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[Gmail Disconnect] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to disconnect Gmail account',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
