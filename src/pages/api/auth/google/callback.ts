/**
 * GET /api/auth/google/callback
 * Handles OAuth callback from Google
 */

import type { APIRoute } from 'astro';
import { exchangeCodeForTokens } from '../../../../lib/google-calendar';
import { upsertOAuthToken } from '../../../../lib/db/repositories/google-oauth';
import { findUserByClerkId } from '../../../../lib/db/repositories/users';

export const prerender = false;

export const GET: APIRoute = async ({ url, redirect }) => {
  try {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // Contains clerk user ID
    const error = url.searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      return redirect('/chat?calendar_error=access_denied', 302);
    }

    if (!code || !state) {
      return redirect('/chat?calendar_error=missing_params', 302);
    }

    const clerkUserId = decodeURIComponent(state);

    // Find the database user
    const user = await findUserByClerkId(clerkUserId);
    if (!user) {
      console.error('User not found for Clerk ID:', clerkUserId);
      return redirect('/chat?calendar_error=user_not_found', 302);
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.access_token) {
      return redirect('/chat?calendar_error=token_exchange_failed', 302);
    }

    // Store tokens in database
    await upsertOAuthToken({
      user_id: user.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      token_type: tokens.token_type || 'Bearer',
      expiry_date: tokens.expiry_date || null,
      scope: tokens.scope || null,
    });

    // Redirect back to chat with success message
    return redirect('/chat?calendar_connected=true', 302);

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return redirect('/chat?calendar_error=server_error', 302);
  }
};
