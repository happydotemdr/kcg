/**
 * GET /api/contacts/verification-queue
 * Returns pending contact verifications with enriched contact details
 */

import type { APIRoute } from 'astro';
import * as verificationQueueRepo from '../../../lib/db/repositories/contact-verification-queue';
import * as emailContactsRepo from '../../../lib/db/repositories/email-contacts';
import { findUserByClerkId } from '../../../lib/db/repositories/users';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
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

    // Get pending verification queue items for user
    const queue = await verificationQueueRepo.findByUserId(dbUser.id, 'pending');

    // Enrich each queue item with contact details
    const enriched = await Promise.all(
      queue.map(async (item) => {
        const contact = await emailContactsRepo.findById(item.contact_id);
        return {
          ...item,
          contact,
        };
      })
    );

    return new Response(
      JSON.stringify({ queue: enriched }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[API/contacts/verification-queue] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
