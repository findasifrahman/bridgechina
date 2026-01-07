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
import argon2 from 'argon2';
import axios from 'axios';
import { uploadToR2, getPublicUrl } from '../../utils/r2.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_DISTILL_MODEL = process.env.OPENAI_DISTILL_MODEL || 'gpt-4o-mini';
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

/**
 * Generate external thread key from from/to numbers
 */
export function generateThreadKey(from: string, to: string): string {
  return crypto.createHash('sha256').update(`${from}|${to}`).digest('hex');
}

/**
 * Ensure user account exists from WhatsApp lead
 * Creates user with placeholder email and default password if not exists
 * Returns user info for login instructions
 */
export async function ensureUserFromWhatsappLead(
  phoneNumber: string,
  profileName?: string
): Promise<{ created: boolean; email: string; phone: string }> {
  try {
    // Normalize phone number (remove whatsapp: prefix if present, ensure E.164)
    const normalizedPhone = phoneNumber.replace(/^whatsapp:/, '').trim();
    
    // Extract digits only for placeholder email
    const phoneDigits = normalizedPhone.replace(/\D/g, '');
    const placeholderEmail = `wa+${phoneDigits}@bridgechina.local`;

    // Check if user exists by phone or placeholder email
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: normalizedPhone },
          { email: placeholderEmail },
        ],
      },
    });

    if (existingUser) {
      // User already exists, return their info
      return {
        created: false,
        email: existingUser.email || placeholderEmail,
        phone: existingUser.phone || normalizedPhone,
      };
    }

    // Create new user
    const defaultPassword = '12345678';
    const passwordHash = await argon2.hash(defaultPassword);

    // Try to find USER role
    let userRole = await prisma.role.findUnique({
      where: { name: 'USER' },
    });

    // Create user with role assignment
    const newUser = await prisma.user.create({
      data: {
        phone: normalizedPhone,
        email: placeholderEmail,
        password_hash: passwordHash,
        status: 'active',
        roles: userRole
          ? {
              create: {
                role_id: userRole.id,
              },
            }
          : undefined,
      },
    });

    // Create or update customer profile
    await prisma.customerProfile.upsert({
      where: { user_id: newUser.id },
      create: {
        user_id: newUser.id,
        full_name: profileName || 'WhatsApp User',
        preferred_contact_channel: 'whatsapp',
      },
      update: {
        full_name: profileName || undefined,
        preferred_contact_channel: 'whatsapp',
      },
    });

    console.log('[WhatsApp Service] Created user account from WhatsApp lead:', {
      userId: newUser.id,
      phone: normalizedPhone,
      email: placeholderEmail,
    });

    return {
      created: true,
      email: placeholderEmail,
      phone: normalizedPhone,
    };
  } catch (error: any) {
    // Handle unique constraint violations (idempotency)
    if (error.code === 'P2002') {
      // User was created in parallel, fetch existing
      const phoneDigits = phoneNumber.replace(/^whatsapp:/, '').replace(/\D/g, '');
      const placeholderEmail = `wa+${phoneDigits}@bridgechina.local`;
      const normalizedPhone = phoneNumber.replace(/^whatsapp:/, '').trim();

      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: normalizedPhone },
            { email: placeholderEmail },
          ],
        },
      });

      if (existingUser) {
        return {
          created: false,
          email: existingUser.email || placeholderEmail,
          phone: existingUser.phone || normalizedPhone,
        };
      }
    }

    console.error('[WhatsApp Service] Error ensuring user from WhatsApp lead:', error);
    throw error;
  }
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
 * Check if message has explicit ordering intent
 */
function hasExplicitOrderingIntent(body: string): boolean {
  const lower = body.toLowerCase();
  const keywords = [
    'book', 'pay', 'order now', 'need quote', 'human', 'agent', 
    'call me', 'help me place order', 'i want to book', 'i want to pay',
    'place order', 'make booking', 'confirm booking', 'proceed with order'
  ];
  return keywords.some(keyword => lower.includes(keyword));
}

/**
 * Check if message indicates shopping/sourcing intent for image search
 */
function isShoppingImageIntent(userMessage: string, intentResult: any): boolean {
  const lower = userMessage.toLowerCase();
  const shoppingKeywords = [
    'find this', 'search this product', 'find me this product',
    'do you have this product', 'price of this product', 'what is the price',
    'what\'s the price', 'availability', 'where can i buy this',
    'find similar', 'search similar', 'product like this'
  ];
  
  // Check if intent is shopping or user explicitly asks about product
  if (intentResult.intent === 'SHOPPING') {
    return true;
  }
  
  return shoppingKeywords.some(keyword => lower.includes(keyword));
}

/**
 * Download image from Twilio media URL and upload to R2
 */
async function downloadAndUploadImageToR2(twilioMediaUrl: string): Promise<string> {
  try {
    // Download from Twilio with Basic Auth
    const response = await axios.get(twilioMediaUrl, {
      responseType: 'arraybuffer',
      auth: {
        username: TWILIO_ACCOUNT_SID || '',
        password: TWILIO_AUTH_TOKEN || '',
      },
      maxContentLength: 8 * 1024 * 1024, // 8MB limit
      timeout: 30000,
    });

    const buffer = Buffer.from(response.data);
    const contentType = response.headers['content-type'] || 'image/jpeg';
    
    // Generate R2 key
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(8).toString('hex');
    const extension = contentType.includes('png') ? 'png' : 
                     contentType.includes('gif') ? 'gif' : 
                     contentType.includes('webp') ? 'webp' : 'jpg';
    const r2Key = `tmp/user_search_image/${timestamp}-${randomId}.${extension}`;

    // Upload to R2
    await uploadToR2(r2Key, buffer, contentType);

    // Get public URL
    const publicUrl = getPublicUrl(r2Key);
    
    console.log('[WhatsApp Service] Image uploaded to R2:', {
      r2Key,
      publicUrl: publicUrl.substring(0, 100),
      size: buffer.length,
    });

    return publicUrl;
  } catch (error: any) {
    console.error('[WhatsApp Service] Error downloading/uploading image:', error);
    throw new Error(`Failed to process image: ${error.message}`);
  }
}

/**
 * Search products by image using TMAPI
 */
async function searchProductsByImage(imageUrl: string): Promise<any> {
  try {
    // Use multilingual image search endpoint
    const result = await tmapiClient.searchByImageMultilingual(
      imageUrl,
      'en', // language
      {
        page: 1,
        pageSize: 6,
      }
    );

    if (result?.code === 200 && result?.data?.items && result.data.items.length > 0) {
      return result.data.items;
    }

    return [];
  } catch (error: any) {
    console.error('[WhatsApp Service] TMAPI image search error:', error);
    return [];
  }
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

    // Detect intent first for assignment and service request creation
    const intentResult = await detectIntent(userMessage);
    console.log('[WhatsApp Service] Intent detected:', intentResult);

    // Check for image in last inbound message
    const hasImage = lastInbound.meta_json && 
                     (lastInbound.meta_json as any).mediaUrls && 
                     Array.isArray((lastInbound.meta_json as any).mediaUrls) &&
                     (lastInbound.meta_json as any).mediaUrls.length > 0;
    
    let imageSearchResults: any[] = [];
    if (hasImage && isShoppingImageIntent(userMessage, intentResult)) {
      try {
        const mediaUrls = (lastInbound.meta_json as any).mediaUrls as string[];
        const firstImageUrl = mediaUrls[0];
        
        // Download and upload to R2
        const publicImageUrl = await downloadAndUploadImageToR2(firstImageUrl);
        
        // Search products by image
        imageSearchResults = await searchProductsByImage(publicImageUrl);
        console.log('[WhatsApp Service] Image search results:', imageSearchResults.length);
      } catch (error) {
        console.error('[WhatsApp Service] Image search error:', error);
      }
    }

    // Trigger assignment (async, non-blocking)
    assignConversationToProvider(conversationId, intentResult).catch((error) => {
      console.error('[WhatsApp Service] Assignment error:', error);
    });

    // Only create service request if explicit ordering intent
    const { createOrUpdateServiceRequest } = await import('../providers/service.request.js');
    const SINGLE_PROVIDER_CATEGORIES = ['hotel', 'transport', 'tours', 'medical'];
    
    // Map intent to category key
    const intentToCategoryKey = (intent: string): string | null => {
      const mapping: Record<string, string> = {
        HOTEL: 'hotel',
        TRANSPORT: 'transport',
        TOUR: 'tours',
        MEDICAL: 'medical',
        HALAL_FOOD: 'halal_food',
        SHOPPING: 'shopping',
        ESIM: 'esim',
      };
      return mapping[intent] || null;
    };
    
    const categoryKey = intentToCategoryKey(intentResult.intent);
    const hasOrderingIntent = hasExplicitOrderingIntent(userMessage);
    const isServiceIntent = categoryKey && 
                            intentResult.intent !== 'GREETING' && 
                            intentResult.intent !== 'OUT_OF_SCOPE' && 
                            !(intentResult.intent === 'SHOPPING' && intentResult.subIntent === 'RETAIL');
    
    let requestCreated = false;
    // Only create service request if user explicitly wants to order/book
    if (isServiceIntent && hasOrderingIntent) {
      try {
        const requestId = await createOrUpdateServiceRequest(conversationId, userMessage, intentResult);
        requestCreated = !!requestId;
      } catch (error) {
        console.error('[WhatsApp Service] Service request creation error:', error);
      }
    }

    // Initialize responseText variable
    let responseText = '';
    
    // Handle image search results if available
    if (imageSearchResults.length > 0) {
      const items = imageSearchResults.slice(0, 3).map((item: any) => {
        const title = item.title_en || item.title || 'Product';
        const price = item.price_min || item.price_max || item.price;
        const priceStr = price ? `¥${price}` : 'Price on request';
        const supplier = item.seller_name || item.company_name || 'N/A';
        const imageUrl = item.main_image || item.img || item.image_url || 
                        (Array.isArray(item.main_imgs) && item.main_imgs[0]) || '';
        const externalId = item.item_id || item.id;
        
        return {
          title,
          imageUrl,
          price: priceStr,
          supplier,
          externalId,
        };
      });

      // Format response with image search results
      const itemLines = items.map((item: any, idx: number) => {
        return `${idx + 1}. ${item.title}\n   - ${item.price} - ${item.supplier}`;
      });

      responseText = 'I found these products:\n\n' + itemLines.join('\n\n');
      responseText += '\n\nView details: https://bridgechina-web.vercel.app/shopping/tmapi/' + items[0].externalId;
      
      // Send first item as media if image available
      if (items[0].imageUrl) {
        try {
          const caption = `${items[0].title}\n${items[0].price} - ${items[0].supplier}\n\nView: https://bridgechina-web.vercel.app/shopping/tmapi/${items[0].externalId}`;
          const providerSid = await sendMedia(conversation.external_from!, items[0].imageUrl, caption);
          
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
                mediaUrl: items[0].imageUrl,
              },
            },
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: { last_outbound_at: new Date() },
          });
        } catch (error) {
          console.error('[WhatsApp Service] Failed to send media:', error);
        }
      }
    } else {
      // Call existing chat agent (reuse existing logic)
      // Generate session ID from conversation ID for consistency
      const sessionId = `whatsapp_${conversationId}`;
      console.log('[WhatsApp Service] Processing AI reply for conversation:', conversationId, 'userMessage:', userMessage);
      const result = await processChatMessage(userMessage, sessionId);

      responseText = result.message;
    }
    
    // Append confirmation message for service intents (only if request was created)
    if (requestCreated && isServiceIntent && categoryKey) {
      const isSingleProvider = SINGLE_PROVIDER_CATEGORIES.includes(categoryKey);
      if (isSingleProvider) {
        responseText += '\n\n✅ I\'ve sent your request to our team. You\'ll receive an update within ~30 minutes.';
      } else {
        responseText += '\n\n✅ I\'ve sent your request to our team. We\'re collecting a few quotes for you and will get back to you soon.';
      }
    }
    
    // Inject login credentials for service-related intents (once per 24h)
    if (isServiceIntent && categoryKey && !imageSearchResults.length) {
      try {
        // Check if login hint was sent in last 24h
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentLoginHint = await prisma.message.findFirst({
          where: {
            conversation_id: conversationId,
            role: 'assistant',
            meta_json: {
              path: ['loginHintSentAt'],
              not: null,
            },
            created_at: {
              gte: oneDayAgo,
            },
          },
        });

        if (!recentLoginHint) {
          // Get phone number from conversation
          const phoneNumber = conversation.external_from || conversation.lead?.whatsapp || '';
          const profileName = conversation.lead?.name;

          if (phoneNumber) {
            const userInfo = await ensureUserFromWhatsappLead(phoneNumber, profileName);
            
            const loginBlock = `\n\n✅ To start faster, use our website:
https://bridgechina-web.vercel.app/

Login:
Email: ${userInfo.email}
Password: 12345678${userInfo.created ? ' (temporary)' : ''}
Please change it after login.`;

            responseText += loginBlock;

            // Mark that login hint was sent
            // We'll store this in the message meta_json after sending
          }
        }
      } catch (error) {
        console.error('[WhatsApp Service] Error injecting login credentials:', error);
        // Don't fail the entire message if login injection fails
      }
    }
    
    console.log('[WhatsApp Service] AI response text (full):', responseText);
    console.log('[WhatsApp Service] AI response length:', responseText.length);

    // Handle shopping results specially (format for WhatsApp) - only if not from image search
    if (!imageSearchResults.length && result.items && result.items.length > 0) {
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
          const caption = `${firstItemEnglishTitle}\n${firstItemPrice} - ${firstItemSupplier}\n\nView on website: https://bridgechina-web.vercel.app/`;
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
        responseText = summaryLines.join('\n\n') + '\n\nView on website: https://bridgechina-web.vercel.app/';
      } else {
        // Only one item, send follow-up with website link
        responseText = 'View details and order on our website: https://bridgechina-web.vercel.app/';
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

    // Store outbound message with login hint marker if applicable
    const messageMeta: any = {};
    if (isServiceIntent && categoryKey && !imageSearchResults.length) {
      // Check if we added login credentials
      if (responseText.includes('To start faster, use our website')) {
        messageMeta.loginHintSentAt = new Date().toISOString();
      }
    }

    await prisma.message.create({
      data: {
        conversation_id: conversationId,
        role: 'assistant',
        direction: 'OUTBOUND',
        provider: 'twilio',
        provider_sid: providerSid,
        content: responseText,
        status: 'sent',
        meta_json: Object.keys(messageMeta).length > 0 ? messageMeta : undefined,
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

