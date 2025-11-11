/**
 * POST /api/email/accounts/detect
 * Detects Gmail email address using google_oauth_tokens
 * Does NOT create gmail_account record (that's for email-config page)
 */

import type { APIRoute } from 'astro';
import { findUserByClerkId } from '../../../../lib/db/repositories/users';
import { findTokenByUserId } from '../../../../lib/db/repositories/google-oauth';
import { createOAuth2Client } from '../../../../lib/google-calendar';
import { google } from 'googleapis';

export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
  try {
    // Check authentication
    const auth = await locals.auth();
    if (!auth.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find database user
    const user = await findUserByClerkId(auth.userId);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if OAuth tokens exist
    const tokenData = await findTokenByUserId(user.id);
    if (!tokenData) {
      return new Response(
        JSON.stringify({ error: 'Google account not connected. Please connect first.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get OAuth2 client with user's credentials
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type,
      expiry_date: tokenData.expiry_date,
    });

    // Fetch Gmail profile to get email address
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profileResponse = await gmail.users.getProfile({ userId: 'me' });
    const email = profileResponse.data.emailAddress;

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Failed to detect email address' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        email,
        detected: true,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Email detection error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to detect email address',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
