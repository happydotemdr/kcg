/**
 * GET /api/google/contacts/list
 * Direct fetch from Google Contacts (not from DB)
 */

import type { APIRoute } from 'astro';
import { findUserByClerkId } from '../../../../lib/db/repositories/users';
import { listContacts, type Contact } from '../../../../lib/google-contacts';
import { findPrimaryTokenByUserId } from '../../../../lib/db/repositories/google-oauth';

export const prerender = false;

interface ListResponse {
  contacts: Contact[];
  nextPageToken: string | null;
}

export const GET: APIRoute = async ({ locals, request }) => {
  try {
    // 1. Auth check
    const auth = await locals.auth();
    if (!auth.userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Find database user
    const user = await findUserByClerkId(auth.userId);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse query params
    const url = new URL(request.url);
    let googleAccountEmail = url.searchParams.get('googleAccountEmail');
    const pageToken = url.searchParams.get('pageToken') || undefined;
    const pageSizeParam = url.searchParams.get('pageSize');
    let pageSize = pageSizeParam ? parseInt(pageSizeParam, 10) : 100;

    // Validate pageSize
    if (isNaN(pageSize) || pageSize < 1) {
      pageSize = 100;
    }
    if (pageSize > 500) {
      pageSize = 500; // Max allowed by Google API
    }

    // Smart inference: use primary account if not specified
    if (!googleAccountEmail) {
      const primaryToken = await findPrimaryTokenByUserId(user.id);
      if (!primaryToken?.google_account_email) {
        return new Response(
          JSON.stringify({ error: 'No Google account connected. Please connect a Google account first.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      googleAccountEmail = primaryToken.google_account_email;
    }

    // 3. Call listContacts
    const response = await listContacts(user.id, {
      googleAccountEmail,
      pageToken,
      pageSize,
    });

    // 4. Return raw Google contacts
    const result: ListResponse = {
      contacts: response.contacts,
      nextPageToken: response.nextPageToken || null,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[Contacts List] Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to list contacts',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
