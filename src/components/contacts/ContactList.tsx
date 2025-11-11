/**
 * ContactList Component
 * Displays a filterable, searchable, paginated list of email contacts
 */

import React, { useState, useEffect } from 'react';
import type { EmailContact, ContactSourceType, ContactVerificationStatus } from '../../lib/db/types';
import ContactCard from './ContactCard';

interface ContactListProps {
  userId: string;
}

interface ListResponse {
  success: boolean;
  contacts: EmailContact[];
  count: number;
  page: number;
  limit: number;
}

export default function ContactList({ userId }: ContactListProps) {
  const [contacts, setContacts] = useState<EmailContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [sourceType, setSourceType] = useState<ContactSourceType | 'all'>('all');
  const [verificationStatus, setVerificationStatus] = useState<ContactVerificationStatus | 'all'>('all');
  const [minConfidence, setMinConfidence] = useState(0);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // Detail modal
  const [selectedContact, setSelectedContact] = useState<EmailContact | null>(null);

  const fetchContacts = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        minConfidence: minConfidence.toString(),
      });

      if (sourceType !== 'all') params.append('sourceType', sourceType);
      if (verificationStatus !== 'all') params.append('verificationStatus', verificationStatus);
      if (search.trim()) params.append('search', search.trim());

      const response = await fetch(`/api/contacts/list?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }

      const data: ListResponse = await response.json();
      setContacts(data.contacts);
      setTotalCount(data.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [page, sourceType, verificationStatus, minConfidence, search]);

  const totalPages = Math.ceil(totalCount / limit);

  const handleContactClick = (contact: EmailContact) => {
    setSelectedContact(contact);
  };

  const handleCloseModal = () => {
    setSelectedContact(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 p-4 bg-gray-800 rounded border border-gray-700">
        {/* Search */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-300">Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); // Reset to first page on search
            }}
            placeholder="Name, email, or organization..."
            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Source Type */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-300">Source Type</label>
            <select
              value={sourceType}
              onChange={(e) => {
                setSourceType(e.target.value as ContactSourceType | 'all');
                setPage(1);
              }}
              className="px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="coach">Coach</option>
              <option value="teacher">Teacher</option>
              <option value="school_admin">School Admin</option>
              <option value="team">Team</option>
              <option value="club">Club</option>
              <option value="therapist">Therapist</option>
              <option value="medical">Medical</option>
              <option value="vendor">Vendor</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Verification Status */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-300">Verification Status</label>
            <select
              value={verificationStatus}
              onChange={(e) => {
                setVerificationStatus(e.target.value as ContactVerificationStatus | 'all');
                setPage(1);
              }}
              className="px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="unverified">Unverified</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Min Confidence */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-300">
              Min Confidence: {minConfidence.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={minConfidence}
              onChange={(e) => {
                setMinConfidence(parseFloat(e.target.value));
                setPage(1);
              }}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8 text-gray-400">
          Loading contacts...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-800 rounded text-red-400">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && contacts.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          No contacts found. Try adjusting your filters.
        </div>
      )}

      {/* Contact List */}
      {!loading && !error && contacts.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => handleContactClick(contact)}
                className="cursor-pointer hover:bg-gray-800/50 rounded transition-colors"
              >
                <ContactCard contact={contact} />
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-gray-800 rounded border border-gray-700">
              <div className="text-sm text-gray-400">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of {totalCount} contacts
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {selectedContact && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseModal}
        >
          <div
            className="bg-gray-800 rounded-lg border border-gray-700 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Contact Details</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="text-sm text-gray-400">Name</div>
                <div className="text-white">{selectedContact.display_name || 'N/A'}</div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-gray-400">Email</div>
                <div className="text-white font-mono">{selectedContact.email}</div>
              </div>

              {selectedContact.organization && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-400">Organization</div>
                  <div className="text-white">{selectedContact.organization}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-gray-400">Source Type</div>
                  <div className="text-white">{selectedContact.source_type || 'N/A'}</div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-gray-400">Verification Status</div>
                  <div className="text-white">{selectedContact.verification_status}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-gray-400">Confidence Score</div>
                  <div className="text-white">{selectedContact.confidence_score.toFixed(2)}</div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-gray-400">Email Count</div>
                  <div className="text-white">{selectedContact.email_count}</div>
                </div>
              </div>

              {selectedContact.tags.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-400">Tags</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedContact.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-gray-400">First Seen</div>
                  <div className="text-white text-sm">
                    {new Date(selectedContact.first_seen).toLocaleDateString()}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-gray-400">Last Seen</div>
                  <div className="text-white text-sm">
                    {new Date(selectedContact.last_seen).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {selectedContact.notes && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-400">Notes</div>
                  <div className="text-white text-sm">{selectedContact.notes}</div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 p-4 border-t border-gray-700">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
