/**
 * GET /api/auth/gmail/callback
 * Handles OAuth callback from Google for Gmail
 */

import type { APIRoute } from 'astro';
import { exchangeGmailCodeForTokens, gmailAgent } from '../../../../lib/gmail-agent';
import { upsertGmailAccount } from '../../../../lib/db/repositories/gmail-accounts';

export const prerender = false;

export const GET: APIRoute = async ({ url, redirect }) => {
  try {
    // Get authorization code and state from query params
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // Contains Clerk user ID
    const error = url.searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('[Gmail OAuth] Authorization error:', error);
      return redirect(`/gmail-config?error=${encodeURIComponent(error)}`, 302);
    }

    if (!code) {
      console.error('[Gmail OAuth] No authorization code received');
      return redirect('/gmail-config?error=no_code', 302);
    }

    if (!state) {
      console.error('[Gmail OAuth] No state parameter (user ID) received');
      return redirect('/gmail-config?error=no_state', 302);
    }

    const userId = decodeURIComponent(state);
    console.log(`[Gmail OAuth] Processing callback for user ${userId}`);

    // Exchange code for tokens
    console.log('[Gmail OAuth] Exchanging code for tokens...');
    const tokens = await exchangeGmailCodeForTokens(code);

    if (!tokens.access_token) {
      throw new Error('No access token received from Google');
    }

    console.log('[Gmail OAuth] Tokens received successfully');

    // Store tokens in database
    // First, we need to get the user's email from Gmail
    const tempAccount = await upsertGmailAccount({
      user_id: userId,
      email: 'temp@example.com', // Temporary, will update
      account_type: 'personal', // Default type
      gmail_access_token: tokens.access_token,
      gmail_refresh_token: tokens.refresh_token || null,
      gmail_token_type: tokens.token_type || 'Bearer',
      gmail_expiry_date: tokens.expiry_date || null,
      gmail_scope: tokens.scope || null,
      sync_settings: {
        autoSync: false,
        syncFrequency: 'daily',
        lookbackPeriod: 30,
        categories: [],
      },
    });

    // Get Gmail profile to get actual email address
    console.log('[Gmail OAuth] Fetching Gmail profile...');
    const profile = await gmailAgent.getProfile(tempAccount.id);

    // Update with actual email
    await upsertGmailAccount({
      user_id: userId,
      email: profile.email,
      account_type: 'personal',
      gmail_access_token: tokens.access_token,
      gmail_refresh_token: tokens.refresh_token || null,
      gmail_token_type: tokens.token_type || 'Bearer',
      gmail_expiry_date: tokens.expiry_date || null,
      gmail_scope: tokens.scope || null,
      sync_settings: {
        autoSync: false,
        syncFrequency: 'daily',
        lookbackPeriod: 30,
        categories: [],
      },
    });

    console.log(`[Gmail OAuth] Successfully connected Gmail account: ${profile.email}`);

    // Redirect to Gmail config page with success message
    return redirect('/gmail-config?success=true', 302);

  } catch (error) {
    console.error('[Gmail OAuth] Callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return redirect(`/gmail-config?error=${encodeURIComponent(errorMessage)}`, 302);
  }
};
