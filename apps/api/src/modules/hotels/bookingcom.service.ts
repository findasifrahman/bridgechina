/**
 * Booking.com RapidAPI Integration Service
 * Server-side only - never expose API key to client
 */

import axios, { AxiosInstance } from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RAPID_API_KEY = process.env.RAPID_API_KEY;
const RAPID_API_HOST = 'booking-com15.p.rapidapi.com';

if (!RAPID_API_KEY) {
  console.warn('[Booking.com] ⚠️  RAPID_API_KEY not set');
}

// Create axios instance for RapidAPI
const rapidApiClient: AxiosInstance = axios.create({
  baseURL: `https://${RAPID_API_HOST}`,
  headers: {
    'X-RapidAPI-Host': RAPID_API_HOST,
    'X-RapidAPI-Key': RAPID_API_KEY || '',
  },
  timeout: 30000,
});

/**
 * Make a request to Booking.com RapidAPI with retry logic for network errors
 */
async function bookingcomRequest(path: string, params: Record<string, any> = {}, retries: number = 2): Promise<any> {
  if (!RAPID_API_KEY) {
    throw new Error('RAPID_API_KEY not configured');
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[Booking.com] Retry attempt ${attempt}/${retries} for ${path}`);
        // Wait before retry (exponential backoff: 1s, 2s)
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
      
      // Log the actual request URL and params for debugging
      const url = `${rapidApiClient.defaults.baseURL}${path}`;
      console.log('[Booking.com] Making request to:', url);
      console.log('[Booking.com] Request params:', JSON.stringify(params, null, 2));
      
      const response = await rapidApiClient.get(path, { params });
      
      console.log('[Booking.com] Response status:', response.status);
      if (response.data) {
        console.log('[Booking.com] Response data keys:', Object.keys(response.data));
        if (response.data.status === false) {
          console.log('[Booking.com] Error response:', JSON.stringify(response.data, null, 2));
        }
      }
      
      return response.data;
    } catch (error: any) {
      const isNetworkError = error.code === 'ECONNRESET' || 
                             error.code === 'ETIMEDOUT' || 
                             error.code === 'ECONNREFUSED' ||
                             error.message?.includes('socket disconnected') ||
                             error.message?.includes('network');
      
      // If it's a network error and we have retries left, retry
      if (isNetworkError && attempt < retries) {
        console.warn(`[Booking.com] Network error (attempt ${attempt + 1}/${retries + 1}), will retry:`, error.message);
        continue;
      }
      
      // Otherwise, log and throw
      console.error('[Booking.com] API error:', {
        path,
        params,
        status: error.response?.status,
        message: error.message,
        code: error.code,
        data: error.response?.data,
        responseData: error.response?.data ? JSON.stringify(error.response.data, null, 2) : 'none',
        attempt: attempt + 1,
      });
      throw error;
    }
  }
  
  // Should never reach here, but TypeScript needs it
  throw new Error('Failed to make request after retries');
}

/**
 * Search for destinations (cities, hotels, etc.)
 * Response: { status: true, message: "Success", data: [...] }
 */
export async function searchDestination(query: string): Promise<any> {
  const response = await bookingcomRequest('/api/v1/hotels/searchDestination', { query });
  // API returns { status, message, data: [...] }
  if (response.status === true && response.data) {
    console.log('[Booking.com] searchDestination response:', JSON.stringify(response.data, null, 2));
    return response;
  }
  console.log('[Booking.com] searchDestination error response:', JSON.stringify(response, null, 2));
  throw new Error(`Invalid searchDestination response: ${JSON.stringify(response)}`);
}

/**
 * Search hotels by destination
 * Response: { status: true, message: "Success", data: { hotels: [...] } }
 * Note: API requires arrival_date and departure_date (not checkin/checkout)
 */
export async function searchHotels(params: {
  dest_id: string;
  search_type: string;
  adults?: number;
  children_age?: string;
  room_qty?: number;
  page_number?: number;
  units?: string;
  temperature_unit?: string;
  languagecode?: string;
  currency_code?: string;
  arrival_date?: string; // YYYY-MM-DD format
  departure_date?: string; // YYYY-MM-DD format
  checkin?: string; // Alternative name, will be mapped to arrival_date
  checkout?: string; // Alternative name, will be mapped to departure_date
}): Promise<any> {
  const defaultParams = {
    units: 'metric',
    temperature_unit: 'c',
    languagecode: 'en-us',
    currency_code: 'CNY',
    adults: 1,
    room_qty: 1,
    children_age: '',
    page_number: 1,
  };

  // Map checkin/checkout to arrival_date/departure_date if provided
  const apiParams: any = {
    ...defaultParams,
    ...params,
  };

  // Remove checkin/checkout from params (they're not API parameters)
  delete apiParams.checkin;
  delete apiParams.checkout;

  // Convert dates - API might expect YYYY-MM-DD (ISO format) instead of dd/mm/yyyy
  // Based on the error, let's try keeping the original YYYY-MM-DD format
  function convertDateFormat(dateStr: string): string | null {
    if (!dateStr) return null;
    
    try {
      // Validate the date first
      const date = new Date(dateStr + 'T00:00:00');
      if (isNaN(date.getTime())) {
        console.warn('[Booking.com] Invalid date format:', dateStr);
        return null;
      }
      
      // Check if it's already in YYYY-MM-DD format (most APIs prefer this)
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        console.log('[Booking.com] Date already in YYYY-MM-DD format:', dateStr);
        return dateStr; // Return as-is, API likely expects ISO format
      }
      
      // If not, format as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      const isoFormat = `${year}-${month}-${day}`;
      console.log('[Booking.com] Date conversion:', { original: dateStr, converted: isoFormat });
      return isoFormat;
    } catch (error) {
      console.error('[Booking.com] Date conversion error:', error, dateStr);
      return null;
    }
  }

  // Convert arrival_date/departure_date from checkin/checkout if provided
  if (params.checkin && !apiParams.arrival_date) {
    const converted = convertDateFormat(params.checkin);
    if (converted) {
      apiParams.arrival_date = converted;
    } else {
      console.warn('[Booking.com] Failed to convert checkin date:', params.checkin);
    }
  }
  if (params.checkout && !apiParams.departure_date) {
    const converted = convertDateFormat(params.checkout);
    if (converted) {
      apiParams.departure_date = converted;
    } else {
      console.warn('[Booking.com] Failed to convert checkout date:', params.checkout);
    }
  }
  
  // If arrival_date/departure_date are already provided, ensure they're in correct format
  // (The convertDateFormat function now returns YYYY-MM-DD format)
  if (apiParams.arrival_date && apiParams.arrival_date.includes('/')) {
    // If it's in dd/mm/yyyy format, convert it
    const converted = convertDateFormat(apiParams.arrival_date.replace(/\//g, '-'));
    if (converted) {
      apiParams.arrival_date = converted;
    }
  } else if (apiParams.arrival_date && !/^\d{4}-\d{2}-\d{2}$/.test(apiParams.arrival_date)) {
    // If it's not in YYYY-MM-DD format, try to convert it
    const converted = convertDateFormat(apiParams.arrival_date);
    if (converted) {
      apiParams.arrival_date = converted;
    }
  }
  
  if (apiParams.departure_date && apiParams.departure_date.includes('/')) {
    const converted = convertDateFormat(apiParams.departure_date.replace(/\//g, '-'));
    if (converted) {
      apiParams.departure_date = converted;
    }
  } else if (apiParams.departure_date && !/^\d{4}-\d{2}-\d{2}$/.test(apiParams.departure_date)) {
    const converted = convertDateFormat(apiParams.departure_date);
    if (converted) {
      apiParams.departure_date = converted;
    }
  }

  // Validate dates - they are MANDATORY for the API
  if (!apiParams.arrival_date || !apiParams.departure_date) {
    throw new Error('Arrival date and departure date are required for hotel search.');
  }
  
  // Parse dates - support both YYYY-MM-DD and dd/mm/yyyy formats
  const parseDate = (dateStr: string): Date | null => {
    // Try YYYY-MM-DD format first (ISO)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      // Parse as local date (not UTC) to avoid timezone issues
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) return date;
    }
    
    // Try dd/mm/yyyy format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return date;
    }
    
    return null;
  };

  const arrival = parseDate(apiParams.arrival_date);
  const departure = parseDate(apiParams.departure_date);
  
  if (!arrival || !departure) {
    throw new Error('Invalid date format. Please use YYYY-MM-DD format.');
  }
  
  // Get today's date at midnight in local timezone
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Normalize dates to midnight for comparison (avoid timezone issues)
  const arrivalDateOnly = new Date(arrival.getFullYear(), arrival.getMonth(), arrival.getDate());
  const departureDateOnly = new Date(departure.getFullYear(), departure.getMonth(), departure.getDate());
  
  if (departureDateOnly <= arrivalDateOnly) {
    throw new Error('Departure date must be after arrival date.');
  }
  
  if (arrivalDateOnly < today) {
    throw new Error('Arrival date must be today or in the future.');
  }
  
  // Dates are valid - ensure they're in YYYY-MM-DD format for API
  if (!/^\d{4}-\d{2}-\d{2}$/.test(apiParams.arrival_date)) {
    // Convert to YYYY-MM-DD if not already
    const year = arrivalDateOnly.getFullYear();
    const month = String(arrivalDateOnly.getMonth() + 1).padStart(2, '0');
    const day = String(arrivalDateOnly.getDate()).padStart(2, '0');
    apiParams.arrival_date = `${year}-${month}-${day}`;
  }
  
  if (!/^\d{4}-\d{2}-\d{2}$/.test(apiParams.departure_date)) {
    // Convert to YYYY-MM-DD if not already
    const year = departureDateOnly.getFullYear();
    const month = String(departureDateOnly.getMonth() + 1).padStart(2, '0');
    const day = String(departureDateOnly.getDate()).padStart(2, '0');
    apiParams.departure_date = `${year}-${month}-${day}`;
  }
  
  // If dates are mandatory but missing, don't call the API
  if (!apiParams.arrival_date || !apiParams.departure_date) {
    console.warn('[Booking.com] Missing mandatory dates (arrival_date and departure_date are required), skipping API call');
    throw new Error('Arrival date and departure date are required for hotel search');
  }

  // Log what we're sending to debug
  console.log('[Booking.com] searchHotels params:', JSON.stringify(apiParams, null, 2));
  
  const response = await bookingcomRequest('/api/v1/hotels/searchHotels', apiParams);
  
  // Log the response
  console.log('[Booking.com] searchHotels response status:', response.status);
  if (response.status === false) {
    console.log('[Booking.com] searchHotels error response:', JSON.stringify(response, null, 2));
  }
  
  // API returns { status, message, data: { hotels: [...] } }
  if (response.status === true && response.data && response.data.hotels) {
    // Log sample hotel structure for debugging (first hotel only)
    if (Array.isArray(response.data.hotels) && response.data.hotels.length > 0) {
      const sampleHotel = response.data.hotels[0];
      console.log('[Booking.com] Sample hotel structure:', {
        hotel_id: sampleHotel.hotel_id,
        id: sampleHotel.id,
        name: sampleHotel.name,
        property_id: sampleHotel.property?.id,
        property_name: sampleHotel.property?.name,
        hotel_photoUrls: sampleHotel.photoUrls,
        property_photoUrls: sampleHotel.property?.photoUrls,
        property_keys: sampleHotel.property ? Object.keys(sampleHotel.property) : [],
        all_keys: Object.keys(sampleHotel),
        full_structure: JSON.stringify(sampleHotel, null, 2).substring(0, 1000), // First 1000 chars
      });
    }
    return response;
  }
  
  // Handle error response
  if (response.status === false) {
    const errorMsg = Array.isArray(response.message) 
      ? response.message.map((m: any) => Object.values(m).join(': ')).join(', ')
      : response.message || 'Unknown error';
    throw new Error(`Booking.com API error: ${errorMsg}`);
  }
  
  throw new Error(`Invalid searchHotels response: ${JSON.stringify(response)}`);
}

/**
 * Get hotel details
 * Response: { status: true, message: "Success", data: {...} }
 */
export async function getHotelDetails(
  hotel_id: string,
  params: {
    adults?: number;
    children_age?: string;
    room_qty?: number;
    units?: string;
    temperature_unit?: string;
    languagecode?: string;
    currency_code?: string;
    arrival_date?: string; // YYYY-MM-DD format
    departure_date?: string; // YYYY-MM-DD format
  } = {}
): Promise<any> {
  const defaultParams = {
    units: 'metric',
    temperature_unit: 'c',
    languagecode: 'en-us',
    currency_code: 'CNY',
    adults: 1,
    room_qty: 1,
    children_age: '',
  };

  const response = await bookingcomRequest('/api/v1/hotels/getHotelDetails', {
    hotel_id,
    ...defaultParams,
    ...params,
  });
  
  // API returns { status, message, data: {...} }
  if (response.status === true && response.data) {
    return response;
  }
  throw new Error(`Invalid getHotelDetails response: ${JSON.stringify(response)}`);
}

/**
 * Get hotel description and info
 * Response: { status: true, message: "Success", data: [...] }
 */
export async function getDescriptionAndInfo(
  hotel_id: string,
  languagecode: string = 'en-us'
): Promise<any> {
  const response = await bookingcomRequest('/api/v1/hotels/getDescriptionAndInfo', {
    hotel_id,
    languagecode,
  });
  
  if (response.status === true && response.data) {
    return response;
  }
  throw new Error(`Invalid getDescriptionAndInfo response: ${JSON.stringify(response)}`);
}

/**
 * Get payment features
 * Response: { status: true, message: "Success", data: [...] }
 */
export async function getPaymentFeatures(
  hotel_id: string,
  languagecode: string = 'en-us'
): Promise<any> {
  const response = await bookingcomRequest('/api/v1/hotels/getPaymentFeatures', {
    hotel_id,
    languagecode,
  });
  
  if (response.status === true && response.data) {
    return response;
  }
  throw new Error(`Invalid getPaymentFeatures response: ${JSON.stringify(response)}`);
}

/**
 * Get hotel reviews filter metadata
 * Response: { status: true, message: "Success", data: { total_reviews, filters: [...] } }
 */
export async function getHotelReviewsFilterMetadata(
  hotel_id: string,
  languagecode: string = 'en-us'
): Promise<any> {
  const response = await bookingcomRequest('/api/v1/hotels/getHotelReviewsFilterMetadata', {
    hotel_id,
    languagecode,
  });
  
  if (response.status === true && response.data) {
    return response;
  }
  throw new Error(`Invalid getHotelReviewsFilterMetadata response: ${JSON.stringify(response)}`);
}

/**
 * Get hotel review scores
 * Response: { status: true, message: "Success", data: [...] }
 */
export async function getHotelReviewScores(
  hotel_id: string,
  languagecode: string = 'en-us'
): Promise<any> {
  const response = await bookingcomRequest('/api/v1/hotels/getHotelReviewScores', {
    hotel_id,
    languagecode,
  });
  
  if (response.status === true && response.data) {
    return response;
  }
  throw new Error(`Invalid getHotelReviewScores response: ${JSON.stringify(response)}`);
}

/**
 * Get popular attractions nearby
 * Response: { status: true, message: "Success", data: { popular_landmarks: [...], closest_landmarks: [...] } }
 */
export async function getPopularAttractionNearBy(
  hotel_id: string,
  languagecode: string = 'en-us'
): Promise<any> {
  const response = await bookingcomRequest('/api/v1/hotels/getPopularAttractionNearBy', {
    hotel_id,
    languagecode,
  });
  
  if (response.status === true && response.data) {
    return response;
  }
  throw new Error(`Invalid getPopularAttractionNearBy response: ${JSON.stringify(response)}`);
}

/**
 * Check if query is Guangzhou (case-insensitive, supports variations)
 */
export function isGuangzhouQuery(query: string): boolean {
  const normalized = query.toLowerCase().trim();
  const guangzhouVariations = [
    'guangzhou',
    '广州',
    'guang zhou',
    'guangzhou china',
    'guangdong guangzhou',
    'canton', // Guangzhou is also known as Canton
  ];

  return guangzhouVariations.some(variant => normalized.includes(variant));
}

/**
 * Get or create Guangzhou destination from cache/API
 */
export async function getGuangzhouDestination(): Promise<{
  dest_id: string;
  search_type: string;
  dest_type: string;
}> {
  // Check cache first
  const cached = await (prisma as any).externalDestination.findFirst({
    where: {
      provider: 'bookingcom',
      query: { contains: 'guangzhou', mode: 'insensitive' },
      dest_type: 'city',
    },
    orderBy: { nr_hotels: 'desc' }, // Prefer destination with most hotels
  });

  if (cached) {
    console.log('[Booking.com] Using cached Guangzhou destination:', cached.dest_id);
    return {
      dest_id: cached.dest_id,
      search_type: cached.search_type,
      dest_type: cached.dest_type,
    };
  }

  // Fetch from API (cache miss - this is when searchDestination will be called)
  console.log('[Booking.com] Cache miss - calling searchDestination for Guangzhou');
  const results = await searchDestination('Guangzhou');
  
  // API returns { status: true, message: "Success", data: [...] }
  if (!results?.status || !results?.data || !Array.isArray(results.data) || results.data.length === 0) {
    throw new Error('No Guangzhou destination found in Booking.com');
  }

  // Find city destination with most hotels
  const cityDest = results.data
    .filter((d: any) => d.dest_type === 'city')
    .sort((a: any, b: any) => (b.nr_hotels || 0) - (a.nr_hotels || 0))[0];

  if (!cityDest) {
    throw new Error('No city destination found for Guangzhou');
  }

  // Cache it
  await (prisma as any).externalDestination.upsert({
    where: {
      provider_dest_id_dest_type: {
        provider: 'bookingcom',
        dest_id: cityDest.dest_id,
        dest_type: cityDest.dest_type || 'city',
      },
    },
    create: {
      provider: 'bookingcom',
      query: 'Guangzhou',
      dest_id: cityDest.dest_id,
      dest_type: cityDest.dest_type || 'city',
      search_type: 'CITY',
      label: cityDest.label,
      city_name: cityDest.city_name || 'Guangzhou',
      country: cityDest.country,
      cc1: cityDest.cc1,
      latitude: cityDest.latitude,
      longitude: cityDest.longitude,
      nr_hotels: cityDest.nr_hotels,
      image_url: cityDest.image_url,
      roundtrip: cityDest.roundtrip,
      raw_json: cityDest,
    },
    update: {
      nr_hotels: cityDest.nr_hotels,
      raw_json: cityDest,
      updated_at: new Date(),
    },
  });

  return {
    dest_id: cityDest.dest_id,
    search_type: 'CITY',
    dest_type: cityDest.dest_type || 'city',
  };
}

/**
 * Normalize external hotel from search result to ExternalHotel format
 * Hotel structure from searchHotels: { id, name, property: {...}, priceBreakdown: {...}, ... }
 */
export function normalizeExternalHotel(hotel: any, provider: string = 'bookingcom'): Partial<any> {
  // Extract from searchHotels response structure
  // Based on API response: hotel data is in property object, hotel_id is at root
  const hotelId = String(hotel.hotel_id || hotel.id || hotel.property?.id || '');
  const property = hotel.property || {};
  const priceBreakdown = hotel.priceBreakdown || property.priceBreakdown || {};
  const grossPrice = priceBreakdown.grossPrice || {};
  const strikethroughPrice = priceBreakdown.strikethroughPrice || {};
  
  // Check for free cancellation from accessibilityLabel or block policies
  const accessibilityLabel = hotel.accessibilityLabel || '';
  const hasFreeCancellation = accessibilityLabel.toLowerCase().includes('free cancellation') ||
    (hotel.block?.paymentterms?.cancellation?.type === 'free_cancellation');

  // Images are in property.photoUrls (array of URLs) based on API response structure
  // Try property.photoUrls first (most likely location), then fallback to other locations
  const imageUrl = property?.photoUrls?.[0] || 
                   hotel.photoUrls?.[0] || 
                   property?.photos?.[0]?.url_max || 
                   property?.photos?.[0]?.url_original ||
                   hotel.photos?.[0]?.url_max || 
                   hotel.photos?.[0]?.url_original ||
                   hotel.photoUrl ||
                   hotel.imageUrl ||
                   null;
  
  const photoUrls = property?.photoUrls || 
                   hotel.photoUrls || 
                   (property?.photos ? property.photos.map((p: any) => p.url_max || p.url_original).filter(Boolean) : []) ||
                   (hotel.photos ? hotel.photos.map((p: any) => p.url_max || p.url_original).filter(Boolean) : []) ||
                   [];

  return {
    provider,
    hotel_id: hotelId,
    ufi: property.ufi || hotel.ufi,
    name: property.name || hotel.name || 'Unknown Hotel',
    city: property.city_name || hotel.city_name || hotel.city,
    district: property.district || hotel.district,
    country_code: property.countryCode || hotel.countryCode,
    address: property.address || hotel.address || hotel.hotel_address,
    latitude: property.latitude || hotel.latitude,
    longitude: property.longitude || hotel.longitude,
    star_rating: property.propertyClass || property.accuratePropertyClass || 0,
    review_score: property.reviewScore || 0,
    review_score_word: property.reviewScoreWord || '',
    review_count: property.reviewCount || 0,
    is_preferred: property.isPreferred || hotel.isPreferred || false,
    currency: grossPrice.currency || strikethroughPrice.currency || hotel.currency || property.currency || 'CNY',
    gross_price: grossPrice.value || null,
    strikethrough_price: strikethroughPrice.value || null,
    has_free_cancellation: hasFreeCancellation,
    includes_taxes_and_charges: accessibilityLabel.toLowerCase().includes('includes taxes and charges'),
    cover_photo_url: imageUrl,
    photo_urls: photoUrls,
    raw_search_json: hotel,
  };
}

/**
 * Upsert external hotel from search result
 */
export async function upsertExternalHotel(hotelData: any, provider: string = 'bookingcom'): Promise<any> {
  const normalized = normalizeExternalHotel(hotelData, provider);
  const hotelId = normalized.hotel_id;

  return (prisma as any).externalHotel.upsert({
    where: {
      provider_hotel_id: {
        provider,
        hotel_id: hotelId,
      },
    },
    create: {
      ...normalized,
      last_synced_at: new Date(),
    } as any,
    update: {
      ...normalized,
      last_synced_at: new Date(),
    } as any,
  });
}

