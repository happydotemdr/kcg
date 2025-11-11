/**
 * GET /api/google/status
 * Returns Google connection status for the authenticated user
 * Supports multi-account with backward compatibility
 */

import type { APIRoute } from 'astro';
import { findUserByClerkId } from '../../../lib/db/repositories/users';
import { findAllTokensByUserId, findPrimaryTokenByUserId } from '../../../lib/db/repositories/google-oauth';
import { findMappingsByUserId } from '../../../lib/db/repositories/calendar-mappings';
import { findGmailAccountsByUserId } from '../../../lib/db/repositories/gmail-accounts';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
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

    // Get all OAuth tokens for multi-account support
    const allTokens = await findAllTokensByUserId(user.id);
    const primaryToken = await findPrimaryTokenByUserId(user.id);

    // Build accounts array
    const accounts = await Promise.all(
      allTokens.map(async (token) => {
        // Check calendar mappings for this specific account
        const calendarMappings = await findMappingsByUserId(user.id);
        const hasCalendar = calendarMappings.length > 0;

        // Check Gmail accounts for this specific account
        const gmailAccounts = await findGmailAccountsByUserId(auth.userId);
        const accountGmail = gmailAccounts.find(
          (gmail) => gmail.google_account_email === token.google_account_email
        );
        const hasGmail = !!accountGmail;

        return {
          email: token.google_account_email,
          label: token.account_label || null,
          isPrimary: token.is_primary || false,
          hasCalendar,
          hasGmail,
          hasContacts: false, // Future: implement contacts integration
        };
      })
    );

    // Backward compatibility: return primary account info at top level
    const connected = allTokens.length > 0;
    const email = primaryToken?.google_account_email || allTokens[0]?.google_account_email || null;
    const hasCalendar = accounts.some((acc) => acc.hasCalendar);
    const hasGmail = accounts.some((acc) => acc.hasGmail);

    return new Response(
      JSON.stringify({
        // Backward compatible fields (primary account)
        connected,
        email,
        hasCalendar,
        hasGmail,
        // Multi-account support
        accounts,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Google status check error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to check Google connection status',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
