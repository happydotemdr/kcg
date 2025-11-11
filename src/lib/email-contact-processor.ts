/**
 * Email Contact Processor
 * AI-powered contact classification using Claude with EXTRACT_CONTACTS_TOOL
 */

import Anthropic from '@anthropic-ai/sdk';
import { EXTRACT_CONTACTS_TOOL } from './claude';
import { inferSourceTypeFromDomain } from './email-contact-extractor';
import * as emailContactsRepo from './db/repositories/email-contacts';
import * as verificationQueueRepo from './db/repositories/contact-verification-queue';
import type { EmailContact } from './db/types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Contact classification result
 */
export interface ContactClassification {
  sourceType: 'coach' | 'teacher' | 'school_admin' | 'team' | 'club' | 'therapist' | 'medical' | 'vendor' | 'other';
  tags: string[];
  confidenceScore: number;
  reasoning: string;
}

/**
 * Classify a contact using quick heuristics + Claude AI
 * Step 1: Try quick classification via domain inference
 * Step 2: If quick classification returns 'other' OR confidence < 0.7, use Claude AI
 * Step 3: Call Claude with EXTRACT_CONTACTS_TOOL (forced tool use)
 */
export async function classifyContact(
  plainText: string,
  from: string,
  subject: string
): Promise<ContactClassification> {
  // Step 1: Try quick classification
  const quickType = inferSourceTypeFromDomain(from);
  const quickConfidence = calculateQuickConfidence(quickType, plainText, from);

  // If quick classification is confident enough, return it
  if (quickType !== 'other' && quickConfidence >= 0.7) {
    return {
      sourceType: quickType as ContactClassification['sourceType'],
      tags: extractQuickTags(plainText, subject),
      confidenceScore: quickConfidence,
      reasoning: `Domain-based classification: ${from}`,
    };
  }

  // Step 2: Use Claude AI for classification
  try {
    const classification = await classifyWithAI(plainText, from, subject);
    return classification;
  } catch (error) {
    console.error('[ContactProcessor] AI classification failed:', error);
    // Fallback to quick classification with reduced confidence
    return {
      sourceType: quickType as ContactClassification['sourceType'],
      tags: extractQuickTags(plainText, subject),
      confidenceScore: 0.3,
      reasoning: `Fallback classification (AI failed): ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Classify contact using Claude AI with forced tool use
 */
async function classifyWithAI(
  plainText: string,
  from: string,
  subject: string
): Promise<ContactClassification> {
  const prompt = `Extract contact information from this email and classify the sender.

FROM: ${from}
SUBJECT: ${subject}

EMAIL BODY:
${plainText.slice(0, 2000)}

Instructions:
- Identify the sender's role/type (coach, teacher, medical, etc.)
- Extract relevant tags (sport names, subjects, activities)
- Provide confidence score (0-1)
- Explain your reasoning`;

  // Force Claude to use the EXTRACT_CONTACTS_TOOL
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    tools: [EXTRACT_CONTACTS_TOOL],
    tool_choice: { type: 'tool', name: 'extract_email_contacts' },
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // Extract tool use result
  const toolUseBlock = response.content.find((block) => block.type === 'tool_use');
  if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
    throw new Error('Claude did not return tool use result');
  }

  const toolInput = toolUseBlock.input as {
    contacts?: Array<{
      email?: string;
      source_type?: string;
      tags?: string[];
      confidence_score?: number;
      reasoning?: string;
    }>;
  };

  // Extract first contact classification
  const contact = toolInput.contacts?.[0];
  if (!contact) {
    throw new Error('No contact extracted from tool result');
  }

  return {
    sourceType: (contact.source_type || 'other') as ContactClassification['sourceType'],
    tags: contact.tags || [],
    confidenceScore: contact.confidence_score || 0.5,
    reasoning: contact.reasoning || 'AI classification',
  };
}

/**
 * Calculate confidence score for quick classification
 */
function calculateQuickConfidence(
  sourceType: string,
  plainText: string,
  from: string
): number {
  const lowerText = plainText.toLowerCase();
  const lowerFrom = from.toLowerCase();

  // Domain match only
  if (sourceType !== 'other') {
    // Check for signature keywords to boost confidence
    const signatureKeywords = {
      coach: ['coach', 'team', 'practice', 'game'],
      teacher: ['teacher', 'class', 'homework', 'assignment', 'school'],
      school_admin: ['principal', 'superintendent', 'district', 'administration'],
      medical: ['doctor', 'dr.', 'appointment', 'patient', 'therapy'],
      team: ['team', 'league', 'roster', 'tournament'],
    };

    const keywords = signatureKeywords[sourceType as keyof typeof signatureKeywords] || [];
    const hasKeywords = keywords.some((keyword) => lowerText.includes(keyword) || lowerFrom.includes(keyword));

    if (hasKeywords) {
      return 0.9; // Domain match + keywords in signature
    }

    return 0.7; // Domain match only
  }

  // 'other' type with keywords
  const genericKeywords = ['coach', 'teacher', 'doctor', 'team', 'school'];
  const hasKeywords = genericKeywords.some((keyword) => lowerText.includes(keyword));

  if (hasKeywords) {
    return 0.6; // Keywords only, no domain match
  }

  return 0.5; // First email from sender (no strong signals)
}

/**
 * Extract quick tags from email text
 */
function extractQuickTags(plainText: string, subject: string): string[] {
  const tags: string[] = [];
  const combinedText = `${subject} ${plainText}`.toLowerCase();

  // Sport tags
  const sports = ['soccer', 'basketball', 'baseball', 'football', 'hockey', 'volleyball', 'tennis', 'swimming'];
  for (const sport of sports) {
    if (combinedText.includes(sport)) {
      tags.push(sport);
    }
  }

  // Subject tags
  const subjects = ['math', 'science', 'english', 'history', 'reading', 'art', 'music'];
  for (const subject of subjects) {
    if (combinedText.includes(subject)) {
      tags.push(subject);
    }
  }

  // Activity tags
  const activities = ['practice', 'game', 'tournament', 'meeting', 'homework', 'assignment'];
  for (const activity of activities) {
    if (combinedText.includes(activity)) {
      tags.push(activity);
    }
  }

  return [...new Set(tags)]; // Remove duplicates
}

/**
 * Auto-verification result
 */
export interface AutoVerificationResult {
  action: 'auto_verified' | 'queued' | 'none';
  reason: string;
}

/**
 * Check if contact should be auto-verified or added to verification queue
 * Rule 1: 3+ emails → auto-verify
 * Rule 2: High confidence (>0.85) + 2+ emails → add to verification queue
 */
export async function checkAndAutoVerify(
  userId: string,
  contactId: string,
  contact: EmailContact
): Promise<AutoVerificationResult> {
  // Rule 1: 3+ emails → auto-verify
  if (contact.email_count >= 3 && contact.verification_status === 'unverified') {
    await emailContactsRepo.updateVerification(
      contactId,
      'verified',
      'auto_multiple_emails',
      'system'
    );
    return { action: 'auto_verified', reason: '3+ emails received' };
  }

  // Rule 2: High confidence (>0.85) + 2+ emails → add to verification queue
  if (
    contact.confidence_score > 0.85 &&
    contact.email_count >= 2 &&
    contact.verification_status === 'unverified'
  ) {
    await verificationQueueRepo.createVerificationQueueItem({
      user_id: userId,
      contact_id: contactId,
      suggested_type: contact.source_type,
      suggested_tags: contact.tags,
      reasoning: contact.extraction_metadata?.reasoning || 'High confidence contact',
      confidence: contact.confidence_score,
      sample_email_ids: [], // TODO: add sample email IDs
    });

    await emailContactsRepo.updateVerification(contactId, 'pending', 'auto_queue', 'system');
    return { action: 'queued', reason: 'High confidence, awaiting user review' };
  }

  return { action: 'none', reason: 'Does not meet auto-verification criteria' };
}
