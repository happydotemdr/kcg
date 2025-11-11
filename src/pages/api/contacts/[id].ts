/**
 * GET /api/contacts/[id]
 * Fetch contact by ID
 *
 * PATCH /api/contacts/[id]
 * Update contact (source_type, tags, notes)
 */

import type { APIRoute } from 'astro';
import * as emailContactsRepo from '../../../lib/db/repositories/email-contacts';
import { findUserByClerkId } from '../../../lib/db/repositories/users';

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const { userId } = locals.auth();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get database user ID
    const dbUser = await findUserByClerkId(userId);
    if (!dbUser) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const contactId = params.id;

    if (!contactId) {
      return new Response(
        JSON.stringify({ error: 'Contact ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Contact] Fetching contact ${contactId}`);

    // Query contact by ID
    const { query } = await import('../../../lib/db/client');
    const result = await query(
      'SELECT * FROM email_contacts WHERE id = $1 AND user_id = $2',
      [contactId, dbUser.id]
    );

    if (result.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Contact not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Contact] Successfully fetched contact');

    return new Response(
      JSON.stringify({
        success: true,
        contact: result.rows[0],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Contact] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch contact',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    const { userId } = locals.auth();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get database user ID
    const dbUser = await findUserByClerkId(userId);
    if (!dbUser) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const contactId = params.id;

    if (!contactId) {
      return new Response(
        JSON.stringify({ error: 'Contact ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json() as Partial<{
      source_type: string | null;
      tags: string[];
      notes: string | null;
    }>;

    console.log(`[Contact] Updating contact ${contactId}`, body);

    // Check contact exists and belongs to user
    const { query } = await import('../../../lib/db/client');
    const existing = await query(
      'SELECT id FROM email_contacts WHERE id = $1 AND user_id = $2',
      [contactId, dbUser.id]
    );

    if (existing.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Contact not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update contact
    const updateResult = await query(
      `UPDATE email_contacts SET
        source_type = COALESCE($1, source_type),
        tags = COALESCE($2, tags),
        notes = COALESCE($3, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND user_id = $5
      RETURNING *`,
      [
        body.source_type ?? null,
        body.tags ?? null,
        body.notes ?? null,
        contactId,
        dbUser.id,
      ]
    );

    console.log('[Contact] Successfully updated contact');

    return new Response(
      JSON.stringify({
        success: true,
        contact: updateResult.rows[0],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Contact] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to update contact',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
