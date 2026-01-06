import { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export default async function adminKpiRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);
  fastify.addHook('onRequest', requireRole('ADMIN', 'OPS'));

  fastify.get('/kpi/summary', async (request: FastifyRequest) => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Conversations (24h, 7d)
    const [conversations24h, conversations7d] = await Promise.all([
      prisma.conversation.count({
        where: {
          created_at: { gte: twentyFourHoursAgo },
        },
      }),
      prisma.conversation.count({
        where: {
          created_at: { gte: sevenDaysAgo },
        },
      }),
    ]);

    // Average time to first provider response per category
    const providerResponses = await prisma.serviceRequest.findMany({
      where: {
        dispatched_at: { not: null },
        first_provider_response_at: { not: null },
      },
      select: {
        category: {
          select: { key: true, name: true },
        },
        dispatched_at: true,
        first_provider_response_at: true,
      },
    });

    const avgProviderResponseByCategory: Record<string, { avgMinutes: number; count: number }> = {};
    providerResponses.forEach((req) => {
      const categoryKey = req.category.key;
      if (!avgProviderResponseByCategory[categoryKey]) {
        avgProviderResponseByCategory[categoryKey] = { avgMinutes: 0, count: 0 };
      }
      const diffMs = req.first_provider_response_at!.getTime() - req.dispatched_at!.getTime();
      const diffMinutes = diffMs / (1000 * 60);
      const current = avgProviderResponseByCategory[categoryKey];
      current.avgMinutes = (current.avgMinutes * current.count + diffMinutes) / (current.count + 1);
      current.count += 1;
    });

    // Average time to first ops approval
    const opsApprovals = await prisma.serviceRequest.findMany({
      where: {
        first_ops_approval_at: { not: null },
        dispatched_at: { not: null },
      },
      select: {
        dispatched_at: true,
        first_ops_approval_at: true,
      },
    });

    let avgOpsApprovalMinutes: number | null = null;
    if (opsApprovals.length > 0) {
      const totalMinutes = opsApprovals.reduce((sum, req) => {
        const diffMs = req.first_ops_approval_at!.getTime() - req.dispatched_at!.getTime();
        return sum + diffMs / (1000 * 60);
      }, 0);
      avgOpsApprovalMinutes = totalMinutes / opsApprovals.length;
    }

    // % requests overdue SLA (now > sla_due_at and no provider response)
    const [totalDispatched, overdueRequests] = await Promise.all([
      prisma.serviceRequest.count({
        where: {
          dispatched_at: { not: null },
          sla_due_at: { not: null },
        },
      }),
      prisma.serviceRequest.count({
        where: {
          dispatched_at: { not: null },
          sla_due_at: { not: null, lt: now },
          first_provider_response_at: null,
        },
      }),
    ]);

    const overduePercentage = totalDispatched > 0 ? (overdueRequests / totalDispatched) * 100 : 0;

    // Offers submitted/approved/rejected counts
    const [offersSubmitted, offersApproved, offersRejected] = await Promise.all([
      prisma.providerOffer.count({
        where: { status: 'submitted' },
      }),
      prisma.providerOffer.count({
        where: { status: 'approved' },
      }),
      prisma.providerOffer.count({
        where: { status: 'rejected' },
      }),
    ]);

    return {
      conversations: {
        last24h: conversations24h,
        last7d: conversations7d,
      },
      avgProviderResponseByCategory: Object.entries(avgProviderResponseByCategory).map(([key, value]) => ({
        categoryKey: key,
        categoryName: providerResponses.find((r) => r.category.key === key)?.category.name || key,
        avgMinutes: Math.round(value.avgMinutes),
        count: value.count,
      })),
      avgOpsApprovalMinutes: avgOpsApprovalMinutes ? Math.round(avgOpsApprovalMinutes) : null,
      overdueSla: {
        percentage: Math.round(overduePercentage * 100) / 100,
        count: overdueRequests,
        total: totalDispatched,
      },
      offers: {
        submitted: offersSubmitted,
        approved: offersApproved,
        rejected: offersRejected,
        total: offersSubmitted + offersApproved + offersRejected,
      },
    };
  });
}




