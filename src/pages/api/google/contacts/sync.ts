/**
 * POST /api/google/contacts/sync
 * Trigger incremental or full sync from Google Contacts to email_contacts
 */

import type { APIRoute } from 'astro';
import { findUserByClerkId } from '../../../../lib/db/repositories/users';
import { listContacts, type Contact } from '../../../../lib/google-contacts';
import {
  getSyncState,
  markSyncInProgress,
  markSyncCompleted,
  markSyncFailed,
  clearSyncToken,
} from '../../../../lib/db/repositories/contact-sync-state';
import {
  findByResourceName as findSourceByResourceName,
  createSource,
  updateSyncStatus,
} from '../../../../lib/db/repositories/contact-sources';
import {
  upsertContact,
  updateGoogleResourceName,
  findById as findContactById,
} from '../../../../lib/db/repositories/email-contacts';
import { withUserMutex } from '../../../../lib/sync-queue';
import { findPrimaryTokenByUserId } from '../../../../lib/db/repositories/google-oauth';

export const prerender = false;

interface SyncResponse {
  success: boolean;
  synced: number;
  created: number;
  updated: number;
  deleted: number;
  syncType: 'incremental' | 'full';
}

export const POST: APIRoute = async ({ locals, request }) => {
  try {
    // 1. Auth check
    const auth = await locals.auth();
    if (!auth.userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Find database user
    const user = await findUserByClerkId(auth.userId);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Get googleAccountEmail from query param or smart inference
    const url = new URL(request.url);
    let googleAccountEmail = url.searchParams.get('googleAccountEmail');

    // Smart inference: use primary account if not specified
    if (!googleAccountEmail) {
      const primaryToken = await findPrimaryTokenByUserId(user.id);
      if (!primaryToken?.google_account_email) {
        return new Response(
          JSON.stringify({ error: 'No Google account connected. Please connect a Google account first.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      googleAccountEmail = primaryToken.google_account_email;
    }

    // 3. Execute sync with user mutex
    const result = await withUserMutex<SyncResponse>(auth.userId, async () => {
      // Get sync state
      const syncState = await getSyncState(user.id, googleAccountEmail!);
      const syncToken = syncState?.sync_token || null;

      // Mark sync as in progress
      await markSyncInProgress(user.id, googleAccountEmail!);

      let contacts: Contact[] = [];
      let nextSyncToken: string | undefined;
      let syncType: 'incremental' | 'full' = 'full';

      try {
        // 4. Attempt sync with sync token if available
        if (syncToken) {
          try {
            const response = await listContacts(user.id, {
              syncToken,
              googleAccountEmail,
            });
            contacts = response.contacts;
            nextSyncToken = response.nextSyncToken;
            syncType = 'incremental';
          } catch (error: any) {
            // 5. Handle 410 error - sync token expired
            if (error.message?.includes('Sync token expired') || error.message?.includes('410')) {
              console.log(`[Contacts Sync] Sync token expired for ${googleAccountEmail}, performing full sync`);
              await clearSyncToken(user.id, googleAccountEmail!);
              // Fall through to full sync
            } else {
              throw error;
            }
          }
        }

        // Perform full sync if no sync token or token expired
        if (contacts.length === 0 && syncType === 'full') {
          const response = await listContacts(user.id, { googleAccountEmail });
          contacts = response.contacts;
          nextSyncToken = response.nextSyncToken;
        }

        // 6. Process contacts
        let created = 0;
        let updated = 0;
        let deleted = 0;

        for (const contact of contacts) {
          // Check if contact has metadata.deleted flag (People API v1 pattern)
          const isDeleted = (contact as any).metadata?.deleted === true;

          if (isDeleted) {
            // Handle deleted contacts
            const source = await findSourceByResourceName(contact.resourceName, googleAccountEmail!);
            if (source) {
              // Mark as deleted in our system (could delete or soft-delete)
              // For now, we'll just skip syncing deleted contacts
              deleted++;
            }
            continue;
          }

          // Extract primary email from contact
          const primaryEmail = contact.emailAddresses?.[0]?.value;
          if (!primaryEmail) {
            // Skip contacts without email addresses
            continue;
          }

          // Extract contact data
          const displayName = contact.names?.[0]?.displayName || contact.names?.[0]?.givenName || null;
          const organization = contact.organizations?.[0]?.name || null;
          const phoneNumbers = contact.phoneNumbers?.map((p) => p.value) || [];
          const addresses = contact.addresses?.map((a) =>
            [a.streetAddress, a.city, a.region, a.postalCode, a.country]
              .filter(Boolean)
              .join(', ')
          ) || [];

          // Check if contact source exists
          const existingSource = await findSourceByResourceName(contact.resourceName, googleAccountEmail!);

          if (existingSource) {
            // 7. Update existing contact
            const emailContact = await findContactById(existingSource.email_contact_id);
            if (emailContact) {
              await upsertContact(user.id, primaryEmail, {
                display_name: displayName,
                organization,
                phone_numbers: phoneNumbers,
                addresses,
              });

              // Update etag in contact_sources
              await updateSyncStatus(existingSource.id, contact.etag);
              updated++;
            }
          } else {
            // 8. Create new contact
            const newContact = await upsertContact(user.id, primaryEmail, {
              display_name: displayName,
              organization,
              phone_numbers: phoneNumbers,
              addresses,
            });

            // Update Google resource name
            await updateGoogleResourceName(newContact.id, contact.resourceName);

            // Create contact source entry
            await createSource({
              email_contact_id: newContact.id,
              provider: 'google_contacts',
              external_id: contact.resourceName,
              external_resource_name: contact.resourceName,
              account_email: googleAccountEmail!,
              etag: contact.etag,
              sync_direction: 'import',
              metadata: null,
            });

            created++;
          }
        }

        // 9. Update sync state
        await markSyncCompleted(user.id, googleAccountEmail!, nextSyncToken || null, syncType === 'full');

        return {
          success: true,
          synced: contacts.length,
          created,
          updated,
          deleted,
          syncType,
        };
      } catch (error: any) {
        // Mark sync as failed
        await markSyncFailed(user.id, googleAccountEmail!, error.message || 'Unknown sync error');
        throw error;
      }
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[Contacts Sync] Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to sync contacts',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
