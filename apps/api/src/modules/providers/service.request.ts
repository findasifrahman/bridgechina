/**
 * Service Request Creation Service
 * Creates service requests from chat conversations and dispatches to providers
 */

import { prisma } from '../../lib/prisma.js';
import { IntentResult } from '../chat/chat.agent.js';
import { dispatchRequest, getSlaMinutesForCategory } from './provider.dispatch.js';
import { createProviderContext } from './provider.context.js';

/**
 * Map intent to service category key
 */
function intentToCategoryKey(intent: IntentResult['intent']): string | null {
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
}

/**
 * Create or update service request from conversation and intent
 * Returns the service request ID, or null if request should not be created
 */
export async function createOrUpdateServiceRequest(
  conversationId: string,
  userMessage: string,
  intentResult: IntentResult
): Promise<string | null> {
  try {
    // Get conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        lead: true,
        messages: {
          orderBy: { created_at: 'desc' },
          take: 5, // Get recent messages for context
        },
      },
    });

    if (!conversation || !conversation.lead) {
      console.warn('[Service Request] Conversation or lead not found:', conversationId);
      return null;
    }

    // Map intent to category
    const categoryKey = intentToCategoryKey(intentResult.intent);
    if (!categoryKey) {
      // Not a service request type
      return null;
    }

    // Skip GREETING and OUT_OF_SCOPE
    if (intentResult.intent === 'GREETING' || intentResult.intent === 'OUT_OF_SCOPE') {
      return null;
    }

    // Skip SHOPPING_RETAIL (handled separately)
    if (intentResult.intent === 'SHOPPING' && intentResult.subIntent === 'RETAIL') {
      // Retail shopping is handled by TMAPI search, not service requests
      return null;
    }

    // Find or get category
    let category = await prisma.serviceCategory.findUnique({
      where: { key: categoryKey },
    });

    if (!category) {
      // Create category if it doesn't exist
      category = await prisma.serviceCategory.create({
        data: {
          key: categoryKey,
          name: categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1),
        },
      });
    }

    // Find city
    let cityId: string;
    if (intentResult.city) {
      const city = await prisma.city.findUnique({
        where: { slug: intentResult.city },
      });
      if (city) {
        cityId = city.id;
      } else {
        // Default to Guangzhou if city not found
        const defaultCity = await prisma.city.findUnique({ where: { slug: 'guangzhou' } });
        cityId = defaultCity?.id || (await prisma.city.findFirst())?.id || '';
      }
    } else {
      // Default to Guangzhou
      const defaultCity = await prisma.city.findUnique({ where: { slug: 'guangzhou' } });
      cityId = defaultCity?.id || (await prisma.city.findFirst())?.id || '';
    }

    if (!cityId) {
      console.warn('[Service Request] No city found, skipping request creation');
      return null;
    }

    // Check for existing open request in same conversation+category within 20 minutes
    const twentyMinutesAgo = new Date();
    twentyMinutesAgo.setMinutes(twentyMinutesAgo.getMinutes() - 20);

    const existingRequest = await prisma.serviceRequest.findFirst({
      where: {
        created_from_conversation_id: conversationId,
        category_id: category.id,
        created_at: {
          gte: twentyMinutesAgo,
        },
        status: {
          in: ['new', 'dispatched', 'pending'],
        },
      },
      orderBy: { created_at: 'desc' },
    });

    if (existingRequest) {
      // Update existing request (merge payload)
      const currentPayload = (existingRequest.request_payload as any) || {};
      const newPayload = {
        ...currentPayload,
        last_user_message: userMessage,
        intent: intentResult.intent,
        city: intentResult.city,
        confidence: intentResult.confidence,
        updated_at: new Date().toISOString(),
      };

      await prisma.serviceRequest.update({
        where: { id: existingRequest.id },
        data: {
          request_payload: newPayload,
          updated_at: new Date(),
        },
      });

      return existingRequest.id;
    }

    // Create new service request
    const requestPayload = {
      user_message: userMessage,
      intent: intentResult.intent,
      city: intentResult.city,
      confidence: intentResult.confidence,
      conversation_id: conversationId,
    };

    const serviceRequest = await prisma.serviceRequest.create({
      data: {
        category_id: category.id,
        city_id: cityId,
        lead_id: conversation.lead.id,
        customer_name: conversation.lead.name || 'WhatsApp User',
        phone: conversation.lead.phone || '',
        whatsapp: conversation.lead.whatsapp || conversation.external_from || null,
        email: conversation.lead.email || null,
        request_payload: requestPayload,
        created_from_conversation_id: conversationId,
        status: 'new',
      },
    });

    // Create provider context (async, non-blocking)
    createProviderContext(
      serviceRequest.id,
      userMessage,
      requestPayload,
      conversationId,
      'AI'
    ).catch((error) => {
      console.error('[Service Request] Failed to create provider context:', error);
    });

    // Dispatch to providers (async, non-blocking)
    const slaMinutes = getSlaMinutesForCategory(categoryKey);
    dispatchRequest(serviceRequest.id, categoryKey, cityId, slaMinutes).catch((error) => {
      console.error('[Service Request] Failed to dispatch:', error);
    });

    return serviceRequest.id;
  } catch (error) {
    console.error('[Service Request] Error creating service request:', error);
    return null;
  }
}

