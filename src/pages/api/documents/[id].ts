/**
 * Document By ID API Endpoint
 * GET /api/documents/[id] - Get specific document
 * DELETE /api/documents/[id] - Delete document
 */

import type { APIRoute } from 'astro';
import { getDocumentById, deleteDocument } from '../../../lib/db';

export const GET: APIRoute = async ({ locals, params }) => {
  try {
    // Check authentication
    const auth = await locals.auth();
    const userId = auth?.userId;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const documentId = params.id;

    if (!documentId) {
      return new Response(JSON.stringify({ error: 'Document ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch document
    const document = await getDocumentById(documentId, userId);

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
    const auth = await locals.auth();
    const userId = auth?.userId;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const documentId = params.id;

    if (!documentId) {
      return new Response(JSON.stringify({ error: 'Document ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete document
    const success = await deleteDocument(documentId, userId);

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
