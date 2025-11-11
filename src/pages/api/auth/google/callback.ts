/**
 * GET /api/auth/google/callback
 * Handles OAuth callback from Google
 */

import type { APIRoute } from 'astro';
import { exchangeCodeForTokens, createOAuth2Client } from '../../../../lib/google-calendar';
import { upsertOAuthToken } from '../../../../lib/db/repositories/google-oauth';
import { findUserByClerkId } from '../../../../lib/db/repositories/users';
import { google } from 'googleapis';

export const prerender = false;

export const GET: APIRoute = async ({ url, redirect }) => {
  try {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // Contains clerk user ID and optional mode
    const error = url.searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      return redirect('/integrations?error=access_denied', 302);
    }

    if (!code || !state) {
      return redirect('/integrations?error=missing_params', 302);
    }

    // Decode state - may contain userId and mode separated by |
    const decodedState = decodeURIComponent(state);
    const [clerkUserId, mode] = decodedState.split('|');

    // Find the database user
    const user = await findUserByClerkId(clerkUserId);
    if (!user) {
      console.error('User not found for Clerk ID:', clerkUserId);
      return redirect('/integrations?error=user_not_found', 302);
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.access_token) {
      return redirect('/integrations?error=token_exchange_failed', 302);
    }

    // Get user's Google account email
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials(tokens);

    // Verify the token is valid by making a test API call
    console.log('Token received:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      tokenType: tokens.token_type,
      expiryDate: tokens.expiry_date,
      scope: tokens.scope
    });

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfoResponse = await oauth2.userinfo.get();
    const googleAccountEmail = userInfoResponse.data.email || null;

    // Check if user already has accounts
    const { findAllTokensByUserId } = await import('../../../../lib/db/repositories/google-oauth');
    const existingTokens = await findAllTokensByUserId(user.id);
    const isFirstAccount = existingTokens.length === 0;

    // Store tokens in database (shared for both Calendar and Gmail)
    // Set is_primary only if this is the first account or if not in 'add' mode
    await upsertOAuthToken({
      user_id: user.id,
      google_account_email: googleAccountEmail,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      token_type: tokens.token_type || 'Bearer',
      expiry_date: tokens.expiry_date || null,
      scope: tokens.scope || null,
      is_primary: isFirstAccount, // Only set primary for first account
    });

    // Redirect to integrations page with success message
    const successUrl = mode === 'add' ? '/integrations?success=added' : '/integrations?success=true';
    return redirect(successUrl, 302);

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return redirect('/integrations?error=server_error', 302);
  }
};
