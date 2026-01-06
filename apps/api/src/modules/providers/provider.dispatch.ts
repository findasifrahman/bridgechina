/**
 * Provider Dispatch Service
 * Handles provider eligibility, dispatch logic, and SLA management
 */

import { prisma } from '../../lib/prisma.js';

// Single-provider categories (hotel/transport/tour/medical)
const SINGLE_PROVIDER_CATEGORIES = ['hotel', 'transport', 'tours', 'medical'];

// Default dispatch limits
const DEFAULT_DISPATCH_LIMIT_SINGLE = 1;
const DEFAULT_DISPATCH_LIMIT_MULTI = 10;

/**
 * Find eligible providers for a category and city
 */
export async function findEligibleProviders(
  categoryKey: string,
  cityId: string | null
): Promise<Array<{ userId: string; isDefault: boolean }>> {
  // Get all active service provider profiles
  const profiles = await prisma.serviceProviderProfile.findMany({
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

  const eligible: Array<{ userId: string; isDefault: boolean }> = [];

  for (const profile of profiles) {
    // Check if user is active
    if (profile.user.status !== 'active') {
      continue;
    }

    // Check if provider has this category
    const categories = (profile.categories as string[]) || [];
    if (!categories.includes(categoryKey)) {
      continue;
    }

    // Check city scope
    if (profile.city_id) {
      // Provider has city scope - must match
      if (profile.city_id !== cityId) {
        continue;
      }
    }
    // If provider.city_id is null, treat as any city

    eligible.push({
      userId: profile.user_id,
      isDefault: profile.is_default || false,
    });
  }

  // Sort: default providers first, then by user_id for consistency
  eligible.sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return a.userId.localeCompare(b.userId);
  });

  return eligible;
}

/**
 * Dispatch request to providers
 * Returns array of created/updated ProviderDispatch records
 */
export async function dispatchRequest(
  requestId: string,
  categoryKey: string,
  cityId: string | null,
  slaMinutes: number = 30
): Promise<Array<{ providerUserId: string; dispatchId: string }>> {
  const isSingleProvider = SINGLE_PROVIDER_CATEGORIES.includes(categoryKey);
  const maxProviders = isSingleProvider
    ? DEFAULT_DISPATCH_LIMIT_SINGLE
    : DEFAULT_DISPATCH_LIMIT_MULTI;

  // Find eligible providers
  const eligible = await findEligibleProviders(categoryKey, cityId);

  if (eligible.length === 0) {
    // No eligible providers - still create request but don't dispatch
    return [];
  }

  // Select providers (up to max)
  const selectedProviders = eligible.slice(0, maxProviders);

  // Calculate SLA due time
  const slaDueAt = new Date();
  slaDueAt.setMinutes(slaDueAt.getMinutes() + slaMinutes);

  // Upsert dispatches (idempotent)
  const dispatches = await Promise.all(
    selectedProviders.map(async (provider) => {
      const dispatch = await prisma.providerDispatch.upsert({
        where: {
          request_id_provider_user_id: {
            request_id: requestId,
            provider_user_id: provider.userId,
          },
        },
        update: {
          // Don't update if already exists (idempotent)
          status: 'sent',
        },
        create: {
          request_id: requestId,
          provider_user_id: provider.userId,
          status: 'sent',
          sent_at: new Date(),
        },
      });

      return {
        providerUserId: provider.userId,
        dispatchId: dispatch.id,
      };
    })
  );

  // Update ServiceRequest: set dispatched_at and sla_due_at if not already set
  await prisma.serviceRequest.update({
    where: { id: requestId },
    data: {
      dispatched_at: new Date(),
      sla_due_at: slaDueAt,
    },
  });

  return dispatches;
}

/**
 * Get SLA minutes for a category
 */
export function getSlaMinutesForCategory(categoryKey: string): number {
  if (SINGLE_PROVIDER_CATEGORIES.includes(categoryKey)) {
    return 30; // 30 minutes for single-provider categories
  }
  return 60; // 60 minutes for multi-provider categories (guide/shopping)
}




