/**
 * PUT /api/gmail/config/account-type
 * Update account type for a Gmail account
 */

import type { APIRoute } from 'astro';
import {
  findGmailAccountById,
  updateGmailAccountType,
} from '../../../../lib/db/repositories/gmail-accounts';
import { findUserByClerkId } from '../../../../lib/db/repositories/users';
import type { GmailAccountType } from '../../../../lib/db/types';

export const prerender = false;

export const PUT: APIRoute = async ({ locals, request }) => {
  try {
    // Check authentication
    const { userId } = locals.auth();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await request.json();
    const { accountId, accountType } = body;

    // Validate input
    if (!accountId || !accountType) {
      return new Response(
        JSON.stringify({ error: 'accountId and accountType are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate account type
    const validTypes: GmailAccountType[] = ['family', 'personal', 'work', 'school', 'kids'];
    if (!validTypes.includes(accountType)) {
      return new Response(
        JSON.stringify({
          error: `Invalid account type. Must be one of: ${validTypes.join(', ')}`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Convert Clerk ID to UUID for ownership check
    const user = await findUserByClerkId(userId);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify account exists and belongs to user
    const account = await findGmailAccountById(accountId);
    if (!account) {
      return new Response(
        JSON.stringify({ error: 'Gmail account not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Compare UUID to UUID (not Clerk ID to UUID)
    if (account.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: account does not belong to user' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update account type
    const updatedAccount = await updateGmailAccountType(accountId, accountType);

    console.log(`[Gmail Config] Updated account type for ${account.email} to ${accountType}`);

    return new Response(
      JSON.stringify({
        success: true,
        account: {
          id: updatedAccount.id,
          email: updatedAccount.email,
          accountType: updatedAccount.account_type,
          updatedAt: updatedAccount.updated_at,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Gmail Config] Error updating account type:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to update account type',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
