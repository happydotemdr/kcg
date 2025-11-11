/**
 * POST /api/google/contacts/export
 * Export email_contact to Google Contacts
 */

import type { APIRoute } from 'astro';
import { findUserByClerkId } from '../../../../lib/db/repositories/users';
import {
  batchCreateContacts,
  batchUpdateContacts,
  type ContactData,
} from '../../../../lib/google-contacts';
import {
  findByEmailContactId,
  createSource,
  updateSyncStatus,
} from '../../../../lib/db/repositories/contact-sources';
import {
  findById as findContactById,
  updateGoogleResourceName,
} from '../../../../lib/db/repositories/email-contacts';
import { withUserMutex } from '../../../../lib/sync-queue';
import { findPrimaryTokenByUserId } from '../../../../lib/db/repositories/google-oauth';

export const prerender = false;

interface ExportRequest {
  contactId: string;
  googleAccountEmail?: string;
}

interface ExportResponse {
  success: boolean;
  resourceName: string;
  action: 'created' | 'updated';
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

    // 2. Parse request body
    const body: ExportRequest = await request.json();
    const { contactId } = body;
    let { googleAccountEmail } = body;

    if (!contactId) {
      return new Response(JSON.stringify({ error: 'contactId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

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

    // 3. Get contact from database
    const contact = await findContactById(contactId);
    if (!contact) {
      return new Response(JSON.stringify({ error: 'Contact not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify contact belongs to user
    if (contact.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized access to contact' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Execute export with user mutex
    const result = await withUserMutex<ExportResponse>(auth.userId, async () => {
      // Check if already exported
      const sources = await findByEmailContactId(contactId);
      const googleSource = sources.find((s) => s.provider === 'google_contacts' && s.account_email === googleAccountEmail);

      // Build contact data
      const contactData: ContactData = {
        emailAddresses: [{ value: contact.email, type: 'home' }],
      };

      if (contact.display_name) {
        const nameParts = contact.display_name.split(' ');
        contactData.names = [{
          givenName: nameParts[0],
          familyName: nameParts.slice(1).join(' ') || undefined,
          displayName: contact.display_name,
        }];
      }

      if (contact.phone_numbers && contact.phone_numbers.length > 0) {
        contactData.phoneNumbers = contact.phone_numbers.map((phone) => ({
          value: phone,
          type: 'mobile',
        }));
      }

      if (contact.addresses && contact.addresses.length > 0) {
        // Convert string addresses back to structured format
        // Since addresses are stored as strings, we'll use the first one as a full address
        contactData.addresses = contact.addresses.map((addrStr) => ({
          streetAddress: addrStr,
          type: 'home',
        }));
      }

      if (contact.organization) {
        contactData.organizations = [{
          name: contact.organization,
        }];
      }

      if (contact.notes) {
        contactData.biographies = [{
          value: contact.notes,
        }];
      }

      if (googleSource) {
        // 5. Update existing contact
        const updates = new Map<string, ContactData>();
        updates.set(googleSource.external_resource_name, contactData);

        const response = await batchUpdateContacts(user.id, updates, googleAccountEmail);

        if (response.errors.length > 0) {
          throw new Error(`Failed to update contact: ${response.errors[0].message}`);
        }

        const updated = response.updated[0];

        // Update etag in contact_sources
        await updateSyncStatus(googleSource.id, updated.etag);

        return {
          success: true,
          resourceName: updated.resourceName,
          action: 'updated' as const,
        };
      } else {
        // 6. Create new contact
        const response = await batchCreateContacts(user.id, [contactData], googleAccountEmail);

        if (response.errors.length > 0) {
          throw new Error(`Failed to create contact: ${response.errors[0].message}`);
        }

        const created = response.created[0];

        // 7. Store resourceName + etag in contact_sources
        await createSource({
          email_contact_id: contactId,
          provider: 'google_contacts',
          external_id: created.resourceName,
          external_resource_name: created.resourceName,
          account_email: googleAccountEmail!,
          etag: created.etag,
          sync_direction: 'export',
          metadata: null,
        });

        // 8. Update email_contact.google_contact_resource_name
        await updateGoogleResourceName(contactId, created.resourceName);

        return {
          success: true,
          resourceName: created.resourceName,
          action: 'created' as const,
        };
      }
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[Contacts Export] Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to export contact',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
