import type { APIRoute } from 'astro';
import { deleteMappingsByUserId } from '../../../lib/db/repositories/calendar-mappings';
import { findGmailAccountsByUserId, deleteGmailAccount, deleteGmailAccountByUserIdAndEmail } from '../../../lib/db/repositories/gmail-accounts';
import { deleteOAuthToken, deleteOAuthTokenByEmail } from '../../../lib/db/repositories/google-oauth';
import { findUserByClerkId } from '../../../lib/db/repositories/users';

export const DELETE: APIRoute = async ({ locals, url }) => {
  // 1. Auth check
  const auth = await locals.auth();
  if (!auth.userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Get optional googleAccountEmail query param for account-specific disconnect
    const googleAccountEmail = url.searchParams.get('googleAccountEmail');

    // Find database user
    const user = await findUserByClerkId(auth.userId);
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, message: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (googleAccountEmail) {
      // Account-specific disconnect: only delete data for this Google account

      // Delete Gmail account for this email
      await deleteGmailAccountByUserIdAndEmail(auth.userId, googleAccountEmail);

      // Note: Calendar mappings are user-scoped, not account-scoped (limitation of current schema)
      // For now, we keep calendar mappings as they may span multiple accounts

      // Delete OAuth token for this specific account
      await deleteOAuthTokenByEmail(user.id, googleAccountEmail);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Google account ${googleAccountEmail} disconnected`
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } else {
      // Disconnect all Google accounts (original behavior)

      // Delete calendar mappings first
      await deleteMappingsByUserId(user.id);

      // Delete all Gmail accounts for this user
      const gmailAccounts = await findGmailAccountsByUserId(auth.userId);
      for (const account of gmailAccounts) {
        await deleteGmailAccount(account.id);
      }

      // Delete all OAuth tokens
      await deleteOAuthToken(user.id);

      return new Response(
        JSON.stringify({ success: true, message: 'All Google accounts disconnected' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to disconnect Google account'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
