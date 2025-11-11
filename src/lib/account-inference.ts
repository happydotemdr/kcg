/**
 * Smart Google Account Inference
 * Uses Claude AI to intelligently infer which Google account to use based on context
 */

import Anthropic from '@anthropic-ai/sdk';
import { findAllTokensByUserId, findPrimaryTokenByUserId } from './db/repositories/google-oauth';
import { findUserByClerkId } from './db/repositories/users';

const anthropic = new Anthropic({
  apiKey: import.meta.env.ANTHROPIC_API_KEY,
});

export interface InferenceContext {
  /** User's message or context that hints at which account to use */
  userMessage?: string;
  /** Event details (for calendar events) */
  eventDetails?: {
    summary?: string;
    description?: string;
    attendees?: string[];
  };
  /** Email details (for Gmail operations) */
  emailDetails?: {
    subject?: string;
    from?: string;
    to?: string[];
  };
}

export interface AccountInferenceResult {
  /** Suggested Google account email */
  suggestedEmail: string | null;
  /** Confidence score (0-1) */
  confidence: number;
  /** Whether to fallback to primary account */
  fallbackToPrimary: boolean;
  /** Reasoning for the suggestion */
  reasoning?: string;
}

/**
 * Infer which Google account to use based on context
 * @param clerkUserId - User's Clerk ID
 * @param context - Context to analyze
 * @returns Account inference result
 */
export async function inferGoogleAccount(
  clerkUserId: string,
  context: InferenceContext
): Promise<AccountInferenceResult> {
  try {
    // Find user and get all accounts
    const user = await findUserByClerkId(clerkUserId);
    if (!user) {
      throw new Error('User not found');
    }

    const allTokens = await findAllTokensByUserId(user.id);
    const primaryToken = await findPrimaryTokenByUserId(user.id);

    // If no accounts or only one account, return that account
    if (allTokens.length === 0) {
      return {
        suggestedEmail: null,
        confidence: 0,
        fallbackToPrimary: true,
        reasoning: 'No Google accounts connected',
      };
    }

    if (allTokens.length === 1) {
      return {
        suggestedEmail: allTokens[0].google_account_email,
        confidence: 1,
        fallbackToPrimary: false,
        reasoning: 'Only one account available',
      };
    }

    // Build context string for Claude
    const contextParts: string[] = [];
    if (context.userMessage) {
      contextParts.push(`User message: "${context.userMessage}"`);
    }
    if (context.eventDetails) {
      if (context.eventDetails.summary) {
        contextParts.push(`Event title: "${context.eventDetails.summary}"`);
      }
      if (context.eventDetails.description) {
        contextParts.push(`Event description: "${context.eventDetails.description}"`);
      }
      if (context.eventDetails.attendees && context.eventDetails.attendees.length > 0) {
        contextParts.push(`Attendees: ${context.eventDetails.attendees.join(', ')}`);
      }
    }
    if (context.emailDetails) {
      if (context.emailDetails.subject) {
        contextParts.push(`Email subject: "${context.emailDetails.subject}"`);
      }
      if (context.emailDetails.from) {
        contextParts.push(`Email from: ${context.emailDetails.from}`);
      }
      if (context.emailDetails.to && context.emailDetails.to.length > 0) {
        contextParts.push(`Email to: ${context.emailDetails.to.join(', ')}`);
      }
    }

    const contextString = contextParts.join('\n');

    // Build account list
    const accountList = allTokens
      .map((token, idx) => {
        const label = token.account_label ? ` (${token.account_label})` : '';
        const isPrimary = token.is_primary ? ' [PRIMARY]' : '';
        return `${idx + 1}. ${token.google_account_email}${label}${isPrimary}`;
      })
      .join('\n');

    // Ask Claude to infer the account
    const prompt = `You are helping to select the appropriate Google account for a user's request. The user has multiple Google accounts connected:

${accountList}

Context:
${contextString}

Based on the context, which Google account is most appropriate for this request?

Analyze keywords like:
- "work", "office", "meeting", "investor" → work account
- "family", "dentist", "school", "kids" → family account
- "personal", "friend", "hobby" → personal account

Respond with JSON in this exact format:
{
  "accountEmail": "email@example.com",
  "confidence": 0.85,
  "reasoning": "Brief explanation of why this account was chosen"
}

If you're not confident (confidence < 0.7), set accountEmail to "PRIMARY" to use the primary account.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Parse Claude's response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse Claude response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const { accountEmail, confidence, reasoning } = parsed;

    // Validate confidence
    const validatedConfidence = Math.max(0, Math.min(1, confidence));

    // If confidence is low or Claude suggests PRIMARY, fallback to primary
    if (validatedConfidence < 0.7 || accountEmail === 'PRIMARY') {
      return {
        suggestedEmail: primaryToken?.google_account_email || allTokens[0].google_account_email,
        confidence: validatedConfidence,
        fallbackToPrimary: true,
        reasoning: reasoning || 'Low confidence, using primary account',
      };
    }

    // Verify the suggested email exists in user's accounts
    const suggestedToken = allTokens.find((t) => t.google_account_email === accountEmail);
    if (!suggestedToken) {
      return {
        suggestedEmail: primaryToken?.google_account_email || allTokens[0].google_account_email,
        confidence: 0,
        fallbackToPrimary: true,
        reasoning: 'Suggested account not found, using primary',
      };
    }

    return {
      suggestedEmail: accountEmail,
      confidence: validatedConfidence,
      fallbackToPrimary: false,
      reasoning,
    };
  } catch (error) {
    console.error('Account inference error:', error);

    // Fallback to primary account on error
    try {
      const user = await findUserByClerkId(clerkUserId);
      if (user) {
        const primaryToken = await findPrimaryTokenByUserId(user.id);
        const allTokens = await findAllTokensByUserId(user.id);
        return {
          suggestedEmail: primaryToken?.google_account_email || allTokens[0]?.google_account_email || null,
          confidence: 0,
          fallbackToPrimary: true,
          reasoning: `Error during inference: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    } catch {
      // Final fallback
    }

    return {
      suggestedEmail: null,
      confidence: 0,
      fallbackToPrimary: true,
      reasoning: 'Failed to infer account',
    };
  }
}
