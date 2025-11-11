/**
 * Email contact extraction utilities
 * Parses signatures for contact info and infers source type from domain
 */

export interface ContactInfo {
  emails: string[];
  phones: string[];
  organization?: string;
}

/**
 * Extract contact information from email signature
 * Handles multiple emails, phones, and organization names
 */
export function extractContactFromSignature(plainText: string): ContactInfo {
  if (!plainText || typeof plainText !== 'string') {
    return { emails: [], phones: [] };
  }

  const emails: string[] = [];
  const phones: string[] = [];
  let organization: string | undefined;

  // Split into lines for parsing
  const lines = plainText.split('\n');

  // Email regex: standard email format
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  // Phone regex: (xxx) xxx-xxxx, xxx-xxx-xxxx, xxx.xxx.xxxx
  const phoneRegex = /(?:\(\d{3}\)\s*\d{3}[-.]?\d{4}|\d{3}[-.]?\d{3}[-.]?\d{4})/g;

  for (const line of lines) {
    // Extract emails
    const emailMatches = line.match(emailRegex);
    if (emailMatches) {
      emails.push(...emailMatches);
    }

    // Extract phones
    const phoneMatches = line.match(phoneRegex);
    if (phoneMatches) {
      phones.push(...phoneMatches);
    }

    // Extract organization from lines starting with "Company:"
    if (line.trim().toLowerCase().startsWith('company:')) {
      organization = line.replace(/company:\s*/i, '').trim();
    }

    // Try to infer organization from lines before phone/email
    if (!organization && (emailMatches || phoneMatches)) {
      // Look at previous non-empty line as potential org name
      for (let i = lines.indexOf(line) - 1; i >= 0; i--) {
        const prevLine = lines[i].trim();
        if (prevLine && !prevLine.includes('@') && prevLine.length > 0) {
          // Skip if line looks like a name (typically short, capitalized)
          if (prevLine.length < 50 && /^[A-Z]/.test(prevLine)) {
            organization = prevLine;
            break;
          }
        }
      }
    }
  }

  // Remove duplicates
  const uniqueEmails = [...new Set(emails)];
  const uniquePhones = [...new Set(phones)];

  const result: ContactInfo = {
    emails: uniqueEmails,
    phones: uniquePhones,
  };

  if (organization) {
    result.organization = organization;
  }

  return result;
}

/**
 * Infer source type from email domain
 * Classifies emails by domain patterns
 */
export function inferSourceTypeFromDomain(email: string): string {
  if (!email || typeof email !== 'string') {
    return 'other';
  }

  const domain = extractDomain(email).toLowerCase();

  // Coach domains
  const coachDomains = [
    'teamsnap.com',
    'leagueapps.com',
    'sportsengine.com',
    'bluesombrero.com',
  ];
  if (coachDomains.some((d) => domain.includes(d))) {
    return 'coach';
  }

  // School/teacher domains
  if (domain.endsWith('.edu')) {
    return 'teacher';
  }

  const teacherKeywords = ['teacher', 'school'];
  if (teacherKeywords.some((k) => domain.includes(k))) {
    return 'teacher';
  }

  // School admin domains
  const adminKeywords = ['school', 'principal', 'superintendent', 'district'];
  if (adminKeywords.some((k) => domain.includes(k))) {
    return 'school_admin';
  }

  // Medical domains
  const medicalKeywords = ['dr.', 'doctor', 'therapy', 'pediatric', 'clinic'];
  if (medicalKeywords.some((k) => domain.includes(k))) {
    return 'medical';
  }

  // Team/league domains
  const teamKeywords = ['team', 'league', 'sports'];
  if (teamKeywords.some((k) => domain.includes(k))) {
    return 'team';
  }

  return 'other';
}

/**
 * Extract domain from email address
 * Returns empty string if invalid email format
 */
export function extractDomain(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }

  const parts = email.split('@');
  return parts.length === 2 ? parts[1] : '';
}
