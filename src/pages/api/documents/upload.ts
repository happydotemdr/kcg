/**
 * Document Upload API Endpoint
 * POST /api/documents/upload
 * Upload document and start processing
 */

import type { APIRoute } from 'astro';
import { createDocument } from '../../../lib/db';
import { findUserByClerkId } from '../../../lib/db/repositories/users';

export const POST: APIRoute = async ({ locals, request }) => {
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

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate file type
    const supportedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!supportedTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({
          error: 'Unsupported file type. Please upload images, PDFs, Word docs, or text files.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({
          error: 'File too large. Maximum size is 10MB.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Convert file to base64 for storage (MVP approach)
    // In production, upload to S3/cloud storage
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const fileUrl = `data:${file.type};base64,${base64}`;

    // Create document record in database
    const document = await createDocument({
      user_id: dbUser.id,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      file_url: fileUrl, // Store base64 data URL for MVP
      status: 'uploading',
    });

    // Return document ID for client to poll status
    return new Response(
      JSON.stringify({
        success: true,
        document: {
          id: document.id,
          file_name: document.file_name,
          status: document.status,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Document upload error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to upload document',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
