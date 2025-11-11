/**
 * PUT /api/gmail/config/sync-settings
 * Update sync settings for a Gmail account
 */

import type { APIRoute } from 'astro';
import {
  findGmailAccountById,
  updateSyncSettings,
} from '../../../../lib/db/repositories/gmail-accounts';
import { findUserByClerkId } from '../../../../lib/db/repositories/users';
import type { GmailSyncSettings } from '../../../../lib/db/types';

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
    const { accountId, syncSettings } = body;

    // Validate input
    if (!accountId || !syncSettings) {
      return new Response(
        JSON.stringify({ error: 'accountId and syncSettings are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate sync settings structure
    if (typeof syncSettings !== 'object') {
      return new Response(
        JSON.stringify({ error: 'syncSettings must be an object' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate specific fields if provided
    if (syncSettings.autoSync !== undefined && typeof syncSettings.autoSync !== 'boolean') {
      return new Response(
        JSON.stringify({ error: 'autoSync must be a boolean' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (syncSettings.syncFrequency !== undefined) {
      const validFrequencies = ['realtime', 'hourly', 'daily'];
      if (!validFrequencies.includes(syncSettings.syncFrequency)) {
        return new Response(
          JSON.stringify({
            error: `syncFrequency must be one of: ${validFrequencies.join(', ')}`,
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    if (syncSettings.lookbackPeriod !== undefined) {
      const lookback = Number(syncSettings.lookbackPeriod);
      if (isNaN(lookback) || lookback < 1 || lookback > 90) {
        return new Response(
          JSON.stringify({ error: 'lookbackPeriod must be between 1 and 90 days' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    if (syncSettings.categories !== undefined && !Array.isArray(syncSettings.categories)) {
      return new Response(
        JSON.stringify({ error: 'categories must be an array' }),
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

    // Merge with existing settings
    const mergedSettings: GmailSyncSettings = {
      ...account.sync_settings,
      ...syncSettings,
    };

    // Update sync settings
    const updatedAccount = await updateSyncSettings(accountId, mergedSettings);

    console.log(`[Gmail Config] Updated sync settings for ${account.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        account: {
          id: updatedAccount.id,
          email: updatedAccount.email,
          syncSettings: updatedAccount.sync_settings,
          updatedAt: updatedAccount.updated_at,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Gmail Config] Error updating sync settings:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to update sync settings',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
