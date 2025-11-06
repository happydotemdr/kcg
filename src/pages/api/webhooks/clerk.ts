import type { APIRoute } from 'astro';
import { Webhook } from 'svix';

export const prerender = false;

/**
 * Clerk webhook handler for processing authentication events
 *
 * This endpoint receives and processes webhook events from Clerk authentication service.
 * It verifies webhook signatures using Svix for security and handles various user and session events.
 *
 * Supported events:
 * - user.created: Triggered when a new user signs up
 * - user.updated: Triggered when user data is modified
 * - session.created: Triggered when a user starts a new session
 *
 * Security:
 * - Validates CLERK_WEBHOOK_SECRET environment variable
 * - Verifies webhook signatures using Svix
 * - Rejects requests with missing or invalid signatures
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Verify webhook secret is configured
    const webhookSecret = import.meta.env.CLERK_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('CLERK_WEBHOOK_SECRET is not set in environment variables');
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Extract Svix headers required for signature verification
    const svixId = request.headers.get('svix-id');
    const svixTimestamp = request.headers.get('svix-timestamp');
    const svixSignature = request.headers.get('svix-signature');

    // Validate that all required Svix headers are present
    if (!svixId || !svixTimestamp || !svixSignature) {
      console.error('Missing required Svix headers for webhook verification');
      return new Response(
        JSON.stringify({ error: 'Missing webhook signature headers' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get raw request body for signature verification
    // Important: Must use raw body text for signature validation
    const payload = await request.text();

    // Initialize Svix webhook verifier with secret
    const webhook = new Webhook(webhookSecret);

    // Verify webhook signature and parse event
    let event: WebhookEvent;

    try {
      event = webhook.verify(payload, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as WebhookEvent;
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Handle different event types
    const eventType = event.type;

    switch (eventType) {
      case 'user.created':
        console.log('User created event received:', {
          userId: (event.data as any).id,
          email: (event.data as any).email_addresses?.[0]?.email_address,
          firstName: (event.data as any).first_name,
          lastName: (event.data as any).last_name,
          createdAt: new Date((event.data as any).created_at).toISOString(),
        });
        // Add your user creation logic here
        // Examples:
        // - Create user record in your database
        // - Send welcome email
        // - Set up user workspace/resources
        // - Trigger analytics event
        break;

      case 'user.updated':
        console.log('User updated event received:', {
          userId: (event.data as any).id,
          email: (event.data as any).email_addresses?.[0]?.email_address,
          firstName: (event.data as any).first_name,
          lastName: (event.data as any).last_name,
          updatedAt: (event.data as any).updated_at ? new Date((event.data as any).updated_at).toISOString() : undefined,
        });
        // Add your user update logic here
        // Examples:
        // - Update user record in your database
        // - Sync profile changes to external services
        // - Invalidate user caches
        break;

      case 'session.created':
        console.log('Session created event received:', {
          sessionId: event.data.id,
          userId: event.data.user_id,
          status: event.data.status,
          createdAt: new Date(event.data.created_at).toISOString(),
        });
        // Add your session creation logic here
        // Examples:
        // - Log session analytics
        // - Update last active timestamp
        // - Track user engagement metrics
        // - Initialize session-specific resources
        break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
        // Event type not in our handler list, but we'll still return 200
        // to prevent Clerk from retrying
    }

    // Return success response
    return new Response(
      JSON.stringify({ success: true, eventType }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    // Catch-all error handler for unexpected errors
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

/**
 * TypeScript types for Clerk webhook events
 */
interface WebhookEvent {
  type: 'user.created' | 'user.updated' | 'session.created';
  data: UserEventData | SessionEventData;
}

/**
 * User event data structure
 * Contains user information from Clerk
 */
interface UserEventData {
  id: string;
  email_addresses?: Array<{
    email_address: string;
    id: string;
  }>;
  first_name?: string;
  last_name?: string;
  username?: string;
  profile_image_url?: string;
  created_at: number;
  updated_at: number;
  [key: string]: unknown; // Allow for additional Clerk fields
}

/**
 * Session event data structure
 * Contains session information from Clerk
 */
interface SessionEventData {
  id: string;
  user_id: string;
  status: string;
  created_at: number;
  updated_at?: number;
  [key: string]: unknown; // Allow for additional Clerk fields
}
