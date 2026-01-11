/**
 * WhatsApp Service
 * Handles WhatsApp message processing, AI replies, and conversation management
 */

import { prisma } from '../../lib/prisma.js';
import crypto from 'crypto';
import { processChatMessage, detectIntent } from '../chat/chat.agent.js';
import { sendText, sendMedia, downloadTwilioMedia } from './twilio.client.js';
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
    'find', 'search', 'what is this', 'find this product', 'search by image',
    'find me this product', 'do you have this product', 'price of this product',
    'what is the price', 'what\'s the price', 'availability', 'where can i buy this',
    'find similar', 'search similar', 'product like this',
    // Bengali equivalents
    'খুঁজুন', 'সন্ধান', 'এটা কি', 'এই পণ্য খুঁজুন'
  ];
  
  // Check if intent is shopping or user explicitly asks about product
  if (intentResult.intent === 'SHOPPING') {
    return true;
  }
  
  return shoppingKeywords.some(keyword => lower.includes(keyword));
}

/**
 * Check if user wants image search (has image + image search keywords)
 */
function wantsImageSearch(userMessage: string, hasImage: boolean, firstMediaType?: string): boolean {
  if (!hasImage) return false;
  
  // Check if first media is an image
  const isImage = firstMediaType?.startsWith('image/') || false;
  if (!isImage) return false;
  
  // Check for image search keywords
  const lower = userMessage.toLowerCase();
  const imageSearchKeywords = [
    'find', 'search', 'what is this', 'find this product', 'search by image',
    'find me this product', 'do you have this product', 'price of this product',
    'what is the price', 'what\'s the price', 'availability', 'where can i buy this',
    'find similar', 'search similar', 'product like this',
    // Bengali equivalents
    'খুঁজুন', 'সন্ধান', 'এটা কি', 'এই পণ্য খুঁজুন'
  ];
  
  // If message is empty or very short, assume they want image search
  if (!userMessage.trim() || userMessage.trim().length <= 10) {
    return true;
  }
  
  return imageSearchKeywords.some(keyword => lower.includes(keyword));
}

/**
 * Upload image buffer to R2 and return public URL
 */
async function uploadImageToR2Public(buffer: Buffer, contentType: string): Promise<string> {
  // Generate R2 key with hash for uniqueness
  const timestamp = Date.now();
  const hash = crypto.createHash('md5').update(buffer).digest('hex').slice(0, 12);
  const extension = contentType.includes('png') ? 'png' : 
                   contentType.includes('gif') ? 'gif' : 
                   contentType.includes('webp') ? 'webp' : 'jpg';
  const r2Key = `whatsapp-image-search/${timestamp}-${hash}.${extension}`;

  // Upload to R2 with public cache control
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');
  const { getS3Client } = await import('../../utils/r2.js');
  const client = getS3Client();
  const bucket = process.env.R2_BUCKET;

  if (!bucket) {
    throw new Error('R2_BUCKET not configured');
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: r2Key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000',
  });

  await client.send(command);

  // Get public URL
  const publicUrl = getPublicUrl(r2Key);
  
  console.log('[WhatsApp Service] Image uploaded to R2:', {
    r2Key,
    publicUrl: publicUrl.substring(0, 100),
    size: buffer.length,
  });

  return publicUrl;
}

/**
 * Download image from Twilio media URL and upload to R2 (with caching)
 */
async function downloadAndUploadImageToR2(twilioMediaUrl: string): Promise<string> {
  try {
    // Check cache first (idempotency for webhook retries)
    const cacheKey = `twilio_media:${twilioMediaUrl}`;
    const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const cached = await prisma.externalSearchCache.findUnique({
      where: { cache_key: cacheKey },
    });
    
    if (cached && new Date(cached.expires_at) > new Date()) {
      const cachedData = cached.results_json as any;
      if (cachedData.r2Url) {
        console.log('[WhatsApp Service] Using cached R2 URL for media');
        return cachedData.r2Url as string;
      }
    }

    // Download from Twilio
    const { buffer, contentType } = await downloadTwilioMedia(twilioMediaUrl);
    
    // Upload to R2
    const publicUrl = await uploadImageToR2Public(buffer, contentType);
    
    // Cache the result
    try {
      await prisma.externalSearchCache.upsert({
        where: { cache_key: cacheKey },
        create: {
          source: 'twilio_media',
          cache_key: cacheKey,
          query_json: { mediaUrl: twilioMediaUrl.substring(0, 100) + '...' },
          results_json: { mediaUrl: twilioMediaUrl.substring(0, 100) + '...', r2Url: publicUrl, contentType },
          expires_at: oneDayFromNow,
        },
        update: {
          results_json: { mediaUrl: twilioMediaUrl.substring(0, 100) + '...', r2Url: publicUrl, contentType },
          expires_at: oneDayFromNow,
        },
      });
    } catch (cacheError) {
      // Log but don't fail if caching fails
      console.warn('[WhatsApp Service] Failed to cache R2 URL:', cacheError);
    }

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
 * @param conversationId - Conversation ID
 * @param inboundMessageSid - Twilio MessageSid of the inbound message to process
 */
export async function handleAIReply(conversationId: string, inboundMessageSid: string): Promise<void> {
  try {
    console.log('[WhatsApp Service] handleAIReply called:', { conversationId, inboundMessageSid });

    // Fetch conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            whatsapp: true,
            email: true,
          },
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

    // Deterministic inbound message fetch using MessageSid
    let inbound = await prisma.message.findFirst({
      where: {
        conversation_id: conversationId,
        provider: 'twilio',
        provider_sid: inboundMessageSid,
        direction: 'INBOUND',
      },
      orderBy: { created_at: 'desc' },
    });

    // Fallback: if not found by MessageSid, get latest inbound (shouldn't happen in normal flow)
    if (!inbound) {
      console.warn('[WhatsApp Service] Inbound message not found by MessageSid, using latest inbound as fallback');
      inbound = await prisma.message.findFirst({
        where: {
          conversation_id: conversationId,
          direction: 'INBOUND',
        },
        orderBy: { created_at: 'desc' },
      });
    }

    if (!inbound) {
      console.log('[WhatsApp Service] No inbound message found');
      return;
    }

    // Idempotency check: if message already processed, skip
    const meta = (inbound.meta_json as any) || {};
    if (inbound.status === 'processed' || meta.processedByAI === true) {
      console.log('[WhatsApp Service] Message already processed, skipping:', inbound.id);
      return;
    }

    const userMessage = inbound.content || '';

    // Extract media info from meta_json.twilio.media
    const twilioMedia = meta?.twilio?.media || [];
    const hasImage = twilioMedia.some((m: any) => m.contentType?.startsWith('image/'));
    const imageMedia = twilioMedia.filter((m: any) => m.contentType?.startsWith('image/'));

    // GREETING HARD INTERRUPT: Check for pure greetings BEFORE any search/intent detection
    // Only apply greeting guard if NO image is present (images should trigger search)
    if (!hasImage) {
      const { isPureGreeting } = await import('../chat/chat.agent.js');
      if (isPureGreeting(userMessage)) {
        // Send greeting menu without triggering any search or intent detection
        const greetingResponse = 'Hi 👋 Welcome to BridgeChina.\nWhat do you need today?\n1) Hotel 2) Shopping 3) Tours 4) Transport 5) Medical 6) eSIM 7) Sourcing\n\nYou can also use the website: https://bridgechina-web.vercel.app/';
        
        // Mark message as processed before sending response
        await prisma.message.update({
          where: { id: inbound.id },
          data: {
            status: 'processed',
            meta_json: {
              ...meta,
              processedByAI: true,
              processedAt: new Date().toISOString(),
            },
          },
        });

        try {
          const providerSid = await sendText(conversation.external_from!, greetingResponse);
          
          await prisma.message.create({
            data: {
              conversation_id: conversationId,
              role: 'assistant',
              direction: 'OUTBOUND',
              provider: 'twilio',
              provider_sid: providerSid,
              content: greetingResponse,
              status: 'sent',
            },
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: {
              last_outbound_at: new Date(),
              last_message_preview: greetingResponse.substring(0, 100),
            },
          });
        } catch (error: any) {
          console.error('[WhatsApp Service] Failed to send greeting:', error);
        }
        
        return; // Exit early, no further processing
      }
    }

    // IMAGE SEARCH PATH: If image exists, force image search
    // Download media, upload to R2, then run image search
    if (hasImage && imageMedia.length > 0) {
      try {
        const firstImage = imageMedia[0];
        const twilioMediaUrl = firstImage.url;
        const contentType = firstImage.contentType || 'image/jpeg';

        console.log('[WhatsApp Service] Processing image search:', { twilioMediaUrl: twilioMediaUrl.substring(0, 100), contentType });

        // Download from Twilio and upload to R2
        let r2PublicUrl: string;
        try {
          // Download from Twilio (uses auth from downloadTwilioMedia)
          const { buffer } = await downloadTwilioMedia(twilioMediaUrl);
          
          // Generate R2 key
          const timestamp = Date.now();
          const hash = crypto.createHash('md5').update(buffer).digest('hex').slice(0, 12);
          const extension = contentType.includes('png') ? 'png' : 
                           contentType.includes('gif') ? 'gif' : 
                           contentType.includes('webp') ? 'webp' : 'jpg';
          const r2Key = `whatsapp-image-search/${timestamp}-${hash}.${extension}`;

          // Upload to R2
          await uploadToR2(r2Key, buffer, contentType);
          r2PublicUrl = getPublicUrl(r2Key);

          console.log('[WhatsApp Service] Image uploaded to R2:', { r2Key, r2PublicUrl: r2PublicUrl.substring(0, 100) });

          // Save R2 URL back to message meta_json
          const mediaUploads = meta.mediaUploads || [];
          mediaUploads.push({
            idx: firstImage.idx,
            r2Url: r2PublicUrl,
            contentType: contentType,
          });

          await prisma.message.update({
            where: { id: inbound.id },
            data: {
              meta_json: {
                ...meta,
                mediaUploads: mediaUploads,
              },
            },
          });
        } catch (error: any) {
          console.error('[WhatsApp Service] Failed to download/upload image:', error);
          const errorResponse = 'I received the image but couldn\'t process it. Please resend or try website image search: https://bridgechina-web.vercel.app/';
          
          // Mark as processed even on error to prevent retries
          await prisma.message.update({
            where: { id: inbound.id },
            data: {
              status: 'processed',
              meta_json: {
                ...meta,
                processedByAI: true,
                processedAt: new Date().toISOString(),
              },
            },
          });

          const providerSid = await sendText(conversation.external_from!, errorResponse);
          await prisma.message.create({
            data: {
              conversation_id: conversationId,
              role: 'assistant',
              direction: 'OUTBOUND',
              provider: 'twilio',
              provider_sid: providerSid,
              content: errorResponse,
              status: 'sent',
            },
          });
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { last_outbound_at: new Date() },
          });
          return; // Exit early
        }
        
        // Search products by image using TMAPI (use zh language for WhatsApp)
        const { searchByImage } = await import('../shopping/shopping.service.js');
        let searchResults;
        try {
          searchResults = await searchByImage(r2PublicUrl, {
            language: 'zh', // Use Chinese for WhatsApp image search
            page: 1,
            pageSize: 3,
            sort: 'sales',
          });
        } catch (error: any) {
          console.error('[WhatsApp Service] TMAPI image search error:', error);
          const errorResponse = 'Image search service is temporarily unavailable. Please try again later or use website: https://bridgechina-web.vercel.app/';
          
          // Mark as processed
          await prisma.message.update({
            where: { id: inbound.id },
            data: {
              status: 'processed',
              meta_json: {
                ...meta,
                processedByAI: true,
                processedAt: new Date().toISOString(),
              },
            },
          });

          const providerSid = await sendText(conversation.external_from!, errorResponse);
          await prisma.message.create({
            data: {
              conversation_id: conversationId,
              role: 'assistant',
              direction: 'OUTBOUND',
              provider: 'twilio',
              provider_sid: providerSid,
              content: errorResponse,
              status: 'sent',
            },
          });
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { last_outbound_at: new Date() },
          });
          return; // Exit early
        }
        
        // Format and send results
        if (!searchResults.items || searchResults.items.length === 0) {
          const noResultsResponse = 'I couldn\'t find close matches. Try sending a clearer photo or a keyword. Or search on website: https://bridgechina-web.vercel.app/';
          
          // Mark as processed
          await prisma.message.update({
            where: { id: inbound.id },
            data: {
              status: 'processed',
              meta_json: {
                ...meta,
                processedByAI: true,
                processedAt: new Date().toISOString(),
              },
            },
          });

          const providerSid = await sendText(conversation.external_from!, noResultsResponse);
          await prisma.message.create({
            data: {
              conversation_id: conversationId,
              role: 'assistant',
              direction: 'OUTBOUND',
              provider: 'twilio',
              provider_sid: providerSid,
              content: noResultsResponse,
              status: 'sent',
            },
          });
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { last_outbound_at: new Date() },
          });
          return; // Exit early
        }
        
        // Format top 3 results
        const topResults = searchResults.items.slice(0, 3);
        const resultLines: string[] = ['Found similar items by image (top 3):'];
        
        for (let i = 0; i < topResults.length; i++) {
          const item = topResults[i];
          const title = item.title || 'Product';
          const price = item.priceMin || item.priceMax;
          const priceStr = price ? `¥${price}` : 'Price on request';
          const link = `https://bridgechina-web.vercel.app/shopping/tmapi/${item.externalId}?language=en`;
          
          resultLines.push(`${i + 1}) ${title} — ${priceStr} — ${link}`);
        }
        
        const responseText = resultLines.join('\n');
        
        // Send product images (up to 3, one per product)
        for (let i = 0; i < Math.min(topResults.length, 3); i++) {
          const item = topResults[i];
          const itemImage = item.imageUrl || (item.images && item.images[0]);
          const itemTitle = item.title || 'Product';
          const itemPrice = item.priceMin || item.priceMax;
          const itemPriceStr = itemPrice ? `¥${itemPrice}` : 'Price on request';
          const itemLink = `https://bridgechina-web.vercel.app/shopping/tmapi/${item.externalId}?language=en`;
          
          if (itemImage) {
            try {
              const caption = `${itemTitle}\n${itemPriceStr}\n${itemLink}`;
              const providerSid = await sendMedia(conversation.external_from!, itemImage, caption);
              
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
                    mediaUrl: itemImage,
                    productIndex: i + 1,
                  },
                },
              });
            } catch (error) {
              console.error('[WhatsApp Service] Failed to send product image:', error);
              // Continue with other images
            }
          }
        }
        
        // Send text response with all results
        const providerSid = await sendText(conversation.external_from!, responseText);
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
        
        // Mark inbound as processed
        await prisma.message.update({
          where: { id: inbound.id },
          data: {
            status: 'processed',
            meta_json: {
              ...meta,
              processedByAI: true,
              processedAt: new Date().toISOString(),
            },
          },
        });
        
        await prisma.conversation.update({
          where: { id: conversationId },
          data: {
            last_outbound_at: new Date(),
            last_message_preview: responseText.substring(0, 100),
          },
        });
        
        return; // Exit early, image search complete
      } catch (error: any) {
        console.error('[WhatsApp Service] Image search pipeline error:', error);
        // Fall through to normal processing if image search fails completely
      }
    }

    // Build conversation history for AI (last 10 messages, alternating user/assistant)
    // Fetch messages separately since we're not including them in the conversation query
    const conversationMessages = await prisma.message.findMany({
      where: { conversation_id: conversationId },
      orderBy: { created_at: 'asc' },
      take: 20,
    });
    
    const historyMessages = conversationMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-10)
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    // Detect intent first for assignment and service request creation
    const intentResult = await detectIntent(userMessage);
    console.log('[WhatsApp Service] Intent detected:', intentResult);

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
    
    // Call existing chat agent (reuse existing logic)
    // Generate session ID from conversation ID and phone number for better isolation
    const phoneNumber = conversation.external_from?.replace(/^whatsapp:/, '') || '';
    const phoneDigits = phoneNumber.replace(/\D/g, '').substring(0, 10); // Last 10 digits for privacy
    const sessionId = `whatsapp_${conversationId}${phoneDigits ? `_${phoneDigits}` : ''}`;
    console.log('[WhatsApp Service] Processing AI reply for conversation:', conversationId, 'userMessage:', userMessage);
    const result = await processChatMessage(userMessage, sessionId);

    responseText = result.message;
    
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
    if (isServiceIntent && categoryKey) {
      try {
        // Check if login hint was sent in last 24h
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        // Get recent assistant messages and check meta_json in code
        const recentMessages = await prisma.message.findMany({
          where: {
            conversation_id: conversationId,
            role: 'assistant',
            created_at: {
              gte: oneDayAgo,
            },
          },
          select: {
            meta_json: true,
          },
        });
        
        const recentLoginHint = recentMessages.find((msg) => {
          const meta = msg.meta_json as any;
          return meta && meta.loginHintSentAt;
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
    if (isServiceIntent && categoryKey) {
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

    // Mark inbound message as processed
    await prisma.message.update({
      where: { id: inbound.id },
      data: {
        status: 'processed',
        meta_json: {
          ...meta,
          processedByAI: true,
          processedAt: new Date().toISOString(),
        },
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

