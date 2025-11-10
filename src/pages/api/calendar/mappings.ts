/**
 * API Endpoint: Calendar Mappings
 * GET /api/calendar/mappings - List all calendar mappings for user
 * POST /api/calendar/mappings - Create a new calendar mapping
 */

import type { APIRoute } from 'astro';
import { findUserByClerkId } from '../../../lib/db/repositories/users';
import {
  findMappingsByUserId,
  createMapping,
  findMappingByEntityType,
} from '../../../lib/db/repositories/calendar-mappings';
import type { CalendarEntityType } from '../../../lib/db/types';

// GET: List all calendar mappings
export const GET: APIRoute = async ({ locals }) => {
  try {
    // Check authentication
    const auth = locals.auth();
    if (!auth?.userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get database user
    const dbUser = await findUserByClerkId(auth.userId);
    if (!dbUser) {
      return new Response(JSON.stringify({ error: 'User not found in database' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get all mappings for user
    const mappings = await findMappingsByUserId(dbUser.id);

    return new Response(JSON.stringify({ mappings }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error getting calendar mappings:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to get calendar mappings',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// POST: Create a new calendar mapping
export const POST: APIRoute = async ({ locals, request }) => {
  try {
    // Check authentication
    const auth = locals.auth();
    if (!auth?.userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get database user
    const dbUser = await findUserByClerkId(auth.userId);
    if (!dbUser) {
      return new Response(JSON.stringify({ error: 'User not found in database' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await request.json();
    const { google_calendar_id, calendar_name, entity_type, is_default, calendar_time_zone } = body;

    // Validate required fields
    if (!google_calendar_id || !calendar_name || !entity_type) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: google_calendar_id, calendar_name, entity_type',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate entity_type
    const validEntityTypes: CalendarEntityType[] = ['family', 'personal', 'work'];
    if (!validEntityTypes.includes(entity_type)) {
      return new Response(
        JSON.stringify({
          error: `Invalid entity_type. Must be one of: ${validEntityTypes.join(', ')}`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if mapping already exists for this entity type
    const existingMapping = await findMappingByEntityType(dbUser.id, entity_type);
    if (existingMapping) {
      return new Response(
        JSON.stringify({
          error: `A calendar is already mapped to ${entity_type}. Please delete the existing mapping first.`,
          existing_mapping: existingMapping,
        }),
        {
          status: 409, // Conflict
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Create the mapping
    const mapping = await createMapping({
      user_id: dbUser.id,
      google_calendar_id,
      calendar_name,
      entity_type,
      is_default: is_default ?? false,
      calendar_time_zone: calendar_time_zone ?? null,
    });

    return new Response(
      JSON.stringify({
        message: 'Calendar mapping created successfully',
        mapping,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating calendar mapping:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to create calendar mapping',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
