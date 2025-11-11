# Contact Intelligence System

## Overview

The Contact Intelligence System is an AI-powered contact management layer that automatically extracts, classifies, and verifies important contacts from your emails. It identifies coaches, teachers, therapists, school administrators, and other trusted sources, enabling smart automation and natural language queries like "Who is Jake's soccer coach?"

## Key Features

### 1. **Automatic Contact Extraction**
- Extracts contacts from email metadata (senders, recipients)
- Parses email signatures for names, organizations, phone numbers, addresses
- Builds contact profiles automatically during email sync
- Incremental updates as new emails arrive

### 2. **AI-Powered Classification**
- Automatically categorizes contacts by type (coach, teacher, therapist, etc.)
- Analyzes email content and patterns to infer relationships
- Confidence scoring for each classification
- Smart tagging (e.g., 'soccer', 'school', 'medical')

### 3. **User Verification Workflow**
- Pending verification queue for high-confidence contacts
- Auto-verification for contacts with 3+ emails and 75%+ confidence
- Manual approval/rejection via UI
- User can modify AI suggestions before approving

### 4. **Trust-Based Automation**
- Calendar events from verified sources auto-approve
- Contact trust levels used for decision making
- Confidence scores guide automation thresholds
- Verified contacts enable smart features

### 5. **Natural Language Search**
- Query contacts conversationally via chat
- "Find Jake's soccer coach" retrieves verified contacts
- Filter by type, verification status, organization
- Integration with Claude AI for intelligent lookups

## Architecture

### Database Schema

```sql
-- Contact profiles with classification
email_contacts
├── id (UUID)
├── user_id (Clerk user ID)
├── email (unique per user)
├── display_name
├── organization
├── domain
├── phone_numbers[] (extracted from signatures)
├── addresses[] (extracted from signatures)
├── source_type (coach/teacher/therapist/medical/vendor/etc.)
├── tags[] (user or AI tags)
├── verification_status (unverified/pending/verified/rejected)
├── verification_method (user/ai_auto/calendar_link)
├── verified_at, verified_by
├── confidence_score (0-1)
├── email_count (frequency)
├── first_seen, last_seen
├── linked_calendar_events[] (event IDs)
├── linked_family_members[]
├── extraction_metadata (AI reasoning)
└── notes (user notes)

-- Links emails to contacts
email_contact_associations
├── email_metadata_id → email_metadata(id)
├── contact_id → email_contacts(id)
├── role (sender/recipient/mentioned)
├── extraction_confidence
└── extracted_at

-- Pending verifications queue
contact_verification_queue
├── id (UUID)
├── user_id
├── contact_id → email_contacts(id)
├── suggested_type (AI suggestion)
├── suggested_tags[] (AI tags)
├── reasoning (AI explanation)
├── confidence (AI confidence)
├── sample_email_ids[] (supporting evidence)
├── status (pending/approved/rejected/modified)
└── user_action_at
```

### Processing Pipeline

```
Email Sync
    ↓
Email Processor (email-processor.ts)
    ↓
Contact Extractor (email-contact-extractor.ts)
    ├─→ Extract sender/recipients
    ├─→ Parse email signatures
    └─→ Extract domain, phone, address
    ↓
Contact Classifier (email-contact-processor.ts)
    ├─→ AI classification (Claude)
    ├─→ Confidence scoring
    └─→ Tag generation
    ↓
Repository Layer (email-contacts.ts)
    ├─→ Upsert contact
    ├─→ Create associations
    └─→ Increment email_count
    ↓
Auto-Verification Check
    ├─→ 3+ emails?
    ├─→ Confidence > 75%?
    └─→ Auto-verify OR add to queue
```

### Auto-Verification Rules

Contacts are automatically verified if:
1. **Email Count** ≥ 3 (frequent communication)
2. **Confidence Score** ≥ 0.75 (high AI certainty)
3. **Source Type** is set (clear classification)

Otherwise, contacts are added to the verification queue for user review.

## User Workflows

### 1. Automatic Extraction During Email Sync

Contacts are extracted automatically when you sync emails:

```bash
# Sync emails (contacts extracted automatically)
POST /api/gmail/sync
{
  "accountId": "uuid",
  "maxEmails": 50
}
```

**Behind the scenes:**
1. Email processor fetches emails
2. Contact extractor parses senders, recipients, signatures
3. AI classifier determines contact type and confidence
4. Repository creates/updates contact records
5. Auto-verification check runs
6. High-confidence contacts added to verification queue

### 2. Reviewing Pending Verifications

Visit `/contacts` page to review contacts awaiting verification:

```typescript
// GET /api/contacts/verification-queue
// Returns pending contacts with AI suggestions

{
  "queue": [
    {
      "contact_id": "uuid",
      "suggested_type": "coach",
      "suggested_tags": ["soccer", "youth"],
      "reasoning": "Frequent emails about soccer practice schedules...",
      "confidence": 0.82,
      "sample_email_ids": ["email-uuid-1", "email-uuid-2"],
      "contact": {
        "email": "coach@soccerclub.com",
        "display_name": "Coach Mike",
        "organization": "Youth Soccer Club",
        "email_count": 5
      }
    }
  ]
}
```

### 3. Approving/Rejecting Contacts

**Approve:**
```bash
POST /api/contacts/verify
{
  "contactId": "uuid",
  "action": "approve"
}
```

**Reject:**
```bash
POST /api/contacts/verify
{
  "contactId": "uuid",
  "action": "reject"
}
```

**Modify & Approve:**
```bash
POST /api/contacts/verify
{
  "contactId": "uuid",
  "action": "modify",
  "updates": {
    "source_type": "teacher",
    "tags": ["math", "highschool"]
  }
}
```

### 4. Viewing All Contacts

List all contacts with filtering:

```bash
GET /api/contacts/list?verificationStatus=verified&sourceType=coach&page=1&limit=50
```

**Response:**
```json
{
  "success": true,
  "contacts": [
    {
      "id": "uuid",
      "email": "coach@example.com",
      "display_name": "Coach Sarah",
      "organization": "Basketball Academy",
      "source_type": "coach",
      "tags": ["basketball", "training"],
      "verification_status": "verified",
      "confidence_score": 0.85,
      "email_count": 12,
      "linked_calendar_events": ["event-1", "event-2"]
    }
  ],
  "count": 1,
  "page": 1,
  "limit": 50
}
```

## API Endpoints

### 1. GET /api/contacts/list

List all contacts with optional filtering.

**Query Parameters:**
- `sourceType` - Filter by type (coach, teacher, therapist, etc.)
- `verificationStatus` - Filter by status (verified, pending, unverified)
- `search` - Search name, email, or organization
- `minConfidence` - Minimum confidence score (0-1)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 50, max: 100)

**Example:**
```bash
GET /api/contacts/list?sourceType=teacher&verificationStatus=verified&search=math
```

**Response:**
```json
{
  "success": true,
  "contacts": [...],
  "count": 5,
  "page": 1,
  "limit": 50
}
```

### 2. GET /api/contacts/[id]

Fetch single contact by ID.

**Example:**
```bash
GET /api/contacts/abc-123-uuid
```

**Response:**
```json
{
  "success": true,
  "contact": {
    "id": "abc-123-uuid",
    "email": "teacher@school.edu",
    "display_name": "Ms. Johnson",
    "source_type": "teacher",
    "tags": ["math", "highschool"],
    "verification_status": "verified",
    "linked_calendar_events": ["event-id-1"]
  }
}
```

### 3. PATCH /api/contacts/[id]

Update contact details (source_type, tags, notes).

**Example:**
```bash
PATCH /api/contacts/abc-123-uuid
{
  "source_type": "teacher",
  "tags": ["math", "algebra", "highschool"],
  "notes": "Jake's math teacher, office hours Tuesdays"
}
```

**Response:**
```json
{
  "success": true,
  "contact": { /* updated contact */ }
}
```

### 4. GET /api/contacts/verification-queue

Get pending contact verifications.

**Example:**
```bash
GET /api/contacts/verification-queue
```

**Response:**
```json
{
  "queue": [
    {
      "id": "queue-id",
      "contact_id": "contact-uuid",
      "suggested_type": "coach",
      "suggested_tags": ["soccer"],
      "reasoning": "Emails contain soccer practice schedules...",
      "confidence": 0.85,
      "sample_email_ids": ["email-1", "email-2"],
      "contact": { /* full contact object */ }
    }
  ]
}
```

### 5. POST /api/contacts/verify

Approve, reject, or modify pending verification.

**Actions:**
- `approve` - Verify contact with AI suggestions
- `reject` - Mark as rejected
- `modify` - Update fields then verify

**Example (Approve):**
```bash
POST /api/contacts/verify
{
  "contactId": "contact-uuid",
  "action": "approve"
}
```

**Example (Modify):**
```bash
POST /api/contacts/verify
{
  "contactId": "contact-uuid",
  "action": "modify",
  "updates": {
    "source_type": "therapist",
    "tags": ["OT", "pediatric"]
  }
}
```

## Chat Integration

### Natural Language Contact Queries

Claude can search contacts via chat using two tools:

#### 1. GET_VERIFIED_SOURCES Tool

Retrieve verified contacts by type.

**Example Chat:**
```
User: "Who are Jake's verified coaches?"

Claude uses: get_verified_sources({ source_type: "coach" })

Response: "Jake has 2 verified coaches:
- Coach Mike (coach@soccerclub.com) - Soccer
- Coach Sarah (sarah@basketballacademy.org) - Basketball"
```

#### 2. SEARCH_CONTACTS Tool

Search all contacts by name, email, or organization.

**Example Chat:**
```
User: "Find Jake's soccer coach"

Claude uses: search_contacts({
  query: "soccer coach",
  source_type: "coach",
  verification_status: "verified"
})

Response: "Found: Coach Mike (coach@soccerclub.com)
Organization: Youth Soccer Club
Verified: Yes
Tags: soccer, youth
Recent emails: 5"
```

**Tool Definitions:**
```typescript
// Get verified sources
{
  name: 'get_verified_sources',
  description: 'Retrieve verified contacts/sources (coaches, teachers, therapists...)',
  input_schema: {
    type: 'object',
    properties: {
      source_type: {
        type: 'string',
        enum: ['all', 'coach', 'teacher', 'school_admin', 'team', 'club', 'therapist', 'medical', 'vendor']
      }
    }
  }
}

// Search contacts
{
  name: 'search_contacts',
  description: 'Search all contacts by name, email, organization, or tags',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      source_type: { type: 'string', enum: [...] },
      verification_status: { type: 'string', enum: ['all', 'verified', 'pending', 'unverified'] }
    },
    required: ['query']
  }
}
```

## Calendar Integration

### Trust-Based Event Automation

The Contact Intelligence System enables smart calendar automation based on contact trust levels.

#### checkContactTrust() Function

Located in `src/lib/google-calendar.ts`:

```typescript
export async function checkContactTrust(userId: string, senderEmail: string) {
  const contact = await emailContactsRepo.findByEmail(userId, senderEmail);

  if (!contact) {
    return { trusted: false, confidence: 0, autoApprove: false };
  }

  return {
    trusted: contact.verification_status === 'verified',
    confidence: contact.confidence_score,
    autoApprove: contact.verification_status === 'verified' && contact.confidence_score > 0.8,
  };
}
```

#### Auto-Approval Logic

When extracting calendar events from emails:

1. **Check sender trust**: `checkContactTrust(userId, senderEmail)`
2. **Auto-approve if**:
   - Contact is verified (`verification_status === 'verified'`)
   - Confidence score > 0.8 (high trust)
3. **Manual review otherwise**: Events from unverified sources queued for user approval

**Example Workflow:**

```typescript
// Extract event from email
const eventDetails = parseEmailForEvent(email);
const trust = await checkContactTrust(userId, email.sender);

if (trust.autoApprove) {
  // Automatically create calendar event
  await createCalendarEvent(userId, eventDetails);
  console.log('Event auto-approved (verified source)');
} else {
  // Queue for user review
  await addToEventApprovalQueue(userId, eventDetails);
  console.log('Event pending review (unverified source)');
}
```

**Benefits:**
- Trusted coaches/teachers → events created automatically
- Unknown senders → manual approval required
- Reduces manual work while maintaining safety

## Setup Instructions

### 1. Run Database Migration

```bash
# Connect to your PostgreSQL database
psql postgresql://user:password@localhost:5432/kcg \
  -f src/lib/db/migrations/010_contact_intelligence.sql
```

**What gets created:**
- `email_contacts` table
- `email_contact_associations` table
- `contact_verification_queue` table
- Indexes for fast searching
- Helper functions (`increment_contact_email_count`, `get_high_confidence_unverified_contacts`)
- Views (`active_verified_contacts`, `pending_verifications_summary`)
- Triggers for `updated_at` timestamps

### 2. Sync Emails to Trigger Extraction

```bash
# Sync emails (contacts extracted automatically)
curl -X POST http://localhost:4321/api/gmail/sync \
  -H "Content-Type: application/json" \
  -d '{"maxEmails": 50}'
```

**Processing happens automatically:**
- Contacts extracted from senders/recipients
- Signatures parsed for details
- AI classifies each contact
- High-confidence contacts added to verification queue

### 3. Visit /contacts Page

Navigate to `/contacts` in your browser to:
- Review pending verifications
- Approve/reject AI suggestions
- Search all contacts
- View verification queue

## Contact Source Types

The system supports the following contact classifications:

- **coach** - Sports coaches, trainers
- **teacher** - School teachers, instructors
- **school_admin** - Principals, counselors, administrators
- **team** - Team organizations, leagues
- **club** - Clubs, after-school programs
- **therapist** - OT, PT, speech therapists
- **medical** - Doctors, nurses, medical staff
- **vendor** - Service providers, suppliers
- **other** - Uncategorized contacts

## Data Privacy & Security

### Retention
- Contacts persist indefinitely (unlike 90-day email cleanup)
- Verification queue items remain until user acts
- Contact associations link to emails (cascade delete)

### User Control
- Users must approve all AI classifications
- Can reject incorrect suggestions
- Can modify contact details anytime
- Full CRUD access via API

### Security
- All endpoints require Clerk authentication
- Row-level security (user_id filtering)
- Input validation on all mutations
- Foreign key constraints prevent orphaned data

## Troubleshooting

### "No contacts found"
**Solution**: Sync emails first to trigger contact extraction
```bash
POST /api/gmail/sync
```

### "Contact already exists"
**Cause**: Unique constraint on `(user_id, email)`
**Solution**: Use PATCH to update existing contact instead of creating new

### "Contact not in verification queue"
**Cause**: Contact already verified or rejected
**Solution**: Check `verification_status` on contact record

### "Auto-verification not working"
**Check**:
1. Contact has 3+ emails (`email_count >= 3`)
2. Confidence score ≥ 0.75
3. `source_type` is set (not null)

## Future Enhancements

### Planned Features
- [ ] **Contact merging** - Combine duplicate contacts
- [ ] **Relationship mapping** - Link family members, teachers to students
- [ ] **Contact groups** - Create custom contact collections
- [ ] **Smart notifications** - Alert on new high-confidence contacts
- [ ] **Export contacts** - Download as CSV/vCard
- [ ] **Contact timeline** - View email history per contact
- [ ] **AI learning** - Improve classification from user feedback
- [ ] **Bulk operations** - Approve/reject multiple contacts at once
- [ ] **Contact suggestions** - Proactively suggest missing contacts

## API Reference

### Database Repositories

```typescript
// Email Contacts
import * as emailContactsRepo from './lib/db/repositories/email-contacts';

await emailContactsRepo.createContact(data);
await emailContactsRepo.upsertContact(userId, email, updates);
await emailContactsRepo.findById(contactId);
await emailContactsRepo.findByEmail(userId, email);
await emailContactsRepo.findByUserId(userId, filters);
await emailContactsRepo.findPendingVerification(userId);
await emailContactsRepo.updateVerification(contactId, status, method, verifiedBy);
await emailContactsRepo.linkCalendarEvent(contactId, eventId);
await emailContactsRepo.deleteById(contactId);

// Contact Verification Queue
import * as verificationQueueRepo from './lib/db/repositories/contact-verification-queue';

await verificationQueueRepo.createQueueItem(data);
await verificationQueueRepo.findByUserId(userId, status);
await verificationQueueRepo.findByContactId(contactId);
await verificationQueueRepo.approve(queueId, contactId);
await verificationQueueRepo.reject(queueId);
await verificationQueueRepo.modify(queueId, contactId, updates);

// Contact Associations
import * as contactAssocRepo from './lib/db/repositories/email-contact-associations';

await contactAssocRepo.createAssociation(emailId, contactId, role);
await contactAssocRepo.findByEmailId(emailId);
await contactAssocRepo.findByContactId(contactId);
```

### Helper Functions

```typescript
// Contact extractor
import { extractContactFromSignature, extractDomain } from './lib/email-contact-extractor';

const contact = extractContactFromSignature(emailBody);
// Returns: { name, email, organization, phone, address }

const domain = extractDomain('user@example.com');
// Returns: 'example.com'

// Contact classifier
import { classifyContact, checkAndAutoVerify } from './lib/email-contact-processor';

const classification = await classifyContact(email, bodySnippet);
// Returns: { sourceType, tags, confidence, reasoning }

const verified = await checkAndAutoVerify(userId, contactId);
// Returns: boolean (auto-verified or queued)

// Contact-calendar linker
import { linkContactToEvent, getContactEvents, checkContactTrust } from './lib/contact-calendar-linker';

await linkContactToEvent(contactId, eventId);
const events = await getContactEvents(userId, contactEmail);
const trust = await checkContactTrust(userId, senderEmail);
```

## Documentation

- **Main README**: [CLAUDE.md](./CLAUDE.md)
- **Gmail Agent**: [GMAIL_AGENT_README.md](./GMAIL_AGENT_README.md)
- **Calendar Integration**: [CALENDAR_CRUD_README.md](./CALENDAR_CRUD_README.md)
- **Feature Planning**: [docs/FEATURE-BREAKDOWN-GUIDE.md](./docs/FEATURE-BREAKDOWN-GUIDE.md)

---

**Version**: 1.0.0
**Date**: November 11, 2025
**Implementation**: Contact Intelligence System with AI Classification
**Status**: ✅ Core infrastructure complete, ready for UI and advanced features
