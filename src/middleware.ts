import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';

/**
 * Define protected routes that require authentication
 * - /dashboard and all its subroutes
 * - /api/user and all its subroutes
 * - /api/chat and all its subroutes (Claude API)
 * - /chat page (Claude chat UI)
 */
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/user(.*)',
  '/api/chat(.*)',
  '/chat',
]);

/**
 * Clerk authentication middleware
 * Protects routes and redirects unauthenticated users to sign-in
 */
export const onRequest = clerkMiddleware((auth, context) => {
  const { userId, redirectToSignIn } = auth();

  // Check if the current route is protected
  if (isProtectedRoute(context.request) && !userId) {
    // User is not authenticated, redirect to sign-in page
    return redirectToSignIn();
  }

  // User is authenticated or route is public, continue with the request
});
