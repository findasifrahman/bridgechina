/**
 * WhatsApp Service
 * Handles WhatsApp message processing, AI replies, and conversation management
 */

import { prisma } from '../../lib/prisma.js';
import crypto from 'crypto';
import { processChatMessage, detectIntent } from '../chat/chat.agent.js';
import { sendText, sendMedia } from './twilio.client.js';
import { sendWecomText } from '../../utils/wecom.js';
import { searchByKeyword } from '../shopping/shopping.service.js';
import tmapiClient from '../shopping/tmapi.client.js';
import OpenAI from 'openai';
import { assignConversationToProvider } from './assignment.service.js';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_DISTILL_MODEL = process.env.OPENAI_DISTILL_MODEL || 'gpt-4o-mini';

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

/**
 * Generate external thread key from from/to numbers
 */
export function generateThreadKey(from: string, to: string): string {
  return crypto.createHash('sha256').update(`${from}|${to}`).digest('hex');
}

/**
 * Check if message requests human takeover
 */
function requestsHumanTakeover(body: string): boolean {
  const lower = body.toLowerCase();
  const keywords = ['human', 'agent', 'person', 'help me', 'operator', 'representative'];
  return keywords.some(keyword => lower.includes(keyword));
}

/**
 * Translate product title to English (with caching)
 */
async function translateTitleToEnglish(title: string): Promise<string> {
  // Check if already in English (no Chinese characters)
  if (!/[\u4e00-\u9fff]/.test(title)) {
    return title;
  }

  // Check cache
  const cached = await prisma.productTitleTranslation.findUnique({
    where: { source_text: title },
  });

  if (cached) {
    return cached.translated_text;
  }

  // Translate using OpenAI
  if (!openai) {
    console.warn('[WhatsApp Service] OpenAI not available for translation');
    return title;
  }

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_DISTILL_MODEL,
      messages: [
        {
          role: 'system',
          content: 'Translate product titles to English. Return only the translation, no explanations.',
        },
        {
          role: 'user',
          content: `Translate: ${title}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 100,
    });

    const translated = response.choices[0]?.message?.content?.trim() || title;

    // Cache the translation
    try {
      await prisma.productTitleTranslation.create({
        data: {
          source_text: title,
          translated_text: translated,
          provider: 'openai',
        },
      });
    } catch (error) {
      // Ignore cache errors (might be duplicate key)
      console.warn('[WhatsApp Service] Failed to cache translation:', error);
    }

    return translated;
  } catch (error) {
    console.error('[WhatsApp Service] Translation error:', error);
    return title;
  }
}

/**
 * Handle AI reply for WhatsApp conversation
 */
export async function handleAIReply(conversationId: string): Promise<void> {
  try {
    // Fetch conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { created_at: 'asc' },
          take: 20, // Last 20 messages for context
        },
      },
    });

    if (!conversation) {
      console.error('[WhatsApp Service] Conversation not found:', conversationId);
      return;
    }

    // Skip if in HUMAN mode
    if (conversation.mode === 'HUMAN') {
      console.log('[WhatsApp Service] Conversation in HUMAN mode, skipping AI reply');
      return;
    }

    // Get last inbound message
    const lastInbound = conversation.messages
      .filter(m => m.direction === 'INBOUND')
      .slice(-1)[0];

    if (!lastInbound) {
      console.log('[WhatsApp Service] No inbound message found');
      return;
    }

    const userMessage = lastInbound.content;

    // Build conversation history for AI (last 10 messages, alternating user/assistant)
    const historyMessages = conversation.messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-10)
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    // Detect intent first for assignment
    const intentResult = await detectIntent(userMessage);
    console.log('[WhatsApp Service] Intent detected:', intentResult);

    // Trigger assignment (async, non-blocking)
    assignConversationToProvider(conversationId, intentResult).catch((error) => {
      console.error('[WhatsApp Service] Assignment error:', error);
    });

    // Call existing chat agent (reuse existing logic)
    // Generate session ID from conversation ID for consistency
    const sessionId = `whatsapp_${conversationId}`;
    console.log('[WhatsApp Service] Processing AI reply for conversation:', conversationId, 'userMessage:', userMessage);
    const result = await processChatMessage(userMessage, sessionId);

    let responseText = result.message;
    console.log('[WhatsApp Service] AI response text (full):', responseText);
    console.log('[WhatsApp Service] AI response length:', responseText.length);

    // Handle shopping results specially (format for WhatsApp)
    if (result.items && result.items.length > 0) {
      const items = result.items.slice(0, 3); // Top 3 only
      const firstItem = items[0];
      const remainingItems = items.slice(1);

      // Translate first item title
      const firstItemEnglishTitle = await translateTitleToEnglish(firstItem.title);
      const firstItemPrice = firstItem.price || 'Price on request';
      const firstItemSupplier = firstItem.supplier || 'N/A';

      // Send first item as media (if image available)
      if (firstItem.imageUrl) {
        try {
          const caption = `${firstItemEnglishTitle}\n${firstItemPrice} - ${firstItemSupplier}`;
          const providerSid = await sendMedia(conversation.external_from!, firstItem.imageUrl, caption);
          
          // Store outbound message
          await prisma.message.create({
            data: {
              conversation_id: conversationId,
              role: 'assistant',
              direction: 'OUTBOUND',
              provider: 'twilio',
              provider_sid: providerSid,
              content: caption,
              status: 'sent',
              meta_json: {
                type: 'media',
                mediaUrl: firstItem.imageUrl,
              },
            },
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: { last_outbound_at: new Date() },
          });
        } catch (error) {
          console.error('[WhatsApp Service] Failed to send media:', error);
          // Fallback to text - will be included in summary below
        }
      }

      // Send remaining items as text summary (with translated titles)
      if (remainingItems.length > 0) {
        const summaryLines: string[] = [];
        for (const item of remainingItems) {
          const englishTitle = await translateTitleToEnglish(item.title);
          const price = item.price || 'Price on request';
          const supplier = item.supplier || 'N/A';
          summaryLines.push(`${englishTitle} - ${price} - ${supplier}`);
        }
        responseText = summaryLines.join('\n\n');
      } else {
        // Only one item, send follow-up question
        responseText = 'Would you like me to help you place an order or check delivery inside China?';
      }
    }

    // Ensure responseText is not empty
    if (!responseText || responseText.trim().length === 0) {
      responseText = 'I apologize, I could not generate a response. How can I help you?';
      console.warn('[WhatsApp Service] Empty response text, using fallback');
    }

    // Enforce English output (check if >20% CJK characters)
    const cjkCount = (responseText.match(/[\u4e00-\u9fff]/g) || []).length;
    const totalChars = responseText.length;
    if (totalChars > 0 && cjkCount / totalChars > 0.2 && openai) {
      try {
        const response = await openai.chat.completions.create({
          model: OPENAI_DISTILL_MODEL,
          messages: [
            {
              role: 'system',
              content: 'Translate to fluent English only. Preserve names, numbers, prices, URLs exactly as they are.',
            },
            {
              role: 'user',
              content: `Translate this to English:\n\n${responseText}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 500,
        });
        responseText = response.choices[0]?.message?.content || responseText;
      } catch (error) {
        console.error('[WhatsApp Service] English enforcement error:', error);
      }
    }

    // Ensure we have a valid response text
    if (!responseText || responseText.trim().length === 0) {
      console.error('[WhatsApp Service] Empty response text, using fallback');
      responseText = 'I apologize, I could not generate a response. How can I help you?';
    }

    // Send text message via Twilio
    console.log('[WhatsApp Service] Sending WhatsApp message:', {
      to: conversation.external_from,
      messageLength: responseText.length,
      preview: responseText.substring(0, 100),
      fullMessage: responseText,
    });

    let providerSid: string | null = null;
    try {
      providerSid = await sendText(conversation.external_from!, responseText);
      console.log('[WhatsApp Service] Message sent successfully, providerSid:', providerSid);
    } catch (error: any) {
      console.error('[WhatsApp Service] Failed to send WhatsApp message:', error);
      // Store message with failed status
      await prisma.message.create({
        data: {
          conversation_id: conversationId,
          role: 'assistant',
          direction: 'OUTBOUND',
          provider: 'twilio',
          provider_sid: null,
          content: responseText,
          status: 'failed',
          meta_json: {
            error: error.message || 'Failed to send',
            errorCode: error.code,
          },
        },
      });
      // Don't throw - log error but don't break webhook
      return;
    }

    // Store outbound message
    await prisma.message.create({
      data: {
        conversation_id: conversationId,
        role: 'assistant',
        direction: 'OUTBOUND',
        provider: 'twilio',
        provider_sid: providerSid,
        content: responseText,
        status: 'sent',
      },
    });

    // Update conversation
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        last_outbound_at: new Date(),
        last_message_preview: responseText.substring(0, 100),
      },
    });

    console.log('[WhatsApp Service] AI reply sent successfully');
  } catch (error) {
    console.error('[WhatsApp Service] Error handling AI reply:', error);
    // Don't throw - errors shouldn't break the webhook
  }
}

