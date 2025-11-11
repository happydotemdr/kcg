import { useState } from 'react';
import type { EmailContact } from '@/lib/db/types';

interface ContactCardProps {
  contact: EmailContact;
  onVerify?: (contactId: string, action: string) => void;
  showActions?: boolean;
}

const SOURCE_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  coach: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' },
  teacher: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e' },
  school_admin: { bg: 'rgba(168, 85, 247, 0.1)', text: '#a855f7' },
  team: { bg: 'rgba(249, 115, 22, 0.1)', text: '#f97316' },
  club: { bg: 'rgba(236, 72, 153, 0.1)', text: '#ec4899' },
  therapist: { bg: 'rgba(6, 182, 212, 0.1)', text: '#06b6d4' },
  medical: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' },
  vendor: { bg: 'rgba(180, 83, 9, 0.1)', text: '#b45309' },
  other: { bg: 'rgba(107, 114, 128, 0.1)', text: '#6b7280' },
};

function getTrustIndicator(status: string): { icon: string; label: string; color: string } {
  switch (status) {
    case 'verified':
      return { icon: '✅', label: 'Verified', color: '#22c55e' };
    case 'pending':
      return { icon: '⏳', label: 'Pending', color: '#f59e0b' };
    case 'rejected':
      return { icon: '❌', label: 'Rejected', color: '#ef4444' };
    default:
      return { icon: '❓', label: 'Unverified', color: '#6b7280' };
  }
}

export default function ContactCard({
  contact,
  onVerify,
  showActions = true,
}: ContactCardProps) {
  const [loading, setLoading] = useState(false);
  const trust = getTrustIndicator(contact.verification_status);
  const sourceColor = SOURCE_TYPE_COLORS[contact.source_type || 'other'];

  const handleVerify = async () => {
    if (!onVerify) return;
    setLoading(true);
    try {
      await onVerify(contact.id, 'verify');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Header: Email and Source Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--color-text)',
              marginBottom: '0.25rem',
              wordBreak: 'break-all',
            }}
          >
            {contact.email}
          </div>
          {contact.display_name && (
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-light)',
              }}
            >
              {contact.display_name}
            </div>
          )}
        </div>

        {contact.source_type && (
          <div
            style={{
              background: sourceColor.bg,
              color: sourceColor.text,
              padding: '0.25rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 600,
              marginLeft: '0.5rem',
              whiteSpace: 'nowrap',
            }}
          >
            {contact.source_type.replace('_', ' ')}
          </div>
        )}
      </div>

      {/* Organization */}
      {contact.organization && (
        <div
          style={{
            fontSize: '0.875rem',
            color: 'var(--color-text-light)',
            marginBottom: '1rem',
          }}
        >
          {contact.organization}
        </div>
      )}

      {/* Trust Indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1rem',
          fontSize: '0.875rem',
        }}
      >
        <span style={{ fontSize: '1rem' }}>{trust.icon}</span>
        <span style={{ color: trust.color, fontWeight: 600 }}>{trust.label}</span>
      </div>

      {/* Confidence Meter */}
      <div style={{ marginBottom: '1rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem',
          }}
        >
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-light)',
              fontWeight: 600,
            }}
          >
            Confidence
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--color-primary)',
            }}
          >
            {Math.round(contact.confidence_score * 100)}%
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: '0.375rem',
            background: 'var(--color-background)',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${contact.confidence_score * 100}%`,
              background: 'var(--color-primary)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Email Count Badge */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '0.25rem 0.75rem',
          background: 'rgba(59, 130, 246, 0.1)',
          color: '#3b82f6',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.75rem',
          fontWeight: 600,
          marginBottom: '1rem',
          marginRight: '0.5rem',
        }}
      >
        📧 {contact.email_count} email{contact.email_count !== 1 ? 's' : ''}
      </div>

      {/* Phone Numbers */}
      {contact.phone_numbers.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--color-text-light)',
              marginBottom: '0.5rem',
            }}
          >
            Phone
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}
          >
            {contact.phone_numbers.map((phone, idx) => (
              <div
                key={idx}
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--color-text)',
                  fontFamily: '"IBM Plex Mono", monospace',
                }}
              >
                {phone}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {contact.tags.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            {contact.tags.map((tag) => (
              <div
                key={tag}
                style={{
                  padding: '0.25rem 0.5rem',
                  background: 'var(--color-background)',
                  color: 'var(--color-text-light)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      {showActions && contact.verification_status !== 'verified' && onVerify && (
        <button
          onClick={handleVerify}
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.5rem 1rem',
            background: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'opacity 0.2s ease',
          }}
        >
          {loading ? 'Verifying...' : 'Verify Contact'}
        </button>
      )}
    </div>
  );
}
