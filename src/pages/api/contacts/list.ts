/**
 * GET /api/contacts/list
 * List email contacts with optional filtering
 */

import type { APIRoute } from 'astro';
import { findByUserId } from '../../../lib/db/repositories/email-contacts';
import { findUserByClerkId } from '../../../lib/db/repositories/users';
import type { ContactFilters } from '../../../lib/db/types';

export const prerender = false;

export const GET: APIRoute = async ({ locals, request }) => {
  try {
    // Check authentication
    const auth = await locals.auth();

    if (!auth?.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get database user ID
    const dbUser = await findUserByClerkId(auth.userId);
    if (!dbUser) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const sourceType = url.searchParams.get('sourceType');
    const verificationStatus = url.searchParams.get('verificationStatus');
    const search = url.searchParams.get('search');
    const minConfidence = parseFloat(url.searchParams.get('minConfidence') || '0');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    // Build filters
    const filters: ContactFilters = {
      minConfidence,
      limit: Math.min(limit, 100), // Cap at 100 per request
      offset: Math.max(0, (page - 1) * limit),
    };

    if (sourceType) {
      filters.sourceType = sourceType as any;
    }

    if (verificationStatus) {
      filters.verificationStatus = verificationStatus as any;
    }

    // Get contacts from database
    const contacts = await findByUserId(dbUser.id, filters);

    // Apply search filter in-memory (search across display_name, email, organization)
    let filtered = contacts;
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = contacts.filter((contact) => {
        const displayName = contact.display_name?.toLowerCase() || '';
        const email = contact.email.toLowerCase();
        const organization = contact.organization?.toLowerCase() || '';

        return (
          displayName.includes(searchLower) ||
          email.includes(searchLower) ||
          organization.includes(searchLower)
        );
      });
    }

    console.log(
      `[Contacts List] Found ${filtered.length} contacts for user ${auth.userId}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        contacts: filtered,
        count: filtered.length,
        page,
        limit,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Contacts List] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch contacts',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
