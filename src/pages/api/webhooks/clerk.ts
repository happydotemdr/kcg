import type { APIRoute } from 'astro';
import { Webhook } from 'svix';
import { upsertUser, deleteUser } from '../../../lib/db/repositories/users';
import { storeWebhookEvent } from '../../../lib/db/repositories/webhooks';
import type { CreateUser, CreateClerkWebhookEvent } from '../../../lib/db/types';

export const prerender = false;

/**
 * Clerk webhook handler for processing authentication events
 *
 * This endpoint receives and processes webhook events from Clerk authentication service.
 * It verifies webhook signatures using Svix for security and handles various user and session events.
 * All events are synced to PostgreSQL database for persistence and audit trail.
 *
 * Supported events:
 * - user.created: Creates user record in database
 * - user.updated: Updates user record in database
 * - user.deleted: Removes user record from database
 * - session.created: Logs session creation (user sync planned for future)
 *
 * Database operations:
 * - User events are synced via upsertUser/deleteUser repository functions
 * - All webhook events are logged to clerk_webhook_events table for audit
 * - Graceful error handling preserves webhook events even on failures
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
      case 'user.updated': {
        const userData = event.data as UserEventData;

        console.log(`${eventType} event received:`, {
          userId: userData.id,
          email: userData.email_addresses?.[0]?.email_address,
          firstName: userData.first_name,
          lastName: userData.last_name,
        });

        try {
          // Extract email and verification status
          const primaryEmail = userData.email_addresses?.[0];
          const email = primaryEmail?.email_address;
          const emailVerified = primaryEmail?.verification?.status === 'verified';

          if (!email) {
            console.error('User event missing email address:', userData.id);
            // Store webhook event with error
            await storeWebhookEvent({
              event_id: event.data.id || `${eventType}-${Date.now()}`,
              event_type: eventType,
              object_type: 'user',
              object_id: userData.id,
              payload: event.data,
              processed: false,
              processed_at: null,
              error_message: 'Missing email address',
            });
            break;
          }

          // Map Clerk user data to CreateUser type
          const userToUpsert: CreateUser = {
            clerk_user_id: userData.id,
            email: email,
            email_verified: emailVerified,
            first_name: userData.first_name || null,
            last_name: userData.last_name || null,
            username: userData.username || null,
            profile_image_url: userData.profile_image_url || null,
            last_sign_in_at: userData.last_sign_in_at ? new Date(userData.last_sign_in_at) : null,
            metadata: {
              ...(userData.public_metadata || {}),
              private_metadata: userData.private_metadata || {},
              unsafe_metadata: userData.unsafe_metadata || {},
            },
            banned: userData.banned || false,
          };

          // Upsert user to database
          const savedUser = await upsertUser(userToUpsert);
          console.log(`User ${eventType === 'user.created' ? 'created' : 'updated'} successfully:`, savedUser.id);

          // Store webhook event for audit
          await storeWebhookEvent({
            event_id: event.data.id || `${eventType}-${Date.now()}`,
            event_type: eventType,
            object_type: 'user',
            object_id: userData.id,
            payload: event.data,
            processed: true,
            processed_at: null,
            error_message: null,
          });
        } catch (error) {
          console.error(`Error processing ${eventType}:`, error);

          // Store webhook event with error
          await storeWebhookEvent({
            event_id: event.data.id || `${eventType}-${Date.now()}`,
            event_type: eventType,
            object_type: 'user',
            object_id: userData.id,
            payload: event.data,
            processed: false,
            processed_at: null,
            error_message: error instanceof Error ? error.message : 'Unknown error',
          });

          throw error; // Re-throw to be caught by outer try-catch
        }
        break;
      }

      case 'user.deleted': {
        const userData = event.data as UserEventData;

        console.log('User deleted event received:', {
          userId: userData.id,
        });

        try {
          // Delete user from database
          const deleted = await deleteUser(userData.id);

          if (deleted) {
            console.log('User deleted successfully:', userData.id);
          } else {
            console.warn('User not found in database:', userData.id);
          }

          // Store webhook event for audit
          await storeWebhookEvent({
            event_id: event.data.id || `user.deleted-${Date.now()}`,
            event_type: eventType,
            object_type: 'user',
            object_id: userData.id,
            payload: event.data,
            processed: true,
            processed_at: null,
            error_message: null,
          });
        } catch (error) {
          console.error('Error processing user.deleted:', error);

          // Store webhook event with error
          await storeWebhookEvent({
            event_id: event.data.id || `user.deleted-${Date.now()}`,
            event_type: eventType,
            object_type: 'user',
            object_id: userData.id,
            payload: event.data,
            processed: false,
            processed_at: null,
            error_message: error instanceof Error ? error.message : 'Unknown error',
          });

          throw error; // Re-throw to be caught by outer try-catch
        }
        break;
      }

      case 'session.created': {
        const sessionData = event.data as SessionEventData;

        console.log('Session created event received:', {
          sessionId: sessionData.id,
          userId: sessionData.user_id,
          status: sessionData.status,
          createdAt: new Date(sessionData.created_at).toISOString(),
        });

        // TODO: Future implementation
        // - Update user's last_sign_in_at timestamp
        // - Log session analytics
        // - Track user engagement metrics
        // - Initialize session-specific resources

        // Store webhook event for audit
        try {
          await storeWebhookEvent({
            event_id: event.data.id || `session.created-${Date.now()}`,
            event_type: eventType,
            object_type: 'session',
            object_id: sessionData.id,
            payload: event.data,
            processed: true,
            processed_at: null,
            error_message: null,
          });
        } catch (error) {
          console.error('Error storing session.created webhook event:', error);
          // Don't throw - session logging is not critical
        }
        break;
      }

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
  type: 'user.created' | 'user.updated' | 'user.deleted' | 'session.created';
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
    verification?: {
      status: string;
    };
  }>;
  first_name?: string;
  last_name?: string;
  username?: string;
  profile_image_url?: string;
  created_at: number;
  updated_at: number;
  last_sign_in_at?: number;
  banned?: boolean;
  public_metadata?: Record<string, any>;
  private_metadata?: Record<string, any>;
  unsafe_metadata?: Record<string, any>;
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
