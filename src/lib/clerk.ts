import { createClerkClient } from '@clerk/backend';
import type { User } from '@clerk/backend';

// Initialize Clerk backend client
const clerk = createClerkClient({ secretKey: import.meta.env.CLERK_SECRET_KEY || '' });

/**
 * Fetches complete user details from Clerk
 *
 * @param userId - The Clerk user ID
 * @returns The user object if found, null otherwise
 * @example
 * const user = await getFullUser('user_123');
 * if (user) {
 *   console.log(user.emailAddresses);
 * }
 */
export async function getFullUser(userId: string): Promise<User | null> {
  try {
    const user = await clerk.users.getUser(userId);
    return user;
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    return null;
  }
}

/**
 * Updates the public metadata for a user
 *
 * @param userId - The Clerk user ID
 * @param metadata - The metadata object to merge into publicMetadata
 * @returns The updated user object if successful, null otherwise
 * @example
 * const updatedUser = await updateUserMetadata('user_123', { role: 'admin' });
 * if (updatedUser) {
 *   console.log('Metadata updated successfully');
 * }
 */
export async function updateUserMetadata(
  userId: string,
  metadata: Record<string, any>
): Promise<User | null> {
  try {
    const user = await clerk.users.updateUser(userId, {
      publicMetadata: metadata,
    });
    return user;
  } catch (error) {
    console.error(`Error updating metadata for user ${userId}:`, error);
    return null;
  }
}

/**
 * Checks if a user has a specific role
 *
 * @param user - The Clerk user object
 * @param role - The role to check for
 * @returns True if the user has the role, false otherwise
 * @example
 * const user = await getFullUser('user_123');
 * if (hasRole(user, 'moderator')) {
 *   console.log('User is a moderator');
 * }
 */
export function hasRole(user: any, role: string): boolean {
  if (!user || !user.publicMetadata) {
    return false;
  }

  const roles = user.publicMetadata.roles;
  if (Array.isArray(roles)) {
    return roles.includes(role);
  }

  return false;
}

/**
 * Checks if a user has the admin role
 *
 * @param user - The Clerk user object
 * @returns True if the user is an admin, false otherwise
 * @example
 * const user = await getFullUser('user_123');
 * if (isAdmin(user)) {
 *   console.log('User has admin privileges');
 * }
 */
export function isAdmin(user: any): boolean {
  return hasRole(user, 'admin');
}
