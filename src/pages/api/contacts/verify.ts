/**
 * POST /api/contacts/verify
 * Verify contact from verification queue (approve, reject, or modify)
 */

import type { APIRoute } from 'astro';
import * as verificationQueueRepo from '../../../lib/db/repositories/contact-verification-queue';
import { findUserByClerkId } from '../../../lib/db/repositories/users';

export const POST: APIRoute = async ({ request, locals }) => {
  const auth = await locals.auth();
  if (!auth?.userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Get database user ID
  const dbUser = await findUserByClerkId(auth.userId);
  if (!dbUser) {
    return new Response(
      JSON.stringify({ error: 'User not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json();
    const { contactId, action, updates } = body;

    if (!contactId || !action) {
      return new Response(
        JSON.stringify({ error: 'contactId and action are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find queue item by contact ID
    const queueItem = await verificationQueueRepo.findByContactId(contactId);
    if (!queueItem) {
      return new Response(
        JSON.stringify({ error: 'Contact not in verification queue' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify user owns this queue item
    if (queueItem.user_id !== dbUser.id) {
      return new Response('Forbidden', { status: 403 });
    }

    // Handle action
    if (action === 'approve') {
      await verificationQueueRepo.approve(queueItem.id, contactId);
    } else if (action === 'reject') {
      await verificationQueueRepo.reject(queueItem.id);
    } else if (action === 'modify') {
      if (!updates) {
        return new Response(
          JSON.stringify({ error: 'updates required for modify action' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      await verificationQueueRepo.modify(queueItem.id, contactId, updates);
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be approve, reject, or modify' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Verification error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
