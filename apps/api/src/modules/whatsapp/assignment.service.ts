/**
 * Assignment Service
 * Handles AI auto-assignment of conversations to service providers
 */

import { prisma } from '../../lib/prisma.js';
import { IntentResult } from '../chat/chat.agent.js';

/**
 * Map intent to category key
 */
function intentToCategoryKey(intent: IntentResult['intent']): string | null {
  const mapping: Record<string, string> = {
    TRANSPORT: 'transport',
    TOUR: 'tours',
    HOTEL: 'hotel',
    SHOPPING: 'shopping',
    HALAL_FOOD: 'halal_food',
    MEDICAL: 'medical',
    ESIM: 'esim',
  };
  return mapping[intent] || null;
}

/**
 * Get confidence threshold for category
 */
function getConfidenceThreshold(categoryKey: string): number {
  const thresholds: Record<string, number> = {
    transport: 0.75,
    tours: 0.75,
    hotel: 0.75,
    shopping: 0.70,
    halal_food: 0.75,
    medical: 0.75,
    esim: 0.75,
  };
  return thresholds[categoryKey] || 1.0; // Default: require very high confidence
}

/**
 * Assign conversation to a provider based on category
 */
export async function assignConversationToProvider(
  conversationId: string,
  intentResult: IntentResult
): Promise<void> {
  try {
    // Check if conversation already assigned
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { assigned_user_id: true, category_key: true },
    });

    if (!conversation) {
      console.warn('[Assignment Service] Conversation not found:', conversationId);
      return;
    }

    // Skip if already assigned (unless we want to re-assign based on new intent)
    if (conversation.assigned_user_id) {
      console.log('[Assignment Service] Conversation already assigned, skipping');
      return;
    }

    // Map intent to category key
    const categoryKey = intentToCategoryKey(intentResult.intent);
    if (!categoryKey) {
      console.log('[Assignment Service] No category mapping for intent:', intentResult.intent);
      // Set to ops_queue
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { category_key: 'ops_queue' },
      });
      return;
    }

    // Check confidence threshold
    const threshold = getConfidenceThreshold(categoryKey);
    if (intentResult.confidence < threshold) {
      console.log(
        `[Assignment Service] Confidence ${intentResult.confidence} below threshold ${threshold} for ${categoryKey}`
      );
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { category_key: 'ops_queue' },
      });
      return;
    }

    // Find active providers with this category
    // Note: Prisma JSON queries use path syntax for PostgreSQL
    // We'll filter in code since Prisma doesn't support array contains for JSON arrays easily
    const allProviders = await prisma.serviceProviderProfile.findMany({
      where: {
        is_active: true,
      },
      include: {
        user: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    // Filter providers that have this category in their categories array
    const providers = allProviders.filter((p) => {
      if (!p.categories || !Array.isArray(p.categories)) return false;
      return (p.categories as string[]).includes(categoryKey);
    });

    // Filter to only active users
    const activeProviders = providers.filter((p) => p.user.status === 'active');

    if (activeProviders.length === 0) {
      console.log('[Assignment Service] No active providers found for category:', categoryKey);
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { category_key: categoryKey },
      });
      return;
    }

    // Simple round-robin: find provider with fewest assigned conversations
    // For now, just pick the first one (can be improved with load balancing)
    const selectedProvider = activeProviders[0];

    // Update conversation
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        category_key: categoryKey,
        assigned_user_id: selectedProvider.user_id,
        assigned_at: new Date(),
        assigned_by: 'AI',
      },
    });

    console.log(
      `[Assignment Service] Assigned conversation ${conversationId} to provider ${selectedProvider.user_id} for category ${categoryKey}`
    );
  } catch (error) {
    console.error('[Assignment Service] Error assigning conversation:', error);
    // Don't throw - assignment failure shouldn't block the conversation
  }
}

