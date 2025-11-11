/**
 * Google Contacts Integration
 * Handles People API v1 operations for contacts management
 */

import { google } from 'googleapis';
import type { people_v1 } from 'googleapis';
import { createOAuth2Client } from './google-calendar';
import { findTokenByUserId } from './db/repositories/google-oauth';

/**
 * Contact data for create/update operations
 */
export interface ContactData {
  names?: Array<{
    givenName?: string;
    familyName?: string;
    displayName?: string;
  }>;
  emailAddresses?: Array<{
    value: string;
    type?: string;
  }>;
  phoneNumbers?: Array<{
    value: string;
    type?: string;
  }>;
  addresses?: Array<{
    streetAddress?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
    type?: string;
  }>;
  organizations?: Array<{
    name?: string;
    title?: string;
  }>;
  biographies?: Array<{
    value: string;
  }>;
}

/**
 * Contact response from People API
 */
export interface Contact {
  resourceName: string;
  etag: string;
  names?: ContactData['names'];
  emailAddresses?: ContactData['emailAddresses'];
  phoneNumbers?: ContactData['phoneNumbers'];
  addresses?: ContactData['addresses'];
  organizations?: ContactData['organizations'];
  biographies?: ContactData['biographies'];
}

/**
 * Get authenticated People API client
 */
export async function getContactsClient(userId: string, googleAccountEmail?: string) {
  const tokenData = await findTokenByUserId(userId, googleAccountEmail);

  if (!tokenData) {
    throw new Error('No Google connection found. Please connect your Google account first.');
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    token_type: tokenData.token_type,
    expiry_date: tokenData.expiry_date,
  });

  return google.people({ version: 'v1', auth: oauth2Client });
}

/**
 * List contacts with optional pagination and sync token
 */
export async function listContacts(
  userId: string,
  opts?: {
    pageToken?: string;
    pageSize?: number;
    syncToken?: string;
    googleAccountEmail?: string;
  }
): Promise<{
  contacts: Contact[];
  nextPageToken?: string;
  nextSyncToken?: string;
}> {
  try {
    const people = await getContactsClient(userId, opts?.googleAccountEmail);

    const response = await people.people.connections.list({
      resourceName: 'people/me',
      pageSize: opts?.pageSize || 100,
      pageToken: opts?.pageToken,
      syncToken: opts?.syncToken,
      personFields: 'names,emailAddresses,phoneNumbers,addresses,organizations,biographies,metadata',
    });

    const connections = response.data.connections || [];

    return {
      contacts: connections.map((person: people_v1.Schema$Person) => ({
        resourceName: person.resourceName!,
        etag: person.etag!,
        names: person.names,
        emailAddresses: person.emailAddresses,
        phoneNumbers: person.phoneNumbers,
        addresses: person.addresses,
        organizations: person.organizations,
        biographies: person.biographies,
      })),
      nextPageToken: response.data.nextPageToken || undefined,
      nextSyncToken: response.data.nextSyncToken || undefined,
    };
  } catch (error: any) {
    // Handle sync token expired (410)
    if (error.code === 410) {
      throw new Error('Sync token expired. Please perform full sync.');
    }
    console.error('[Contacts] Error listing contacts:', error);
    throw new Error(`Failed to list contacts: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Batch create contacts (max 200 per request)
 */
export async function batchCreateContacts(
  userId: string,
  contacts: ContactData[],
  googleAccountEmail?: string
): Promise<{
  created: Contact[];
  errors: Array<{ index: number; message: string }>;
}> {
  try {
    if (contacts.length > 200) {
      throw new Error('Maximum 200 contacts per batch create request');
    }

    const people = await getContactsClient(userId, googleAccountEmail);

    const response = await people.people.batchCreateContacts({
      requestBody: {
        contacts: contacts.map((contact) => ({
          contactPerson: contact,
        })),
        readMask: 'names,emailAddresses,phoneNumbers,addresses,organizations,biographies,metadata',
      },
    });

    const createdPeople = response.data.createdPeople || [];

    return {
      created: createdPeople
        .filter((pr) => pr.person)
        .map((pr) => ({
          resourceName: pr.person!.resourceName!,
          etag: pr.person!.etag!,
          names: pr.person!.names,
          emailAddresses: pr.person!.emailAddresses,
          phoneNumbers: pr.person!.phoneNumbers,
          addresses: pr.person!.addresses,
          organizations: pr.person!.organizations,
          biographies: pr.person!.biographies,
        })),
      errors: createdPeople
        .filter((pr) => !pr.person)
        .map((pr, idx) => ({
          index: idx,
          message: 'Failed to create contact',
        })),
    };
  } catch (error: any) {
    console.error('[Contacts] Error batch creating contacts:', error);
    throw new Error(`Failed to batch create contacts: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Batch update contacts (max 200 per request)
 * @param contacts - Map of resourceName to ContactData
 */
export async function batchUpdateContacts(
  userId: string,
  contacts: Map<string, ContactData>,
  googleAccountEmail?: string
): Promise<{
  updated: Contact[];
  errors: Array<{ resourceName: string; message: string }>;
}> {
  try {
    if (contacts.size > 200) {
      throw new Error('Maximum 200 contacts per batch update request');
    }

    const people = await getContactsClient(userId, googleAccountEmail);

    const contactsObj: { [key: string]: people_v1.Schema$Person } = {};
    contacts.forEach((data, resourceName) => {
      contactsObj[resourceName] = data as people_v1.Schema$Person;
    });

    const response = await people.people.batchUpdateContacts({
      requestBody: {
        contacts: contactsObj,
        updateMask: 'names,emailAddresses,phoneNumbers,addresses,organizations,biographies',
        readMask: 'names,emailAddresses,phoneNumbers,addresses,organizations,biographies,metadata',
      },
    });

    const updateResult = response.data.updateResult || {};

    const updated: Contact[] = [];
    const errors: Array<{ resourceName: string; message: string }> = [];

    Object.entries(updateResult).forEach(([resourceName, personResponse]) => {
      if (personResponse.person) {
        updated.push({
          resourceName: personResponse.person.resourceName!,
          etag: personResponse.person.etag!,
          names: personResponse.person.names,
          emailAddresses: personResponse.person.emailAddresses,
          phoneNumbers: personResponse.person.phoneNumbers,
          addresses: personResponse.person.addresses,
          organizations: personResponse.person.organizations,
          biographies: personResponse.person.biographies,
        });
      } else {
        errors.push({
          resourceName,
          message: personResponse.status?.message || 'Failed to update contact',
        });
      }
    });

    return { updated, errors };
  } catch (error: any) {
    console.error('[Contacts] Error batch updating contacts:', error);
    throw new Error(`Failed to batch update contacts: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Delete a single contact (max 500 per batch delete request)
 */
export async function deleteContact(
  userId: string,
  resourceName: string,
  googleAccountEmail?: string
): Promise<void> {
  try {
    const people = await getContactsClient(userId, googleAccountEmail);

    await people.people.deleteContact({
      resourceName,
    });

    console.log(`[Contacts] Deleted contact: ${resourceName}`);
  } catch (error: any) {
    console.error('[Contacts] Error deleting contact:', error);
    throw new Error(`Failed to delete contact: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Batch delete contacts (max 500 per request)
 */
export async function batchDeleteContacts(
  userId: string,
  resourceNames: string[],
  googleAccountEmail?: string
): Promise<void> {
  try {
    if (resourceNames.length > 500) {
      throw new Error('Maximum 500 contacts per batch delete request');
    }

    const people = await getContactsClient(userId, googleAccountEmail);

    await people.people.batchDeleteContacts({
      requestBody: {
        resourceNames,
      },
    });

    console.log(`[Contacts] Deleted ${resourceNames.length} contacts`);
  } catch (error: any) {
    console.error('[Contacts] Error batch deleting contacts:', error);
    throw new Error(`Failed to batch delete contacts: ${error.message || 'Unknown error'}`);
  }
}
