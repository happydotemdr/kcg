import { useState, useEffect } from 'react';

interface AISuggestion {
  entityType: string;
  confidence: number;
  reasoning: string;
}

interface Contact {
  id: string;
  email: string;
  name: string | null;
  domain: string;
  aiSuggestion: AISuggestion | null;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  firstSeenAt: string;
  emailCount: number;
}

interface VerificationQueueProps {
  onVerificationComplete?: () => void;
}

export default function VerificationQueue({ onVerificationComplete }: VerificationQueueProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/contacts/verification-queue');
      if (!response.ok) {
        throw new Error('Failed to load verification queue');
      }
      const data = await response.json();
      setContacts(data.contacts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (contactId: string, action: 'approve' | 'reject', modifiedType?: string) => {
    setProcessingIds(prev => new Set(prev).add(contactId));
    try {
      const response = await fetch('/api/contacts/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId,
          action,
          entityType: modifiedType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to verify contact');
      }

      // Remove from queue on success
      setContacts(prev => prev.filter(c => c.id !== contactId));
      onVerificationComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(contactId);
        return newSet;
      });
    }
  };

  const handleBatchApprove = async (domain: string) => {
    const domainContacts = contacts.filter(c => c.domain === domain);
    const domainIds = new Set(domainContacts.map(c => c.id));
    setProcessingIds(prev => new Set([...prev, ...domainIds]));

    try {
      await Promise.all(
        domainContacts.map(contact =>
          fetch('/api/contacts/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contactId: contact.id,
              action: 'approve',
            }),
          })
        )
      );

      setContacts(prev => prev.filter(c => c.domain !== domain));
      onVerificationComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        domainIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
  };

  const handleModify = (contactId: string) => {
    const newType = prompt('Enter entity type (Family, Personal, Work, School, Coach, Friend):');
    if (newType) {
      handleVerify(contactId, 'approve', newType.toLowerCase());
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500/10 text-green-400 border-green-500/20';
    if (confidence >= 0.6) return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
  };

  // Group by domain for batch actions
  const domainGroups = contacts.reduce((acc, contact) => {
    const domain = contact.domain;
    if (!acc[domain]) {
      acc[domain] = [];
    }
    acc[domain].push(contact);
    return acc;
  }, {} as Record<string, Contact[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-700 border-t-purple-500" />
          <p className="text-sm text-gray-400">Loading verification queue...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-red-400">Error: {error}</p>
        </div>
        <button
          onClick={loadQueue}
          className="mt-3 text-sm text-red-300 hover:text-red-200 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <svg className="h-12 w-12 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-300 mb-2">All caught up!</h3>
        <p className="text-sm text-gray-500">No contacts pending verification</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-200">Verification Queue</h2>
          <p className="text-sm text-gray-400 mt-1">{contacts.length} contact{contacts.length !== 1 ? 's' : ''} pending review</p>
        </div>
        <button
          onClick={loadQueue}
          className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-300 border border-gray-700 rounded-md hover:bg-gray-800 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Domain Groups with Batch Actions */}
      {Object.entries(domainGroups).map(([domain, domainContacts]) => (
        <div key={domain} className="space-y-3">
          {domainContacts.length > 1 && (
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Domain:</span>
                <span className="text-sm font-medium text-gray-300">{domain}</span>
                <span className="text-xs text-gray-500">({domainContacts.length} contacts)</span>
              </div>
              <button
                onClick={() => handleBatchApprove(domain)}
                disabled={domainContacts.some(c => processingIds.has(c.id))}
                className="px-3 py-1 text-xs font-medium text-green-400 hover:text-green-300 border border-green-500/20 rounded-md hover:bg-green-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Approve all from @{domain}
              </button>
            </div>
          )}

          {/* Contact Cards */}
          {domainContacts.map(contact => (
            <div
              key={contact.id}
              className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Contact Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-base font-semibold text-gray-200 truncate">
                      {contact.name || contact.email}
                    </h3>
                    <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-400 rounded-full">
                      {contact.emailCount} email{contact.emailCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {contact.name && (
                    <p className="text-sm text-gray-400 mb-3">{contact.email}</p>
                  )}

                  {/* AI Suggestion */}
                  {contact.aiSuggestion && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">AI suggests:</span>
                        <span className="text-sm font-medium text-purple-400 capitalize">
                          {contact.aiSuggestion.entityType}
                        </span>
                        <span className={`text-xs px-2 py-0.5 border rounded-full ${getConfidenceBadge(contact.aiSuggestion.confidence)}`}>
                          {(contact.aiSuggestion.confidence * 100).toFixed(0)}% confidence
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        {contact.aiSuggestion.reasoning}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => handleVerify(contact.id, 'approve')}
                    disabled={processingIds.has(contact.id)}
                    className="px-3 py-1.5 text-sm font-medium text-green-400 hover:text-green-300 border border-green-500/20 rounded-md hover:bg-green-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    title="Approve"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Approve
                  </button>
                  <button
                    onClick={() => handleModify(contact.id)}
                    disabled={processingIds.has(contact.id)}
                    className="px-3 py-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 border border-blue-500/20 rounded-md hover:bg-blue-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    title="Modify"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Modify
                  </button>
                  <button
                    onClick={() => handleVerify(contact.id, 'reject')}
                    disabled={processingIds.has(contact.id)}
                    className="px-3 py-1.5 text-sm font-medium text-red-400 hover:text-red-300 border border-red-500/20 rounded-md hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    title="Reject"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Reject
                  </button>
                </div>
              </div>

              {processingIds.has(contact.id) && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-600 border-t-purple-500" />
                    Processing...
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
