/**
 * Sync Queue - Per-User Mutation Mutex
 *
 * Ensures sequential execution of Google API mutations per user.
 * Context7 requirement: Sequential mutations per user to avoid conflicts.
 */

// In-memory map of userId -> Promise chain
const userMutexes = new Map<string, Promise<any>>();

/**
 * Execute an operation sequentially within a user's mutex
 * Ensures all mutations for the same user happen one at a time
 *
 * @param userId - Clerk user ID
 * @param operation - Async function to execute
 * @returns Result of the operation
 */
export async function withUserMutex<T>(
  userId: string,
  operation: () => Promise<T>
): Promise<T> {
  // Get the current promise chain for this user (or create one)
  const currentPromise = userMutexes.get(userId) || Promise.resolve();

  // Chain the new operation
  const newPromise = currentPromise
    .then(() => operation())
    .catch((error) => {
      // Re-throw to caller but don't break the chain
      throw error;
    })
    .finally(() => {
      // Clean up if this was the last operation
      if (userMutexes.get(userId) === newPromise) {
        userMutexes.delete(userId);
      }
    });

  // Update the chain
  userMutexes.set(userId, newPromise);

  return newPromise;
}
