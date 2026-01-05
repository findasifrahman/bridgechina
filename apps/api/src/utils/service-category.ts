/**
 * Service Category Utilities
 * Centralized helper functions for normalizing and handling service categories
 * 
 * The 9 core service categories in BridgeChina:
 * - guide: Guide Service
 * - hotel: Hotel Booking
 * - transport: Transport
 * - halal_food: Halal Food
 * - medical: Medical Assistance
 * - translation_help: Translation & Help
 * - shopping: Shopping Service (standardized from "shopping_service")
 * - tours: Tours
 * - esim: eSIM Plans
 */

/**
 * The 9 core service categories in BridgeChina
 */
export const CORE_SERVICE_CATEGORIES = {
  guide: 'Guide Service',
  hotel: 'Hotel Booking',
  transport: 'Transport',
  halal_food: 'Halal Food',
  medical: 'Medical Assistance',
  translation_help: 'Translation & Help',
  shopping: 'Shopping Service',
  tours: 'Tours',
  esim: 'eSIM Plans',
} as const;

export type ServiceCategoryKey = keyof typeof CORE_SERVICE_CATEGORIES;

/**
 * Normalize a category key to the database format
 * Handles variations like "shopping_service" → "shopping"
 * @param key - The category key (from UI, API, or intent)
 * @returns Normalized category key for database, or null if invalid
 */
export function normalizeCategoryKey(key: string): ServiceCategoryKey | null {
  const normalized = key.toLowerCase().trim();
  
  // Map variations to standard keys
  const mappings: Record<string, ServiceCategoryKey> = {
    'shopping_service': 'shopping', // Backward compatibility
    'shopping': 'shopping',
    'guide': 'guide',
    'hotel': 'hotel',
    'transport': 'transport',
    'halal_food': 'halal_food',
    'halalfood': 'halal_food', // Variation
    'medical': 'medical',
    'translation_help': 'translation_help',
    'translation': 'translation_help', // Variation
    'help': 'translation_help', // Variation
    'tours': 'tours',
    'tour': 'tours', // Variation
    'esim': 'esim',
    'esim_plans': 'esim', // Variation
  };

  const mapped = mappings[normalized];
  if (mapped) {
    return mapped;
  }

  // Check if it's already a valid key
  if (normalized in CORE_SERVICE_CATEGORIES) {
    return normalized as ServiceCategoryKey;
  }

  return null;
}

/**
 * Get the display name for a category key
 * @param key - The category key
 * @returns Display name or the key itself if not found
 */
export function getCategoryName(key: string): string {
  const normalized = normalizeCategoryKey(key);
  if (normalized) {
    return CORE_SERVICE_CATEGORIES[normalized];
  }
  return key;
}

/**
 * Validate if a category key is valid
 * @param key - The category key to validate
 * @returns true if valid, false otherwise
 */
export function isValidCategoryKey(key: string): boolean {
  return normalizeCategoryKey(key) !== null;
}

