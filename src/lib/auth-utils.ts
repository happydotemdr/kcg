import type { AstroGlobal } from 'astro';

/**
 * Auth state returned from Astro.locals.auth()
 */
interface AuthState {
  userId: string | null;
  user: {
    id: string;
    publicMetadata: {
      role?: string;
      [key: string]: any;
    };
    [key: string]: any;
  } | null;
}

/**
 * Gets the current authentication state from Astro.locals.auth()
 *
 * @param Astro - The Astro global object
 * @returns The current auth state containing userId and user data
 *
 * @example
 * ```ts
 * const auth = await getCurrentUser(Astro);
 * if (auth.userId) {
 *   console.log('User is authenticated:', auth.userId);
 * }
 * ```
 */
export async function getCurrentUser(Astro: AstroGlobal): Promise<AuthState> {
  return await Astro.locals.auth();
}

/**
 * Ensures the user is authenticated. Redirects to sign-in page if not.
 *
 * Use this function in Astro pages or API endpoints to protect routes.
 * If the function returns a Response, return it immediately from your handler.
 *
 * @param Astro - The Astro global object
 * @param redirectTo - The URL to redirect to if not authenticated (default: '/sign-in')
 * @returns The authenticated user's ID, or a redirect Response if not authenticated
 *
 * @example
 * ```ts
 * // In an Astro page or API endpoint
 * const result = await requireAuth(Astro);
 * if (result instanceof Response) return result;
 *
 * const userId = result;
 * // User is authenticated, proceed with logic
 *
 * // With custom redirect
 * const userId = await requireAuth(Astro, '/login');
 * ```
 */
export async function requireAuth(
  Astro: AstroGlobal,
  redirectTo: string = '/sign-in'
): Promise<string | Response> {
  const auth = await getCurrentUser(Astro);

  if (!auth.userId) {
    return Astro.redirect(redirectTo);
  }

  return auth.userId;
}

/**
 * Ensures the user is authenticated and has admin role.
 * Returns 403 Forbidden Response if user is not an admin.
 *
 * Use this function in Astro pages or API endpoints to protect admin routes.
 * If the function returns a Response, return it immediately from your handler.
 *
 * @param Astro - The Astro global object
 * @returns The authenticated admin user's ID, or a 403 Response if not authorized
 *
 * @example
 * ```ts
 * // In an Astro page or API endpoint
 * const result = await requireAdmin(Astro);
 * if (result instanceof Response) return result;
 *
 * const userId = result;
 * // User is authenticated and is an admin, proceed with admin logic
 * ```
 */
export async function requireAdmin(Astro: AstroGlobal): Promise<string | Response> {
  const auth = await getCurrentUser(Astro);

  if (!auth.userId || !auth.user) {
    return new Response(
      JSON.stringify({ error: 'Forbidden: Authentication required' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const isAdmin = auth.user.publicMetadata?.role === 'admin';

  if (!isAdmin) {
    return new Response(
      JSON.stringify({ error: 'Forbidden: Admin access required' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return auth.userId;
}
