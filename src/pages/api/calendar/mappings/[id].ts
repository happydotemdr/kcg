/**
 * API Endpoint: Calendar Mapping by ID
 * PUT /api/calendar/mappings/[id] - Update a calendar mapping
 * DELETE /api/calendar/mappings/[id] - Delete a calendar mapping
 */

import type { APIRoute } from 'astro';
import { findUserByClerkId } from '../../../../lib/db/repositories/users';
import {
  updateMapping,
  deleteMapping,
  findMappingsByUserId,
} from '../../../../lib/db/repositories/calendar-mappings';
import type { CalendarEntityType } from '../../../../lib/db/types';

// PUT: Update calendar mapping
export const PUT: APIRoute = async ({ locals, params, request }) => {
  try {
    // Check authentication
    const auth = await locals.auth();
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

    const mappingId = params.id;
    if (!mappingId) {
      return new Response(JSON.stringify({ error: 'Mapping ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await request.json();
    const updates: any = {};

    // Validate and add fields to update
    if (body.calendar_name !== undefined) updates.calendar_name = body.calendar_name;
    if (body.is_default !== undefined) updates.is_default = body.is_default;
    if (body.calendar_time_zone !== undefined) updates.calendar_time_zone = body.calendar_time_zone;

    // Validate entity_type if provided
    if (body.entity_type !== undefined) {
      const validEntityTypes: CalendarEntityType[] = ['family', 'personal', 'work'];
      if (!validEntityTypes.includes(body.entity_type)) {
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
      updates.entity_type = body.entity_type;
    }

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ error: 'No fields to update' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update the mapping
    const updatedMapping = await updateMapping(mappingId, updates);

    // Verify the mapping belongs to this user
    const userMappings = await findMappingsByUserId(dbUser.id);
    if (!userMappings.find((m) => m.id === updatedMapping.id)) {
      return new Response(JSON.stringify({ error: 'Mapping not found or access denied' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        message: 'Calendar mapping updated successfully',
        mapping: updatedMapping,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error updating calendar mapping:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to update calendar mapping',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// DELETE: Delete calendar mapping
export const DELETE: APIRoute = async ({ locals, params }) => {
  try {
    // Check authentication
    const auth = await locals.auth();
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

    const mappingId = params.id;
    if (!mappingId) {
      return new Response(JSON.stringify({ error: 'Mapping ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify the mapping belongs to this user before deleting
    const userMappings = await findMappingsByUserId(dbUser.id);
    const mappingToDelete = userMappings.find((m) => m.id === mappingId);

    if (!mappingToDelete) {
      return new Response(JSON.stringify({ error: 'Mapping not found or access denied' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete the mapping
    const deleted = await deleteMapping(mappingId);

    if (!deleted) {
      return new Response(JSON.stringify({ error: 'Failed to delete mapping' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        message: 'Calendar mapping deleted successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error deleting calendar mapping:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to delete calendar mapping',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
