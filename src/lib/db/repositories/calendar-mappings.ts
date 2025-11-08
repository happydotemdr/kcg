/**
 * Calendar Mappings Repository
 * Database operations for user_calendar_mappings table
 * Handles multi-calendar support with entity type mapping
 */

import { query } from '../client';
import type { UserCalendarMapping, CreateUserCalendarMapping, CalendarEntityType } from '../types';

/**
 * Find all calendar mappings for a user
 */
export async function findMappingsByUserId(userId: string): Promise<UserCalendarMapping[]> {
  const result = await query<UserCalendarMapping>(
    `SELECT * FROM user_calendar_mappings
     WHERE user_id = $1
     ORDER BY
       CASE
         WHEN is_default = TRUE THEN 0
         WHEN entity_type = 'family' THEN 1
         WHEN entity_type = 'personal' THEN 2
         WHEN entity_type = 'work' THEN 3
       END`,
    [userId]
  );
  return result.rows;
}

/**
 * Find a specific calendar mapping by user ID and entity type
 */
export async function findMappingByEntityType(
  userId: string,
  entityType: CalendarEntityType
): Promise<UserCalendarMapping | null> {
  const result = await query<UserCalendarMapping>(
    'SELECT * FROM user_calendar_mappings WHERE user_id = $1 AND entity_type = $2',
    [userId, entityType]
  );
  return result.rows[0] || null;
}

/**
 * Find the default calendar mapping for a user
 */
export async function findDefaultMapping(userId: string): Promise<UserCalendarMapping | null> {
  const result = await query<UserCalendarMapping>(
    'SELECT * FROM user_calendar_mappings WHERE user_id = $1 AND is_default = TRUE',
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Find a calendar mapping by Google Calendar ID
 */
export async function findMappingByCalendarId(
  userId: string,
  googleCalendarId: string
): Promise<UserCalendarMapping | null> {
  const result = await query<UserCalendarMapping>(
    'SELECT * FROM user_calendar_mappings WHERE user_id = $1 AND google_calendar_id = $2',
    [userId, googleCalendarId]
  );
  return result.rows[0] || null;
}

/**
 * Create a new calendar mapping
 */
export async function createMapping(data: CreateUserCalendarMapping): Promise<UserCalendarMapping> {
  const result = await query<UserCalendarMapping>(
    `INSERT INTO user_calendar_mappings
     (user_id, google_calendar_id, calendar_name, entity_type, is_default, calendar_time_zone)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.user_id,
      data.google_calendar_id,
      data.calendar_name,
      data.entity_type,
      data.is_default ?? false,
      data.calendar_time_zone ?? null,
    ]
  );

  if (result.rows.length === 0) {
    throw new Error('Failed to create calendar mapping');
  }

  return result.rows[0];
}

/**
 * Update a calendar mapping
 */
export async function updateMapping(
  id: string,
  updates: Partial<Omit<UserCalendarMapping, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<UserCalendarMapping> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // Build dynamic update query
  if (updates.google_calendar_id !== undefined) {
    fields.push(`google_calendar_id = $${paramIndex++}`);
    values.push(updates.google_calendar_id);
  }
  if (updates.calendar_name !== undefined) {
    fields.push(`calendar_name = $${paramIndex++}`);
    values.push(updates.calendar_name);
  }
  if (updates.entity_type !== undefined) {
    fields.push(`entity_type = $${paramIndex++}`);
    values.push(updates.entity_type);
  }
  if (updates.is_default !== undefined) {
    fields.push(`is_default = $${paramIndex++}`);
    values.push(updates.is_default);
  }
  if (updates.calendar_time_zone !== undefined) {
    fields.push(`calendar_time_zone = $${paramIndex++}`);
    values.push(updates.calendar_time_zone);
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(id);

  const result = await query<UserCalendarMapping>(
    `UPDATE user_calendar_mappings
     SET ${fields.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new Error('Calendar mapping not found');
  }

  return result.rows[0];
}

/**
 * Delete a calendar mapping
 */
export async function deleteMapping(id: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM user_calendar_mappings WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rows.length > 0;
}

/**
 * Delete all calendar mappings for a user
 */
export async function deleteMappingsByUserId(userId: string): Promise<number> {
  const result = await query(
    'DELETE FROM user_calendar_mappings WHERE user_id = $1',
    [userId]
  );
  return result.rowCount || 0;
}

/**
 * Set a mapping as the default for the user
 * This will automatically unset other defaults via the database trigger
 */
export async function setAsDefault(id: string): Promise<UserCalendarMapping> {
  return await updateMapping(id, { is_default: true });
}

/**
 * Check if a user has any calendar mappings
 */
export async function hasAnyMappings(userId: string): Promise<boolean> {
  const result = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM user_calendar_mappings WHERE user_id = $1',
    [userId]
  );
  return parseInt(result.rows[0]?.count || '0') > 0;
}

/**
 * Get count of mappings by entity type for a user
 */
export async function getMappingCounts(userId: string): Promise<Record<CalendarEntityType, number>> {
  const result = await query<{ entity_type: CalendarEntityType; count: string }>(
    `SELECT entity_type, COUNT(*) as count
     FROM user_calendar_mappings
     WHERE user_id = $1
     GROUP BY entity_type`,
    [userId]
  );

  const counts: Record<CalendarEntityType, number> = {
    family: 0,
    personal: 0,
    work: 0,
  };

  result.rows.forEach((row) => {
    counts[row.entity_type] = parseInt(row.count);
  });

  return counts;
}
