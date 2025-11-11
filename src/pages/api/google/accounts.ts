/**
 * /api/google/accounts
 * Manage multiple Google accounts for a user
 */

import type { APIRoute } from 'astro';
import { findUserByClerkId } from '../../../lib/db/repositories/users';
import {
  findAllTokensByUserId,
  setPrimaryAccount,
  updateAccountLabel,
} from '../../../lib/db/repositories/google-oauth';

export const prerender = false;

/**
 * GET /api/google/accounts
 * List all Google accounts for the authenticated user
 */
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

    // Get all OAuth tokens
    const tokens = await findAllTokensByUserId(user.id);

    // Map to response format
    const accounts = tokens.map((token) => ({
      email: token.google_account_email,
      label: token.account_label || null,
      isPrimary: token.is_primary || false,
      createdAt: token.created_at,
      updatedAt: token.updated_at,
    }));

    return new Response(JSON.stringify({ accounts }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('List Google accounts error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to list Google accounts',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * POST /api/google/accounts
 * Update account settings (set primary, update label)
 * Body: { action: 'setPrimary' | 'updateLabel', email: string, label?: string }
 */
export const POST: APIRoute = async ({ locals, request }) => {
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

    // Parse request body
    const body = await request.json();
    const { action, email, label } = body;

    if (!action || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: action, email' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'setPrimary') {
      // Set this account as primary
      const updatedToken = await setPrimaryAccount(user.id, email);

      return new Response(
        JSON.stringify({
          success: true,
          message: `${email} set as primary account`,
          account: {
            email: updatedToken.google_account_email,
            label: updatedToken.account_label,
            isPrimary: updatedToken.is_primary,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else if (action === 'updateLabel') {
      // Update account label
      if (!label) {
        return new Response(
          JSON.stringify({ error: 'Missing required field: label' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const updatedToken = await updateAccountLabel(user.id, email, label);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Label updated for ${email}`,
          account: {
            email: updatedToken.google_account_email,
            label: updatedToken.account_label,
            isPrimary: updatedToken.is_primary,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: `Unknown action: ${action}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Update Google account error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to update Google account',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
