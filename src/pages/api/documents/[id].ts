/**
 * Document By ID API Endpoint
 * GET /api/documents/[id] - Get specific document
 * DELETE /api/documents/[id] - Delete document
 */

import type { APIRoute } from 'astro';
import { getDocumentById, deleteDocument } from '../../../lib/db';
import { findUserByClerkId } from '../../../lib/db/repositories/users';

export const GET: APIRoute = async ({ locals, params }) => {
  try {
    // Check authentication
    const { userId: clerkUserId } = locals.auth();

    if (!clerkUserId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get database user ID
    const dbUser = await findUserByClerkId(clerkUserId);
    if (!dbUser) {
      return new Response(
        JSON.stringify({ error: 'User not found in database' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const documentId = params.id;

    if (!documentId) {
      return new Response(JSON.stringify({ error: 'Document ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch document
    const document = await getDocumentById(documentId, dbUser.id);

    if (!document) {
      return new Response(JSON.stringify({ error: 'Document not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(document), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to fetch document:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch document',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export const DELETE: APIRoute = async ({ locals, params }) => {
  try {
    // Check authentication
    const { userId: clerkUserId } = locals.auth();

    if (!clerkUserId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get database user ID
    const dbUser = await findUserByClerkId(clerkUserId);
    if (!dbUser) {
      return new Response(
        JSON.stringify({ error: 'User not found in database' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const documentId = params.id;

    if (!documentId) {
      return new Response(JSON.stringify({ error: 'Document ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete document
    const success = await deleteDocument(documentId, dbUser.id);

    if (!success) {
      return new Response(JSON.stringify({ error: 'Document not found or already deleted' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Document deleted successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Failed to delete document:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to delete document',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
