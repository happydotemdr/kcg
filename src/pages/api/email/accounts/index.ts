/**
 * POST /api/email/accounts
 * Create a gmail_accounts record after OAuth connection
 */

import type { APIRoute } from 'astro';
import { findUserByClerkId } from '../../../../lib/db/repositories/users';
import { findTokenByUserId } from '../../../../lib/db/repositories/google-oauth';
import { upsertGmailAccount } from '../../../../lib/db/repositories/gmail-accounts';
import type { GmailAccountType } from '../../../../lib/db/types';

export const prerender = false;

export const POST: APIRoute = async ({ locals, request }) => {
  // 1. Auth check
  const auth = await locals.auth();
  if (!auth.userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // 2. Parse and validate input
    const body = await request.json();
    const { email, accountType } = body;

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!accountType || !['family', 'personal', 'work', 'school', 'kids'].includes(accountType)) {
      return new Response(
        JSON.stringify({ error: 'Valid accountType is required (family, personal, work, school, or kids)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Get user UUID from Clerk ID
    const user = await findUserByClerkId(auth.userId);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Verify OAuth token exists for this user with matching email
    const oauthToken = await findTokenByUserId(user.id, email);
    if (!oauthToken) {
      return new Response(
        JSON.stringify({
          error: 'OAuth token not found for this email. Please connect your Google account first.'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Create gmail_accounts record
    const account = await upsertGmailAccount({
      user_id: auth.userId, // Repository converts Clerk ID to UUID internally
      email,
      account_type: accountType as GmailAccountType,
      google_account_email: email,
      sync_settings: {
        autoSync: false,
        syncFrequency: 'hourly',
        lookbackPeriod: 30,
        categories: []
      }
    });

    // 6. Return created account
    return new Response(
      JSON.stringify({
        success: true,
        account: {
          id: account.id,
          email: account.email,
          accountType: account.account_type
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error creating Gmail account:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
