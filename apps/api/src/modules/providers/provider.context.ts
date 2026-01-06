/**
 * Provider Message Context Service
 * Creates and manages user context for providers
 */

import { prisma } from '../../lib/prisma.js';
import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_DISTILL_MODEL = process.env.OPENAI_DISTILL_MODEL || 'gpt-4o-mini';

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

/**
 * Check if text contains Chinese characters
 */
function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

/**
 * Translate text to English if needed
 */
async function translateToEnglish(text: string): Promise<string> {
  if (!containsChinese(text)) {
    return text;
  }

  if (!openai) {
    console.warn('[Provider Context] OpenAI not available for translation');
    return text;
  }

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_DISTILL_MODEL,
      messages: [
        {
          role: 'system',
          content: 'Translate the user message to English. Return only the translation, no explanations.',
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content?.trim() || text;
  } catch (error) {
    console.error('[Provider Context] Translation error:', error);
    return text;
  }
}

/**
 * Create provider message context from user message and request payload
 */
export async function createProviderContext(
  requestId: string,
  userMessageText: string,
  requestPayload: any,
  conversationId: string | null = null,
  createdBy: string | null = null
): Promise<string> {
  // Translate user message to English if needed
  const englishMessage = await translateToEnglish(userMessageText);

  // Generate extracted summary using OpenAI
  let extractedSummary: string | null = null;
  let extractedPayload: any = requestPayload || {};

  if (openai) {
    try {
      const summaryPrompt = `You are summarizing a service request for a provider. 
Create a concise English summary (2-3 sentences) of what the user needs, including key details like dates, locations, preferences, etc.

User message: ${englishMessage}
Request data: ${JSON.stringify(requestPayload, null, 2)}

Return only the summary, no explanations.`;

      const response = await openai.chat.completions.create({
        model: OPENAI_DISTILL_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You summarize service requests for providers. Be concise and include key details like dates, locations, preferences.',
          },
          {
            role: 'user',
            content: summaryPrompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 200,
      });

      extractedSummary = response.choices[0]?.message?.content?.trim() || null;
    } catch (error) {
      console.error('[Provider Context] Summary generation error:', error);
    }
  }

  // Merge request payload into extracted payload
  extractedPayload = {
    ...extractedPayload,
    ...(requestPayload || {}),
  };

  // Create context record
  const context = await prisma.providerMessageContext.create({
    data: {
      request_id: requestId,
      conversation_id: conversationId,
      user_message_text: englishMessage,
      extracted_summary: extractedSummary,
      extracted_payload: extractedPayload,
      created_by: createdBy || 'AI',
    },
  });

  return context.id;
}




