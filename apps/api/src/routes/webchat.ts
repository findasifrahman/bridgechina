/**
 * WebChat Routes
 * API endpoints for webchat widget (separate from WhatsApp, no Twilio)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { processChatMessage } from '../modules/chat/chat.agent.js';
import { createOrUpdateServiceRequest } from '../modules/providers/service.request.js';
import { assignConversationToProvider } from '../modules/whatsapp/assignment.service.js';

// Generate session ID if not provided
function generateSessionId(): string {
  return `webchat_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

// Generate thread key for webchat
function generateThreadKey(sessionId: string, userId?: string): string {
  if (userId) {
    return `webchat:user:${userId}`;
  }
  return `webchat:${sessionId}`;
}

// Map intent to category key
function intentToCategoryKey(intent: string): string | null {
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

export default async function webchatRoutes(fastify: FastifyInstance) {
  // Create or find conversation session
  fastify.post('/session', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as any;
      const body = request.body as { sessionId?: string };
      const userId = req.user?.id; // Optional: user might be logged in

      // Generate or use provided sessionId
      const sessionId = body.sessionId || generateSessionId();
      const threadKey = generateThreadKey(sessionId, userId);

      // Create or find conversation
      const conversation = await prisma.conversation.upsert({
        where: {
          external_thread_key: threadKey,
        },
        create: {
          channel: 'webchat',
          external_channel: 'web_chat',
          external_thread_key: threadKey,
          external_from: userId ? `user:${userId}` : `session:${sessionId}`,
          mode: 'AI',
          last_inbound_at: new Date(),
          last_message_preview: '',
        },
        update: {
          // Update last activity
          last_inbound_at: new Date(),
        },
      });

      return {
        sessionId,
        conversationId: conversation.id,
      };
    } catch (error: any) {
      fastify.log.error({ error, stack: error.stack }, '[WebChat] Error creating session');
      reply.status(500).send({ error: 'Failed to create session' });
    }
  });

  // Get messages for a conversation
  fastify.get('/:conversationId/messages', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = request.params as { conversationId: string };
      
      const conversation = await prisma.conversation.findUnique({
        where: { id: params.conversationId },
        include: {
          messages: {
            orderBy: { created_at: 'asc' },
            take: 100, // Last 100 messages
          },
        },
      });

      if (!conversation) {
        reply.status(404).send({ error: 'Conversation not found' });
        return;
      }

      // Filter and format messages for webchat
      const messages = conversation.messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.created_at,
        direction: msg.direction,
      }));

      return {
        conversationId: conversation.id,
        messages,
      };
    } catch (error: any) {
      fastify.log.error({ error, stack: error.stack }, '[WebChat] Error fetching messages');
      reply.status(500).send({ error: 'Failed to fetch messages' });
    }
  });

  // Send a message (create INBOUND message and process AI reply)
  fastify.post('/:conversationId/send', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = request.params as { conversationId: string };
      const body = request.body as { content: string };
      const req = request as any;
      const userId = req.user?.id; // Optional: user might be logged in

      if (!body.content || !body.content.trim()) {
        reply.status(400).send({ error: 'Message content is required' });
        return;
      }

      const conversation = await prisma.conversation.findUnique({
        where: { id: params.conversationId },
      });

      if (!conversation) {
        reply.status(404).send({ error: 'Conversation not found' });
        return;
      }

      // Verify conversation is webchat
      if (conversation.channel !== 'webchat') {
        reply.status(400).send({ error: 'Invalid conversation channel' });
        return;
      }

      // Skip if in HUMAN mode (just store inbound, OPS will handle)
      if (conversation.mode === 'HUMAN') {
        await prisma.message.create({
          data: {
            conversation_id: params.conversationId,
            role: 'user',
            direction: 'INBOUND',
            provider: 'web_chat',
            content: body.content.trim(),
            status: 'received',
          },
        });

        await prisma.conversation.update({
          where: { id: params.conversationId },
          data: {
            last_inbound_at: new Date(),
            last_message_preview: body.content.trim().substring(0, 100),
          },
        });

        return {
          success: true,
          message: 'Message received, waiting for human response',
        };
      }

      // Store INBOUND message
      await prisma.message.create({
        data: {
          conversation_id: params.conversationId,
          role: 'user',
          direction: 'INBOUND',
          provider: 'web_chat',
          content: body.content.trim(),
          status: 'received',
        },
      });

      await prisma.conversation.update({
        where: { id: params.conversationId },
        data: {
          last_inbound_at: new Date(),
          last_message_preview: body.content.trim().substring(0, 100),
        },
      });

      // Process AI reply (async, don't wait)
      processAIReply(params.conversationId, body.content.trim()).catch((error) => {
        fastify.log.error({ error }, '[WebChat] Error in async AI processing');
      });

      return {
        success: true,
        message: 'Message received, processing...',
      };
    } catch (error: any) {
      fastify.log.error({ error, stack: error.stack }, '[WebChat] Error sending message');
      reply.status(500).send({ error: 'Failed to send message' });
    }
  });
}

// Process AI reply (similar to handleAIReply but stores message instead of sending via Twilio)
async function processAIReply(conversationId: string, userMessage: string): Promise<void> {
  try {
    // Fetch conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { created_at: 'asc' },
          take: 20,
        },
      },
    });

    if (!conversation) {
      console.error('[WebChat] Conversation not found:', conversationId);
      return;
    }

    // Skip if in HUMAN mode
    if (conversation.mode === 'HUMAN') {
      console.log('[WebChat] Conversation in HUMAN mode, skipping AI reply');
      return;
    }

    // Detect intent
    const { detectIntent } = await import('../modules/chat/chat.agent.js');
    const intentResult = await detectIntent(userMessage);
    console.log('[WebChat] Intent detected:', intentResult);

    // Trigger assignment (async, non-blocking)
    assignConversationToProvider(conversationId, intentResult).catch((error) => {
      console.error('[WebChat] Assignment error:', error);
    });

    // Create service request and dispatch (async, non-blocking)
    const SINGLE_PROVIDER_CATEGORIES = ['hotel', 'transport', 'tours', 'medical'];
    const categoryKey = intentToCategoryKey(intentResult.intent);
    const isServiceIntent =
      categoryKey &&
      intentResult.intent !== 'GREETING' &&
      intentResult.intent !== 'OUT_OF_SCOPE' &&
      !(intentResult.intent === 'SHOPPING' && intentResult.subIntent === 'RETAIL');

    if (isServiceIntent) {
      try {
        await createOrUpdateServiceRequest(conversationId, userMessage, intentResult);
      } catch (error: any) {
        console.error('[WebChat] Service request creation error:', error);
      }
    }

    // Call chat agent (reuse existing logic)
    const sessionId = `webchat_${conversationId}`;
    const result = await processChatMessage(userMessage, sessionId);

    let responseText = result.message;

    // Append confirmation message for service intents
    if (isServiceIntent && categoryKey) {
      const isSingleProvider = SINGLE_PROVIDER_CATEGORIES.includes(categoryKey);
      if (isSingleProvider) {
        responseText += '\n\n✅ I\'ve sent your request to our team. You\'ll receive an update within ~30 minutes.';
      } else {
        responseText += '\n\n✅ I\'ve sent your request to our team. We\'re collecting a few quotes for you and will get back to you soon.';
      }
    }

    // Ensure responseText is not empty
    if (!responseText || responseText.trim().length === 0) {
      responseText = 'I apologize, I could not generate a response. How can I help you?';
    }

    // Store OUTBOUND message (NO Twilio call)
    await prisma.message.create({
      data: {
        conversation_id: conversationId,
        role: 'assistant',
        direction: 'OUTBOUND',
        provider: 'web_chat',
        content: responseText,
        status: 'sent',
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        last_outbound_at: new Date(),
      },
    });

    console.log('[WebChat] AI reply stored for conversation:', conversationId);
  } catch (error) {
    console.error('[WebChat] Error processing AI reply:', error);
  }
}



