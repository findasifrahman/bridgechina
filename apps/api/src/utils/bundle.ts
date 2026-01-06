/**
 * Bundle Request Utilities
 * Helper functions for handling multi-service bundle requests
 */

import { randomUUID } from 'crypto';

/**
 * Generate a new bundle key (UUID)
 */
export function generateBundleKey(): string {
  return randomUUID();
}




