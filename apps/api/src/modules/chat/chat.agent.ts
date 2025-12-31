/**
 * BridgeChina AI Chat Agent
 * Handles intent detection, conversation memory, and routed responses
 */

import OpenAI from 'openai';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { searchByKeyword } from '../shopping/shopping.service.js';
import tmapiClient from '../shopping/tmapi.client.js';

const prisma = new PrismaClient();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_ROUTER_MODEL = process.env.OPENAI_ROUTER_MODEL || 'gpt-4o-mini';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_DISTILL_MODEL = process.env.OPENAI_DISTILL_MODEL || 'gpt-4o-mini';
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn('[Chat Agent] ⚠️  OPENAI_API_KEY not set');
}

if (!TAVILY_API_KEY) {
  console.warn('[Chat Agent] ⚠️  TAVILY_API_KEY not set');
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Supported cities
const SUPPORTED_CITIES = ['guangzhou', 'hainan'];

// City name mappings
const CITY_MAPPINGS: Record<string, string> = {
  'guangzhou': 'guangzhou',
  'canton': 'guangzhou',
  'gz': 'guangzhou',
  // Guangzhou districts and areas
  'sanyuanli': 'guangzhou',
  'xiaobei': 'guangzhou',
  'taojin': 'guangzhou',
  'tianhe': 'guangzhou',
  'yuexiu': 'guangzhou',
  'haizhu': 'guangzhou',
  'liwan': 'guangzhou',
  'baiyun': 'guangzhou',
  'huangpu': 'guangzhou',
  'panyu': 'guangzhou',
  'huadu': 'guangzhou',
  'nansha': 'guangzhou',
  'conghua': 'guangzhou',
  'zengcheng': 'guangzhou',
  'zhujiang new town': 'guangzhou',
  'zhujiang newtown': 'guangzhou',
  'tianhe district': 'guangzhou',
  'yuexiu district': 'guangzhou',
  'haizhu district': 'guangzhou',
  'liwan district': 'guangzhou',
  'baiyun district': 'guangzhou',
  'huangpu district': 'guangzhou',
  'panyu district': 'guangzhou',
  'huadu district': 'guangzhou',
  'hainan': 'hainan',
  'haikou': 'hainan',
  'sanya': 'hainan',
  'beijing': 'beijing',
  'peking': 'beijing',
  'shanghai': 'shanghai',
  'shenzhen': 'shenzhen',
};

// Guangzhou districts and areas (for recognition)
const GUANGZHOU_AREAS = [
  // Districts
  'sanyuanli', 'xiaobei', 'taojin', 'tianhe', 'yuexiu', 'haizhu', 'liwan', 
  'baiyun', 'huangpu', 'panyu', 'huadu', 'nansha', 'conghua', 'zengcheng',
  // Popular areas/neighborhoods
  'zhujiang new town', 'zhujiang newtown', 'zhujiang', 'tianhe road', 'tianhe lu',
  'zhongshan road', 'zhongshan lu', 'beijing road', 'beijing lu',
  'shangxiajiu', 'shang xia jiu', 'shamian', 'lujiang', 'dongshan',
  'yide road', 'yide lu', 'yide', 'liwan road', 'liwan lu',
  'dashatou', 'dasha tou', 'computer market', 'ornaments market',
  'toys market', 'clothing market', 'hardware market', 'leather market',
  // District names with "district"
  'tianhe district', 'yuexiu district', 'haizhu district', 'liwan district',
  'baiyun district', 'huangpu district', 'panyu district', 'huadu district',
  'nansha district', 'conghua district', 'zengcheng district'
];

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface IntentResult {
  intent: 'HOTEL' | 'TRANSPORT' | 'TOUR' | 'MEDICAL' | 'HALAL_FOOD' | 'SHOPPING' | 'ESIM' | 'CITY_INFO' | 'MARKET_INFO' | 'GENERAL_CHINA' | 'OUT_OF_SCOPE' | 'GREETING';
  subIntent?: 'RETAIL' | 'FACTORY' | 'UNKNOWN'; // Only for SHOPPING intent
  city: string | null;
  confidence: number;
}

export interface ShoppingParams {
  keyword: string;
  priority: 'lowest_price' | 'rating' | 'popularity' | 'bulk';
  quantity: number | null;
}

export interface ChatResponse {
  message: string;
  images?: string[];
  shouldReset?: boolean;
  items?: Array<{
    title: string;
    imageUrl?: string;
    price?: string;
    supplier?: string;
    location?: string;
    bullets?: string[];
  }>;
}

/**
 * Session-based conversation memory
 * In production, use Redis or similar
 */
const conversationMemory = new Map<string, ChatMessage[]>();

/**
 * Get conversation history for a session
 */
function getConversationHistory(sessionId: string): ChatMessage[] {
  return conversationMemory.get(sessionId) || [];
}

/**
 * Add message to conversation history
 */
function addToHistory(sessionId: string, role: 'user' | 'assistant', content: string) {
  const history = getConversationHistory(sessionId);
  history.push({ role, content });
  
  // Keep only last 5 turns (10 messages)
  if (history.length > 10) {
    history.splice(0, history.length - 10);
  }
  
  conversationMemory.set(sessionId, history);
}

/**
 * Clear conversation history (on 6th turn)
 */
function clearHistory(sessionId: string) {
  conversationMemory.delete(sessionId);
}

/**
 * Check if message is a greeting or small talk
 */
function isGreeting(userMessage: string): boolean {
  const lower = userMessage.toLowerCase().trim();
  const greetingPatterns = [
    /^(hi|hello|hey|greetings|good morning|good afternoon|good evening)/i,
    /^(how are you|how's it going|what's up|how do you do)/i,
    /^(thanks|thank you|thx|ty)$/i,
    /^(bye|goodbye|see you|farewell)/i,
    /^(yes|no|ok|okay|sure|alright)$/i,
  ];
  
  // Check if message is very short and matches greeting patterns
  if (lower.length < 20) {
    return greetingPatterns.some(pattern => pattern.test(lower));
  }
  
  // Check for greeting phrases in longer messages
  const greetingWords = ['hi', 'hello', 'hey', 'greetings', 'thanks', 'thank you', 'bye', 'goodbye'];
  const words = lower.split(/\s+/);
  const greetingWordCount = words.filter(w => greetingWords.includes(w)).length;
  
  // If more than 30% of words are greetings, consider it a greeting
  return greetingWordCount > 0 && (greetingWordCount / words.length) > 0.3;
}

/**
 * Detect shopping sub-intent (RETAIL vs FACTORY)
 */
function detectShoppingSubIntent(userMessage: string): 'RETAIL' | 'FACTORY' | 'UNKNOWN' {
  const lower = userMessage.toLowerCase();
  
  // RETAIL keywords
  const retailKeywords = [
    'buy', 'price', 'cheapest', 'low cost', 'retail', 'order', 'product', 'sell',
    'purchase', 'shopping', 'item', 'goods', 'merchandise'
  ];
  
  // FACTORY keywords
  const factoryKeywords = [
    'factory', 'manufacturer', 'supplier', 'sourcing', 'wholesale supplier',
    'production', 'oem', 'odm', 'manufacturing', 'factory direct',
    'bulk supplier', 'trading company', 'sourcing agent'
  ];
  
  const retailMatches = retailKeywords.filter(kw => lower.includes(kw)).length;
  const factoryMatches = factoryKeywords.filter(kw => lower.includes(kw)).length;
  
  if (factoryMatches > retailMatches && factoryMatches > 0) {
    return 'FACTORY';
  }
  
  if (retailMatches > 0) {
    return 'RETAIL';
  }
  
  return 'UNKNOWN';
}

/**
 * STEP 1: Intent Detection
 */
export async function detectIntent(userMessage: string): Promise<IntentResult> {
  // Check for greeting first - short-circuit
  if (isGreeting(userMessage)) {
    return {
      intent: 'GREETING',
      city: null,
      confidence: 0.95,
    };
  }
  
  try {
    const prompt = `You are an intent classifier for BridgeChina, a service platform in China.

Classify the user's message into ONE of these intents:
- GREETING: greetings, small talk, "hi", "hello", "thanks", "bye"
- HOTEL: hotel booking, accommodation, stay, room
- TRANSPORT: transport, pickup, airport, taxi, car, driver
- TOUR: tour, experience, sightseeing, visit places
- MEDICAL: medical, doctor, hospital, health, emergency
- HALAL_FOOD: halal food, restaurant, meal, delivery, dining
- SHOPPING: product price, buying, supplier, item purchase, product search, factory, manufacturer
- ESIM: esim, sim card, data plan, mobile internet
- CITY_INFO: city information, places to visit, attractions (NOT shopping)
- MARKET_INFO: wholesale market, sourcing zone, Yiwu, Guangzhou markets (NOT buying products)
- GENERAL_CHINA: general questions about China, culture, travel tips
- OUT_OF_SCOPE: anything not related to China or BridgeChina services

Also extract city name if mentioned. IMPORTANT: 
- Guangzhou districts/areas (Sanyuanli, Tianhe, Yuexiu, Haizhu, Liwan, Baiyun, etc.) should be mapped to "guangzhou"
- Hainan cities (Haikou, Sanya) should be mapped to "hainan"
- Other cities: beijing, shanghai, shenzhen, etc.

Return ONLY valid JSON, no other text:
{
  "intent": "INTENT_NAME",
  "city": "city_name_or_null",
  "confidence": 0.0-1.0
}

User message: "${userMessage}"`;

    const response = await openai.chat.completions.create({
      model: OPENAI_ROUTER_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a JSON-only intent classifier. Return only valid JSON, no explanations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const result = JSON.parse(content) as IntentResult;
    
    // Normalize city name
    if (result.city) {
      const cityLower = result.city.toLowerCase();
      // Check if it's a Guangzhou area/district
      const isGuangzhouArea = GUANGZHOU_AREAS.some(area => cityLower.includes(area));
      if (isGuangzhouArea) {
        result.city = 'guangzhou';
      } else {
        const normalized = CITY_MAPPINGS[cityLower] || cityLower;
        result.city = normalized;
      }
    }
    
    // Detect shopping sub-intent if intent is SHOPPING
    if (result.intent === 'SHOPPING') {
      result.subIntent = detectShoppingSubIntent(userMessage);
    }

    return result;
  } catch (error) {
    console.error('[Chat Agent] Intent detection error:', error);
    // Fallback: try to detect intent from keywords
    const lower = userMessage.toLowerCase();
    let intent: IntentResult['intent'] = 'GENERAL_CHINA';
    let city: string | null = null;

    if (lower.includes('hotel') || lower.includes('accommodation') || lower.includes('stay')) {
      intent = 'HOTEL';
    } else if (lower.includes('transport') || lower.includes('pickup') || lower.includes('airport')) {
      intent = 'TRANSPORT';
    } else if (lower.includes('tour') || lower.includes('sightseeing')) {
      intent = 'TOUR';
    } else if (lower.includes('medical') || lower.includes('doctor') || lower.includes('hospital')) {
      intent = 'MEDICAL';
    } else if (lower.includes('halal') || lower.includes('food') || lower.includes('restaurant')) {
      intent = 'HALAL_FOOD';
    } else if (lower.includes('buy') || lower.includes('price') || lower.includes('product') || lower.includes('supplier') || lower.includes('factory') || lower.includes('manufacturer')) {
      intent = 'SHOPPING';
    } else if (lower.includes('esim') || lower.includes('sim') || lower.includes('data')) {
      intent = 'ESIM';
    } else if (lower.includes('market') || lower.includes('wholesale') || lower.includes('yiwu')) {
      intent = 'MARKET_INFO';
    }

    // Extract city - check Guangzhou areas first
    const isGuangzhouArea = GUANGZHOU_AREAS.some(area => lower.includes(area));
    if (isGuangzhouArea) {
      city = 'guangzhou';
    } else {
      // Check other city mappings
      for (const [key, value] of Object.entries(CITY_MAPPINGS)) {
        if (lower.includes(key)) {
          city = value;
          break;
        }
      }
    }

    const result: IntentResult = {
      intent,
      city,
      confidence: 0.5,
    };
    
    // Detect shopping sub-intent if intent is SHOPPING
    if (intent === 'SHOPPING') {
      result.subIntent = detectShoppingSubIntent(userMessage);
    }
    
    return result;
  }
}

/**
 * STEP 2: Service Availability Guard
 */
function checkServiceAvailability(intent: IntentResult, userMessage: string): string | null {
  const serviceIntents: IntentResult['intent'][] = ['HOTEL', 'TRANSPORT', 'TOUR', 'MEDICAL', 'HALAL_FOOD', 'ESIM'];
  
  if (!serviceIntents.includes(intent.intent)) {
    return null; // Not a service intent, proceed
  }

  if (!intent.city) {
    return null; // No city specified, proceed (will handle in response)
  }

  const cityLower = intent.city.toLowerCase();
  
  // Check if it's a Guangzhou area/district
  const isGuangzhouArea = GUANGZHOU_AREAS.some(area => cityLower.includes(area));
  if (isGuangzhouArea) {
    return null; // Guangzhou area, proceed
  }
  
  if (SUPPORTED_CITIES.includes(cityLower)) {
    return null; // City is supported, proceed
  }

  // City not supported
  const cityName = intent.city.charAt(0).toUpperCase() + intent.city.slice(1);
  return `Currently BridgeChina operates in Guangzhou and Hainan.\n${cityName} services are coming soon.\nWould you like help in Guangzhou instead?`;
}

/**
 * Extract shopping parameters
 */
async function extractShoppingParams(userMessage: string): Promise<ShoppingParams> {
  try {
    const prompt = `Extract shopping parameters from this user message.

Return JSON only:
{
  "keyword": "product search keyword",
  "priority": "lowest_price | rating | popularity | bulk",
  "quantity": number or null
}

Priority rules:
- lowest_price: user wants cheapest, budget, low price
- rating: user wants best quality, high rating, good reviews
- popularity: user wants popular, best-selling, trending
- bulk: user wants bulk, wholesale, large quantity

User message: "${userMessage}"`;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a JSON-only parameter extractor. Return only valid JSON, no explanations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const result = JSON.parse(content) as ShoppingParams;
    return result;
  } catch (error: any) {
    console.error('[Chat Agent] Shopping params extraction error:', error);
    
    // Handle OpenAI geographic restriction
    if (error?.status === 403 && error?.code === 'unsupported_country_region_territory') {
      console.warn('[Chat Agent] OpenAI not available in this region, using fallback parameter extraction');
      // Fallback: simple keyword extraction without OpenAI
      const lowerMessage = userMessage.toLowerCase();
      let priority: 'lowest_price' | 'rating' | 'popularity' | 'bulk' = 'popularity';
      
      if (lowerMessage.includes('cheapest') || lowerMessage.includes('cheap') || lowerMessage.includes('lowest') || lowerMessage.includes('budget')) {
        priority = 'lowest_price';
      } else if (lowerMessage.includes('best') || lowerMessage.includes('top rated') || lowerMessage.includes('highest rated')) {
        priority = 'rating';
      } else if (lowerMessage.includes('bulk') || lowerMessage.includes('wholesale') || lowerMessage.includes('large quantity')) {
        priority = 'bulk';
      }
      
      // Extract keyword: remove common words and use the rest
      const stopWords = ['i', 'want', 'to', 'buy', 'need', 'what', 'is', 'the', 'price', 'of', 'for', 'a', 'an', 'and', 'or', 'you', 'have', 'brand'];
      const words = userMessage.toLowerCase().split(/\s+/).filter(w => !stopWords.includes(w) && w.length > 2);
      const keyword = words.slice(0, 5).join(' ') || userMessage.substring(0, 50);
      
      return {
        keyword: keyword.trim(),
        priority: priority,
        quantity: null,
      };
    }
    // Fallback: extract keyword from message
    const words = userMessage.split(/\s+/).filter(w => w.length > 2);
    return {
      keyword: words.join(' ') || 'products',
      priority: 'popularity',
      quantity: null,
    };
  }
}

/**
 * Search Tavily for information
 */
async function searchTavily(query: string, maxResults: number = 3): Promise<string> {
  if (!TAVILY_API_KEY) {
    return '';
  }

  try {
    const response = await axios.post(
      'https://api.tavily.com/search',
      {
        api_key: TAVILY_API_KEY,
        query,
        search_depth: 'basic',
        max_results: maxResults,
        include_answer: true,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = response.data;
    if (data.answer) {
      return data.answer;
    }

    // Fallback to snippets
    if (data.results && data.results.length > 0) {
      return data.results
        .map((r: any) => r.content || r.snippet)
        .join('\n\n')
        .substring(0, 1000);
    }

    return '';
  } catch (error) {
    console.error('[Chat Agent] Tavily search error:', error);
    return '';
  }
}

/**
 * Get service data from database
 */
async function getServiceData(
  intent: IntentResult['intent'], 
  city: string | null,
  sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'default'
) {
  try {
    // Find city by slug if city is provided
    let cityId: string | undefined = undefined;
    if (city) {
      const cityRecord = await prisma.city.findUnique({
        where: { slug: city },
        select: { id: true },
      });
      cityId = cityRecord?.id;
    }
    
    switch (intent) {
      case 'HOTEL': {
        const hotels = await prisma.hotel.findMany({
          where: {
            ...(cityId ? { city_id: cityId } : {}),
            verified: true,
          },
          include: { city: true, coverAsset: true },
          take: 10, // Get more to sort
        });
        
        // Sort based on priority
        if (sortBy === 'price_asc') {
          hotels.sort((a, b) => {
            const priceA = a.price_from || a.price_to || 999999;
            const priceB = b.price_from || b.price_to || 999999;
            return priceA - priceB;
          });
        } else if (sortBy === 'price_desc') {
          hotels.sort((a, b) => {
            const priceA = a.price_from || a.price_to || 0;
            const priceB = b.price_from || b.price_to || 0;
            return priceB - priceA;
          });
        } else if (sortBy === 'rating') {
          hotels.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        }
        
        return hotels.slice(0, 2); // Return top 2 after sorting
      }
      
      case 'TRANSPORT':
        return await prisma.transportProduct.findMany({
          where: {
            ...(cityId ? { city_id: cityId } : {}),
          },
          include: { city: true, coverAsset: true },
          take: 2,
        });
      
      case 'TOUR':
        return await prisma.tour.findMany({
          where: {
            ...(cityId ? { city_id: cityId } : {}),
          },
          include: { city: true, coverAsset: true },
          take: 2,
        });
      
      case 'MEDICAL':
        return await prisma.medicalCenter.findMany({
          where: {
            ...(cityId ? { city_id: cityId } : {}),
            verified: true,
          },
          include: { city: true, coverAsset: true },
          take: 2,
        });
      
      case 'HALAL_FOOD':
        return await prisma.restaurant.findMany({
          where: {
            ...(cityId ? { city_id: cityId } : {}),
            halal_verified: true,
          },
          include: { city: true, coverAsset: true },
          take: 2,
        });
      
      case 'ESIM':
        return await prisma.esimPlan.findMany({
          take: 2,
          orderBy: { price: 'asc' },
        });
      
      default:
        return [];
    }
  } catch (error) {
    console.error('[Chat Agent] Database query error:', error);
    return [];
  }
}

/**
 * Enforce English output - translate if Chinese detected
 */
async function enforceEnglish(text: string): Promise<string> {
  // Check if text contains Chinese characters
  const hasChinese = /[\u4e00-\u9fff]/.test(text);
  
  if (!hasChinese) {
    return text; // Already in English
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_DISTILL_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a translator. Translate to fluent English only. Preserve names, numbers, prices, URLs exactly as they are.',
        },
        {
          role: 'user',
          content: `Translate this to English, preserving all names, numbers, prices, and URLs:\n\n${text}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });
    
    return response.choices[0]?.message?.content || text;
  } catch (error) {
    console.error('[Chat Agent] English enforcement error:', error);
    return text; // Return original if translation fails
  }
}

/**
 * Generate fallback response when OpenAI is unavailable
 */
function generateFallbackResponse(
  userMessage: string,
  intent: IntentResult,
  context: {
    serviceData?: any[];
    tavilyInfo?: string;
    shoppingResults?: any[];
  }
): string {
  // Handle shopping results
  if (context.shoppingResults && context.shoppingResults.length > 0) {
    const items = context.shoppingResults.slice(0, 2);
    const lines = items.map((item, index) => {
      const price = item.price ? `¥${item.price}` : 'Price on request';
      const supplier = item.supplier || 'Supplier';
      return `${index + 1}. ${item.title} - ${price} - ${supplier}`;
    });
    return lines.join('\n') + '\n\nWould you like me to help you place an order or check delivery inside China?';
  }
  
  // Handle service data (hotels, transport, etc.)
  if (context.serviceData && context.serviceData.length > 0) {
    const items = context.serviceData.slice(0, 2);
    const lines = items.map((item, index) => {
      const price = item.price_from || item.base_price || item.price;
      const priceStr = price ? `¥${price}` : 'Price on request';
      const location = item.address?.split(',')[0]?.trim() || item.city?.name || 'Location not specified';
      return `${index + 1}. ${item.name || item.title} - ${priceStr} - ${location}`;
    });
    return lines.join('\n') + '\n\nFor more details or booking, please contact us via WhatsApp.';
  }
  
  // Generic fallback
  return 'I can help you with hotels, transport, halal food, medical help, tours, eSIM plans, and shopping in China. Please contact us via WhatsApp for detailed assistance.';
}

/**
 * Generate response using OpenAI with context
 */
async function generateResponse(
  userMessage: string,
  intent: IntentResult,
  context: {
    serviceData?: any[];
    tavilyInfo?: string;
    shoppingResults?: any[];
  },
  conversationHistory: ChatMessage[]
): Promise<string> {
  const systemPrompt = `You are a friendly, professional AI assistant for BridgeChina, a service platform helping people navigate China.

CRITICAL RULES:
- Keep responses COMPACT (max 6-8 lines total)
- NEVER include image URLs in your response - images are displayed separately
- NEVER mention "[View image]" or image links
- Show only TOP 2 results
- Format as: Name - Price - Location (one line per item)
- Be direct and answer the specific question asked
- If user asks for "cheapest", highlight the cheapest option first

Your role:
- Help users with China-related services (hotels, transport, food, medical, tours, eSIM, shopping)
- Be friendly, polite, and professional
- Always respond in English
- Never invent prices or availability - only mention what you know
- Encourage sign-up or WhatsApp contact when relevant

BridgeChina operates in: Guangzhou and Hainan.

Tone: Warm, helpful, professional, like a real travel assistant.`;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Add conversation history (last 5 turns)
  messages.push(...conversationHistory.map(msg => ({
    role: msg.role,
    content: msg.content,
  })) as OpenAI.Chat.Completions.ChatCompletionMessageParam[]);

  // Add context based on intent
  let contextPrompt = `User intent: ${intent.intent}`;
  if (intent.city) {
    contextPrompt += `\nCity: ${intent.city}`;
  }

  if (context.serviceData && context.serviceData.length > 0) {
    // Limit to 2 items and format cleanly
    const limitedData = context.serviceData.slice(0, 2).map((item: any, index: number) => {
      const price = item.price_from || item.base_price || item.price;
      const priceTo = item.price_to;
      const priceStr = priceTo && priceTo !== price ? `¥${price}-${priceTo}` : (price ? `¥${price}` : 'Price on request');
      const location = item.address?.split(',')[0]?.trim() || item.city?.name || '';
      
      return {
        number: index + 1,
        name: item.name || item.title,
        price: priceStr,
        location: location,
        rating: item.rating ? `${item.rating}/5` : null,
        // DO NOT include image URLs - they are handled separately
      };
    });
    contextPrompt += `\n\nAvailable services (format EXACTLY as: "1. Name - Price - Location" one line per item, be concise, NO image URLs):\n${JSON.stringify(limitedData, null, 2)}`;
  }

  if (context.tavilyInfo) {
    contextPrompt += `\n\nAdditional information:\n${context.tavilyInfo}`;
  }

  if (context.shoppingResults && context.shoppingResults.length > 0) {
    // Limit to 2 items
    const limitedShopping = context.shoppingResults.slice(0, 2).map((item: any) => {
      // Handle both mapped format (with item.price) and ProductCard format (with priceMin/priceMax)
      const price = item.price || item.priceMin || item.priceMax;
      const priceStr = price ? `¥${price}` : 'Price on request';
      const currency = item.currency || 'CNY';
      
      return {
        title: item.title,
        price: priceStr,
        currency: currency,
        supplier: item.supplier || item.sellerName,
        // DO NOT include image URLs - they are handled separately
      };
    });
    contextPrompt += `\n\nShopping results (format EXACTLY as: "1. Title - Price - Supplier" one line per item, NO image URLs):\n${JSON.stringify(limitedShopping, null, 2)}`;
  }

  // Detect if user wants cheapest
  const wantsCheapest = userMessage.toLowerCase().includes('cheapest') || 
                        userMessage.toLowerCase().includes('cheap') || 
                        userMessage.toLowerCase().includes('lowest') ||
                        userMessage.toLowerCase().includes('low cost') ||
                        userMessage.toLowerCase().includes('budget');
  
  const priceHint = wantsCheapest ? ' User asked for cheapest - highlight the cheapest option first.' : '';
  
  messages.push({
    role: 'user',
    content: `${contextPrompt}\n\nUser message: "${userMessage}"\n\nProvide a COMPACT response (max 5-6 lines). Format EXACTLY as: "1. Name - Price - Location" (one line per item).${priceHint} Be direct and concise. NO image URLs, NO bullet points, just numbered list.`,
  });

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      temperature: 0.5, // Lower temperature for more consistent formatting
      max_tokens: 200, // Further reduced for compact responses
    });

    return response.choices[0]?.message?.content || 'I apologize, I could not generate a response. How can I help you?';
  } catch (error: any) {
    console.error('[Chat Agent] OpenAI response generation error:', error);
    
    // Handle OpenAI geographic restriction or other errors
    if (error?.status === 403 && error?.code === 'unsupported_country_region_territory') {
      console.warn('[Chat Agent] OpenAI not available in this region, using fallback response generation');
      return generateFallbackResponse(userMessage, intent, context);
    }
    
    return 'I apologize, I encountered an error. Please try again or contact us via WhatsApp.';
  }
}

/**
 * Main chat agent function
 */
export async function processChatMessage(
  userMessage: string,
  sessionId: string
): Promise<ChatResponse> {
  const history = getConversationHistory(sessionId);
  
  // Check if this is the 6th user message (reset needed)
  const userMessages = history.filter(m => m.role === 'user');
  if (userMessages.length >= 5) {
    clearHistory(sessionId);
    return {
      message: 'Hi again 👋 How can I help you today?',
      shouldReset: true,
    };
  }

  // STEP 1: Intent Detection
  const intent = await detectIntent(userMessage);
  console.log('[Chat Agent] Intent detected:', intent);

  // Handle GREETING - short-circuit, no API calls
  if (intent.intent === 'GREETING') {
    const greetingResponse = 'Hi! 👋 I\'m your BridgeChina assistant. How can I help you today? I can assist with hotels, transport, halal food, medical help, tours, eSIM plans, shopping, and factory sourcing in China.';
    addToHistory(sessionId, 'user', userMessage);
    addToHistory(sessionId, 'assistant', greetingResponse);
    return { message: greetingResponse };
  }

  // STEP 2: Service Availability Guard
  const availabilityMessage = checkServiceAvailability(intent, userMessage);
  if (availabilityMessage) {
    addToHistory(sessionId, 'user', userMessage);
    addToHistory(sessionId, 'assistant', availabilityMessage);
    return { message: availabilityMessage };
  }

  // STEP 3: Routed Response Logic
  let response = '';
  let images: string[] = [];
  let context: any = {};

  switch (intent.intent) {
    case 'SHOPPING': {
      const subIntent = intent.subIntent || 'UNKNOWN';
      console.log('[Chat Agent] Shopping subIntent:', subIntent);

      // Handle UNKNOWN sub-intent - ask for clarification
      if (subIntent === 'UNKNOWN') {
        const clarificationMessage = 'Are you looking to buy products (retail) or find factories/suppliers for sourcing?';
        addToHistory(sessionId, 'user', userMessage);
        addToHistory(sessionId, 'assistant', clarificationMessage);
        return { message: clarificationMessage };
      }

      // Handle RETAIL flow
      if (subIntent === 'RETAIL') {
        try {
          // Extract shopping parameters
          const params = await extractShoppingParams(userMessage);
          console.log('[Chat Agent] Shopping params:', params);

          // Call existing TMAPI keyword search
          const searchResults = await searchByKeyword(params.keyword, {
            page: 1,
            pageSize: 20,
          });

          // Sort based on priority
          let sortedItems = [...searchResults.items];
          if (params.priority === 'lowest_price') {
            sortedItems.sort((a, b) => (a.priceMin || 0) - (b.priceMin || 0));
          } else if (params.priority === 'rating') {
            sortedItems.sort((a, b) => (b.priceMin || 0) - (a.priceMin || 0)); // Fallback to price
          }

          // Get top 3 items
          const topItems = sortedItems.slice(0, 3);
          
          // Translate titles to English and format items with inline images
          const items: ChatResponse['items'] = [];
          for (const item of topItems) {
            // Translate title to English if needed
            let englishTitle = item.title;
            if (/[\u4e00-\u9fff]/.test(item.title)) {
              try {
                const translateResponse = await openai.chat.completions.create({
                  model: OPENAI_DISTILL_MODEL,
                  messages: [
                    { role: 'system', content: 'Translate product titles to English. Return only the translation, no explanations.' },
                    { role: 'user', content: `Translate: ${item.title}` },
                  ],
                  temperature: 0.3,
                  max_tokens: 100,
                });
                englishTitle = translateResponse.choices[0]?.message?.content?.trim() || item.title;
              } catch (error) {
                console.error('[Chat Agent] Title translation error:', error);
                // Keep original if translation fails
              }
            }

            // Get quantity from raw data if available
            const quantity = (item as any).raw?.quantity_begin || (item as any).availableQuantity;

            items.push({
              title: englishTitle,
              imageUrl: item.imageUrl || item.images?.[0],
              price: item.priceMin || item.priceMax ? `¥${item.priceMin || item.priceMax}` : undefined,
              supplier: item.sellerName,
              bullets: [
                `Price: ¥${item.priceMin || item.priceMax || 'N/A'}`,
                `Supplier: ${item.sellerName || 'N/A'}`,
                quantity ? `Available quantity: ${quantity}` : undefined,
              ].filter(Boolean) as string[],
            });
          }

          // Build response with inline images
          const itemLines = items.map((item, idx) => {
            const imageMarkdown = item.imageUrl ? `\n![${item.title}](${item.imageUrl})` : '';
            return `${idx + 1}. **${item.title}**${imageMarkdown}\n   - Price: ${item.price || 'Price on request'}\n   - Supplier: ${item.supplier || 'N/A'}`;
          });

          response = itemLines.join('\n\n');
          response += '\n\nWould you like me to help you place an order or check delivery inside China?';
          
          // Store items in context for return
          context.items = items;
        } catch (error) {
          console.error('[Chat Agent] Retail search error:', error);
          response = 'I apologize, I encountered an error searching for products. Please try again or contact us via WhatsApp for assistance.';
        }
      }

      // Handle FACTORY flow
      if (subIntent === 'FACTORY') {
        try {
          // Extract keyword from user message
          const lowerMessage = userMessage.toLowerCase();
          const stopWords = ['i', 'want', 'to', 'find', 'need', 'looking', 'for', 'a', 'an', 'the', 'factory', 'manufacturer', 'supplier'];
          const words = userMessage.split(/\s+/).filter(w => !stopWords.includes(w.toLowerCase()) && w.length > 2);
          const keyword = words.slice(0, 5).join(' ') || userMessage.substring(0, 50);

          // Call TMAPI factory search
          const factoryResults = await tmapiClient.searchFactoriesByKeyword(keyword.trim(), {
            page: 1,
            pageSize: 3,
          });

          if (!factoryResults?.data?.items || factoryResults.data.items.length === 0) {
            response = 'I couldn\'t find any factories matching your search. Please try different keywords or contact us via WhatsApp for personalized sourcing assistance.';
          } else {
            const factories = factoryResults.data.items.slice(0, 3);
            const items: ChatResponse['items'] = [];

            for (const factory of factories) {
              // Enrich with Tavily search
              let tavilyInfo = '';
              try {
                const tavilyResult = await searchTavily(`"${factory.company_name}" factory china`, 2);
                tavilyInfo = tavilyResult || '';
              } catch (error) {
                console.error('[Chat Agent] Tavily enrichment error:', error);
              }

              // Extract info from Tavily
              let officialWebsite = '';
              let companyDescription = '';
              let companyType = 'Factory'; // Default
              
              if (tavilyInfo) {
                // Try to extract website
                const websiteMatch = tavilyInfo.match(/https?:\/\/[^\s]+/);
                if (websiteMatch) {
                  officialWebsite = websiteMatch[0];
                }
                // Extract description snippet
                companyDescription = tavilyInfo.substring(0, 200);
                // Classify type
                if (tavilyInfo.toLowerCase().includes('reseller') || tavilyInfo.toLowerCase().includes('trader')) {
                  companyType = 'Reseller';
                }
              }

              const bullets: string[] = [
                `Type: ${companyType}`,
                `Location: ${factory.location?.city || 'N/A'}`,
                factory.factory_level ? `Level: ${factory.factory_level}` : undefined,
                factory.factory_area_size ? `Size: ${factory.factory_area_size} sqm` : undefined,
                factory.shop_repurchase_rate ? `Repurchase Rate: ${(parseFloat(factory.shop_repurchase_rate) * 100).toFixed(0)}%` : undefined,
                factory.response_rate ? `Response Rate: ${(parseFloat(factory.response_rate) * 100).toFixed(0)}%` : undefined,
                factory.tp_member ? `Trade Assurance: ${factory.tp_year} years` : undefined,
                factory.super_factory ? 'Super Factory Verified' : undefined,
                officialWebsite ? `Website: ${officialWebsite}` : undefined,
                companyDescription ? `Info: ${companyDescription.substring(0, 100)}...` : undefined,
              ].filter(Boolean) as string[];

              items.push({
                title: factory.company_name || factory.login_id || 'Unknown Company',
                location: factory.location?.city || undefined,
                bullets,
              });
            }

            // Build response
            const factoryLines = items.map((item, idx) => {
              return `${idx + 1}. **${item.title}**\n${item.bullets?.map(b => `   - ${b}`).join('\n') || ''}`;
            });

            response = factoryLines.join('\n\n');
            response += '\n\n**Note:** We can help verify these suppliers and facilitate contact after verification.';
            response += '\n\nWould you like us to verify this supplier and help you contact them?';
            
            // Store items in context for return
            context.items = items;
          }
        } catch (error) {
          console.error('[Chat Agent] Factory search error:', error);
          response = 'I apologize, I encountered an error searching for factories. Please try again or contact us via WhatsApp for sourcing assistance.';
        }
      }

      break;
    }

    case 'MARKET_INFO': {
      // Use Tavily for market information
      const tavilyInfo = await searchTavily(`China wholesale markets ${intent.city || ''} Yiwu Guangzhou`);
      context.tavilyInfo = tavilyInfo;
      response = await generateResponse(userMessage, intent, context, history);
      break;
    }

    case 'GENERAL_CHINA': {
      // Use Tavily for general China info
      const tavilyInfo = await searchTavily(userMessage);
      context.tavilyInfo = tavilyInfo;
      response = await generateResponse(userMessage, intent, context, history);
      break;
    }

    case 'OUT_OF_SCOPE': {
      response = 'I specialize in helping with services in China through BridgeChina. I can assist with hotels, transport, halal food, medical help, tours, eSIM plans, and shopping. How can I help you with China-related services?';
      break;
    }

    case 'CITY_INFO': {
      // Do not use Tavily for CITY_INFO - use database or general knowledge only
      response = await generateResponse(userMessage, intent, context, history);
      break;
    }

    default: {
      // HOTEL, TRANSPORT, TOUR, MEDICAL, HALAL_FOOD, ESIM
      // Detect price priority from user message
      const userLower = userMessage.toLowerCase();
      let sortBy: 'price_asc' | 'price_desc' | 'rating' | 'default' = 'default';
      if (userLower.includes('cheapest') || userLower.includes('cheap') || userLower.includes('lowest') || userLower.includes('low cost') || userLower.includes('budget')) {
        sortBy = 'price_asc';
      } else if (userLower.includes('expensive') || userLower.includes('highest') || userLower.includes('luxury')) {
        sortBy = 'price_desc';
      } else if (userLower.includes('best') || userLower.includes('top rated') || userLower.includes('highest rated')) {
        sortBy = 'rating';
      }

      // Get service data from database
      const serviceData = await getServiceData(intent.intent, intent.city, sortBy);
      context.serviceData = serviceData;

      // Collect images (limit to 2) - each item gets its own image
      images = serviceData
        .slice(0, 2)
        .map((item: any) => item.coverAsset?.public_url || item.coverAsset?.thumbnail_url)
        .filter(Boolean);

      // Do not use Tavily for service intents (HOTEL, TRANSPORT, etc.) - use database data only
      response = await generateResponse(userMessage, intent, context, history);
      break;
    }
  }

  // Clean up response - but preserve markdown images for RETAIL/FACTORY flows
  // Only remove standalone image URLs, not markdown images like ![alt](url)
  let cleanedResponse = response
    .replace(/\[View image\]\([^)]+\)/gi, '') // Remove [View image](url) markdown
    // Remove standalone image URLs (not in markdown format ![alt](url))
    // Simple approach: only remove URLs that are not part of markdown image syntax
    .replace(/(?<!\!\[[^\]]*\]\()https?:\/\/[^\s\)]+\.(jpg|jpeg|png|gif|webp)(?!\))/gi, '')
    .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
    .trim();
  
  // If the regex fails (older Node.js), use a simpler approach
  // Just remove URLs that are clearly standalone (not in parentheses after ![])
  if (cleanedResponse === response) {
    // Fallback: remove URLs that don't appear to be in markdown image format
    cleanedResponse = response
      .replace(/\[View image\]\([^)]+\)/gi, '')
      .replace(/(?<![!\[][^\]]*\]\()https?:\/\/[^\s\)]+\.(jpg|jpeg|png|gif|webp)(?!\))/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // Enforce English output
  const englishResponse = await enforceEnglish(cleanedResponse);

  // Add to conversation history
  addToHistory(sessionId, 'user', userMessage);
  addToHistory(sessionId, 'assistant', englishResponse);

  // Extract items from context if available (for RETAIL/FACTORY)
  const items = context.items || undefined;

  return {
    message: englishResponse,
    images: images.length > 0 ? images.slice(0, 2) : undefined, // Limit to 2 images (fallback)
    items: items, // Inline items with images
  };
}

