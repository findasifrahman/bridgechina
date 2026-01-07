/**
 * TMAPI Client
 * Handles all TMAPI 1688 API calls
 */

import axios, { AxiosInstance } from 'axios';
import https from 'node:https';

// TMAPI 1688 API base URL
// Default: https://api.tmapi.com (can be overridden via TMAPI_BASE_URL env var)
// Common patterns: https://api.tmapi.com, https://api.tmapi.com/api/1688
// Ensure HTTPS for TMAPI base URL
const TMAPI_BASE_URL = (process.env.TMAPI_BASE_URL || 'https://api.tmapi.top').replace(/^http:/, 'https:');
const TMAPI_TOKEN = process.env.TMAPI_API_16688_TOKEN;

console.log('[TMAPI Client] Initialized:', {
  baseURL: TMAPI_BASE_URL,
  hasToken: !!TMAPI_TOKEN,
  tokenLength: TMAPI_TOKEN?.length || 0,
  tokenPrefix: TMAPI_TOKEN ? TMAPI_TOKEN.substring(0, 10) + '...' : 'MISSING',
});

if (!TMAPI_TOKEN) {
  console.warn('[TMAPI] ⚠️  WARNING: TMAPI_API_16688_TOKEN not set in environment');
}

interface TMAPIConfig {
  baseURL?: string;
  apiToken?: string;
}

class TMAPIClient {
  private client: AxiosInstance;
  private apiToken: string;

  constructor(config?: TMAPIConfig) {
    this.apiToken = config?.apiToken || TMAPI_TOKEN || '';
    this.client = axios.create({
      baseURL: config?.baseURL || TMAPI_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
      // Fix SSL certificate issue for api.tmapi.top
      httpsAgent: new https.Agent({
        rejectUnauthorized: false, // Allow self-signed or invalid certificates
      }),
    });
    
    console.log('[TMAPI Client] Axios client created:', {
      baseURL: this.client.defaults.baseURL,
      timeout: this.client.defaults.timeout,
    });
  }

  /**
   * TMAPI sort mapping.
   * Docs: default, sales, price_up, price_down
   * We also accept legacy/internal aliases (price_asc/price_desc).
   */
  private normalizeSort(sort?: string): string | undefined {
    if (!sort) return undefined;
    const s = String(sort);
    if (s === 'price_asc') return 'price_up';
    if (s === 'price_desc') return 'price_down';
    // Keep documented values as-is
    if (s === 'default' || s === 'sales' || s === 'price_up' || s === 'price_down') return s;
    // Fallback: keep as-is (TMAPI may ignore unknown values)
    return s;
  }

  /**
   * Convert image URL to Alibaba-affiliated URL for image search
   * Based on TMAPI docs: POST /1688/tools/image/convert_url
   * https://tmapi.top/docs/ali/tool-apis/image-url-convert
   * 
   * IMPORTANT: Non-Ali images MUST be converted first before using image search API
   * The converted URL is valid for 24 hours
   */
  async convertImageUrl(url: string): Promise<string> {
    try {
      console.log('[TMAPI Client] convertImageUrl request:', {
        baseURL: this.client.defaults.baseURL,
        endpoint: '/1688/tools/image/convert_url',
        originalUrl: url.substring(0, 100) + (url.length > 100 ? '...' : ''),
        hasToken: !!this.apiToken,
      });

      const response = await this.client.post(
        '/1688/tools/image/convert_url',
        { url },
        {
          params: {
            apiToken: this.apiToken,
          },
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('[TMAPI Client] convertImageUrl response:', {
        status: response.status,
        statusText: response.statusText,
        code: response.data?.code,
        msg: response.data?.msg,
        hasData: !!response.data?.data,
        dataKeys: response.data?.data ? Object.keys(response.data.data) : [],
        fullResponse: JSON.stringify(response.data).substring(0, 1000),
      });

      // According to TMAPI docs: response structure is { code: 200, msg: "success", data: { image_url: "..." } }
      // The client returns response.data, so we have { code, msg, data: { image_url } }
      if (response.data?.code !== 200) {
        const errorMsg = response.data?.msg || 'Unknown error';
        console.error('[TMAPI Client] convertImageUrl - API returned error code:', {
          code: response.data?.code,
          msg: errorMsg,
          fullResponse: response.data,
        });
        throw new Error(`Image URL conversion failed: ${errorMsg} (code: ${response.data?.code})`);
      }

      // Check for image_url in data.data
      if (response.data?.data?.image_url) {
        const imageUrl = response.data.data.image_url;
        console.log('[TMAPI Client] convertImageUrl - extracted image_url:', {
          imageUrl: imageUrl.substring(0, 100) + (imageUrl.length > 100 ? '...' : ''),
          isFullUrl: imageUrl.startsWith('http'),
          isPath: imageUrl.startsWith('/'),
        });
        
        // According to TMAPI docs, the converted URL should be used directly
        // If it's already a full URL, return as-is
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
          console.log('[TMAPI Client] convertImageUrl - returning full URL as-is');
          return imageUrl;
        }
        
        // If it's a path (starts with /), TMAPI might expect:
        // Option 1: The path as-is (relative path) - according to docs, use converted URL directly
        // Option 2: Full Alibaba CDN URL
        // Based on TMAPI docs: "The converted URL are valid for 24 hours" and should be used directly
        // Let's try the path as-is first, as that's what TMAPI returns from conversion
        if (imageUrl.startsWith('/')) {
          console.log('[TMAPI Client] convertImageUrl - returning path as-is (TMAPI format):', {
            path: imageUrl,
            note: 'TMAPI docs say to use converted URL directly',
          });
          // Return path as-is - TMAPI should handle it
          return imageUrl;
        }
        
        // If no leading slash, construct full URL
        const fullUrl = `https://cbu01.alicdn.com/${imageUrl}`;
        console.log('[TMAPI Client] convertImageUrl - constructed full URL (no leading slash):', {
          originalPath: imageUrl,
          fullUrl: fullUrl.substring(0, 100) + '...',
        });
        return fullUrl;
      }
      
      // Fallback to other possible response formats
      if (response.data?.data?.converted_url) {
        console.log('[TMAPI Client] convertImageUrl - using converted_url field');
        return response.data.data.converted_url;
      }
      if (response.data?.converted_url) {
        console.log('[TMAPI Client] convertImageUrl - using top-level converted_url field');
        return response.data.converted_url;
      }
      if (response.data?.url) {
        console.log('[TMAPI Client] convertImageUrl - using url field');
        return response.data.url;
      }
      
      console.error('[TMAPI Client] convertImageUrl - Invalid response structure:', {
        responseKeys: Object.keys(response.data || {}),
        dataKeys: response.data?.data ? Object.keys(response.data.data) : [],
        responseSample: JSON.stringify(response.data).substring(0, 1000),
      });
      throw new Error('Invalid response from image-url-convert: missing image_url or converted_url field');
    } catch (error: any) {
      console.error('[TMAPI Client] convertImageUrl error:', {
        message: error.message,
        name: error.name,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        requestUrl: error.config?.url,
        requestMethod: error.config?.method,
        stack: error.stack,
      });
      throw new Error(`Failed to convert image URL: ${error.message}`);
    }
  }

  /**
   * Search items by image URL
   * Based on TMAPI docs: GET /1688/search/image
   * https://tmapi.top/docs/ali/search/search-items-by-image-url
   */
  async searchByImage(
    imgUrl: string,
    opts?: {
      category?: string;
      page?: number;
      pageSize?: number;
      sort?: string;
    }
  ): Promise<any> {
    try {
      const params: any = {
        apiToken: this.apiToken,
        img_url: imgUrl,
      };

      if (opts?.page) params.page = opts.page;
      if (opts?.pageSize) params.page_size = opts.pageSize;
      params.sort = this.normalizeSort(opts?.sort || 'sales'); // Default to sales

      console.log('[TMAPI Client] searchByImage request:', {
        baseURL: this.client.defaults.baseURL,
        endpoint: '/1688/search/image',
        method: 'GET',
        imgUrl: imgUrl.substring(0, 100) + '...',
        params: { 
          ...params, 
          apiToken: params.apiToken ? '[REDACTED]' : 'MISSING',
          img_url: imgUrl.substring(0, 100) + '...',
        },
        fullUrl: `${this.client.defaults.baseURL}/1688/search/image?apiToken=${params.apiToken ? '[REDACTED]' : 'MISSING'}&img_url=${encodeURIComponent(imgUrl)}&page=${params.page || 1}&page_size=${params.page_size || 20}`,
      });

      const response = await this.client.get('/1688/search/image', { params });
      
      console.log('[TMAPI Client] searchByImage response:', {
        status: response.status,
        dataCode: response.data?.code,
        dataMsg: response.data?.msg,
        itemsCount: response.data?.data?.items?.length || 0,
        totalCount: response.data?.data?.total_count,
        responseKeys: Object.keys(response.data || {}),
        dataKeys: response.data?.data ? Object.keys(response.data.data) : [],
        fullResponse: JSON.stringify(response.data).substring(0, 2000),
        // Check if there's an error message
        errorMsg: response.data?.msg !== 'success' ? response.data?.msg : null,
      });

      return response.data;
    } catch (error: any) {
      console.error('[TMAPI Client] searchByImage error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw new Error(`Failed to search by image: ${error.message}`);
    }
  }

  /**
   * Search items by keyword
   * Based on TMAPI docs: GET /1688/search/items
   * https://tmapi.top/docs/ali/search/search-items-by-keyword
   */
  async searchByKeyword(
    keyword: string,
    opts?: {
      category?: string;
      page?: number;
      pageSize?: number;
      sort?: string;
    }
  ): Promise<any> {
    try {
      const params: any = {
        apiToken: this.apiToken,
        keyword,
      };

      if (opts?.page) params.page = opts.page;
      if (opts?.pageSize) params.page_size = opts.pageSize;
      params.sort = this.normalizeSort(opts?.sort || 'sales'); // Default to sales
      if (opts?.category) params.category = opts.category;

      console.log('[TMAPI Client] searchByKeyword request:', {
        baseURL: this.client.defaults.baseURL,
        endpoint: '/1688/search/items',
        method: 'GET',
        params: { ...params, apiToken: params.apiToken ? '[REDACTED]' : 'MISSING' },
        hasToken: !!this.apiToken,
      });

      const response = await this.client.get('/1688/search/items', { params });
      
      console.log('[TMAPI Client] searchByKeyword response:', {
        status: response.status,
        statusText: response.statusText,
        dataCode: response.data?.code,
        dataMsg: response.data?.msg,
        itemsCount: response.data?.data?.items?.length || 0,
        totalCount: response.data?.data?.total_count,
        responseKeys: Object.keys(response.data || {}),
        dataKeys: response.data?.data ? Object.keys(response.data.data) : [],
        fullResponse: JSON.stringify(response.data).substring(0, 2000),
        // Check if there's an error message
        errorMsg: response.data?.msg !== 'success' ? response.data?.msg : null,
      });

      return response.data;
    } catch (error: any) {
      console.error('[TMAPI Client] searchByKeyword error:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          params: error.config?.params,
        },
      });
      throw new Error(`Failed to search by keyword: ${error.message}`);
    }
  }

  /**
   * Search factories by keyword
   * Based on TMAPI docs: GET /1688/search/factories
   * https://tmapi.top/docs/ali/search/search-factories-by-keywords
   */
  async searchFactoriesByKeyword(
    keyword: string,
    opts?: {
      page?: number;
      pageSize?: number;
      sort?: string;
    }
  ): Promise<any> {
    try {
      const params: any = {
        apiToken: this.apiToken,
        keywords: keyword, // Note: API uses "keywords" (plural) not "keyword"
      };

      if (opts?.page) params.page = opts.page;
      if (opts?.pageSize) params.page_size = opts.pageSize;
      params.sort = this.normalizeSort(opts?.sort || 'sales'); // Default to sales

      console.log('[TMAPI Client] searchFactoriesByKeyword request:', {
        baseURL: this.client.defaults.baseURL,
        endpoint: '/1688/search/factories',
        method: 'GET',
        params: { ...params, apiToken: params.apiToken ? '[REDACTED]' : 'MISSING' },
        hasToken: !!this.apiToken,
      });

      const response = await this.client.get('/1688/search/factories', { params });
      
      console.log('[TMAPI Client] searchFactoriesByKeyword response:', {
        status: response.status,
        statusText: response.statusText,
        dataCode: response.data?.code,
        dataMsg: response.data?.msg,
        itemsCount: response.data?.data?.items?.length || 0,
        totalCount: response.data?.data?.total_count,
        responseKeys: Object.keys(response.data || {}),
        dataKeys: response.data?.data ? Object.keys(response.data.data) : [],
        fullResponse: JSON.stringify(response.data).substring(0, 2000),
        errorMsg: response.data?.msg !== 'success' ? response.data?.msg : null,
      });

      return response.data;
    } catch (error: any) {
      console.error('[TMAPI Client] searchFactoriesByKeyword error:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw new Error(`Failed to search factories: ${error.message}`);
    }
  }

  /**
   * Get item detail by ID
   * Based on TMAPI docs: GET /1688/item_detail
   * https://tmapi.top/docs/ali/item-detail/get-item-detail-by-id
   */
  async getItemDetail(itemId: string): Promise<any> {
    try {
      const params: any = {
        apiToken: this.apiToken,
        item_id: itemId,
      };

      console.log('[TMAPI Client] getItemDetail request:', {
        baseURL: this.client.defaults.baseURL,
        endpoint: '/1688/item_detail',
        method: 'GET',
        itemId,
      });

      const response = await this.client.get('/1688/item_detail', { params });
      
      console.log('[TMAPI Client] getItemDetail response:', {
        status: response.status,
        dataCode: response.data?.code,
        dataMsg: response.data?.msg,
        hasData: !!response.data?.data,
        dataKeys: response.data?.data ? Object.keys(response.data.data) : [],
        responseSample: JSON.stringify(response.data).substring(0, 1000),
      });

      return response.data;
    } catch (error: any) {
      console.error('[TMAPI Client] getItemDetail error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw new Error(`Failed to get item detail: ${error.message}`);
    }
  }

  /**
   * Get item description by ID
   * Based on TMAPI docs: GET /1688/item_desc
   * https://tmapi.top/docs/ali/item-detail/get-item-desc-by-id
   */
  async getItemDescription(itemId: string): Promise<any> {
    try {
      const params: any = {
        apiToken: this.apiToken,
        item_id: itemId,
      };

      console.log('[TMAPI Client] getItemDescription request:', {
        baseURL: this.client.defaults.baseURL,
        endpoint: '/1688/item_desc',
        itemId,
      });

      const response = await this.client.get('/1688/item_desc', { params });
      return response.data;
    } catch (error: any) {
      console.error('[TMAPI Client] getItemDescription error:', error.message);
      throw new Error(`Failed to get item description: ${error.message}`);
    }
  }

  /**
   * Get item ratings by ID
   * Based on TMAPI docs: GET /1688/item/rating
   * https://tmapi.top/docs/ali/item-detail/get-item-ratings-by-id
   */
  async getItemRatings(itemId: string, page: number = 1, sortType: string = 'default'): Promise<any> {
    try {
      const params: any = {
        apiToken: this.apiToken,
        item_id: itemId,
        page,
        sort_type: sortType,
      };

      console.log('[TMAPI Client] getItemRatings request:', {
        baseURL: this.client.defaults.baseURL,
        endpoint: '/1688/item/rating',
        itemId,
        page,
        sortType,
      });

      const response = await this.client.get('/1688/item/rating', { params });
      return response.data;
    } catch (error: any) {
      console.error('[TMAPI Client] getItemRatings error:', error.message);
      throw new Error(`Failed to get item ratings: ${error.message}`);
    }
  }

  /**
   * Get item shipping fee
   * Based on TMAPI docs: GET /1688/item/shipping
   * https://tmapi.top/docs/ali/item-detail/get-item-shipping-fee
   */
  async getItemShipping(itemId: string, opts?: { province?: string; totalQuantity?: number; totalWeight?: number }): Promise<any> {
    try {
      const params: any = {
        apiToken: this.apiToken,
        item_id: itemId,
      };

      // Always include province (required by TMAPI) - default to Guangdong if not provided
      params.province = opts?.province ?? process.env.TMAPI_DEFAULT_PROVINCE ?? '广东';
      if (opts?.totalQuantity) params.total_quantity = opts.totalQuantity;
      if (opts?.totalWeight) params.total_weight = opts.totalWeight;

      console.log('[TMAPI Client] getItemShipping request:', {
        baseURL: this.client.defaults.baseURL,
        endpoint: '/1688/item/shipping',
        itemId,
        opts,
      });

      const response = await this.client.get('/1688/item/shipping', { params });
      return response.data;
    } catch (error: any) {
      console.error('[TMAPI Client] getItemShipping error:', error.message);
      throw new Error(`Failed to get item shipping: ${error.message}`);
    }
  }

  /**
   * Get item sales statistics
   * Based on TMAPI docs: GET /1688/item/statistics/sales
   * https://tmapi.top/docs/ali/item-detail/get-sales-statistics-data
   */
  async getItemSalesStats(itemId: string, specId?: string): Promise<any> {
    try {
      const params: any = {
        apiToken: this.apiToken,
        item_id: itemId,
      };

      if (specId) params.spec_id = specId;

      console.log('[TMAPI Client] getItemSalesStats request:', {
        baseURL: this.client.defaults.baseURL,
        endpoint: '/1688/item/statistics/sales',
        itemId,
        specId,
      });

      const response = await this.client.get('/1688/item/statistics/sales', { params });
      return response.data;
    } catch (error: any) {
      console.error('[TMAPI Client] getItemSalesStats error:', error.message);
      throw new Error(`Failed to get item sales stats: ${error.message}`);
    }
  }

  /**
   * Get 1688 product details in multiple languages (By ID)
   * Based on TMAPI docs: GET /1688/global/item_detail
   * https://tmapi.top/docs/ali/multi-language-apis/get-item-detail-by-id
   */
  async getItemDetailMultilingual(itemId: string, language: string = 'en'): Promise<any> {
    try {
      const params: any = {
        apiToken: this.apiToken,
        item_id: itemId,
        language,
      };

      console.log('[TMAPI Client] getItemDetailMultilingual request:', {
        baseURL: this.client.defaults.baseURL,
        endpoint: '/1688/global/item_detail',
        itemId,
        language,
      });

      const response = await this.client.get('/1688/global/item_detail', { params });
      
      console.log('[TMAPI Client] getItemDetailMultilingual response:', {
        status: response.status,
        dataCode: response.data?.code,
        dataMsg: response.data?.msg,
        hasData: !!response.data?.data,
      });

      return response.data;
    } catch (error: any) {
      console.error('[TMAPI Client] getItemDetailMultilingual error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw new Error(`Failed to get item detail (multilingual): ${error.message}`);
    }
  }

  /**
   * Get 1688 product details in multiple languages (By URL)
   * Based on TMAPI docs: POST /1688/global/item_detail_by_url
   * https://tmapi.top/docs/ali/multi-language-apis/get-item-detail-by-url
   */
  async getItemDetailByUrlMultilingual(url: string, language: string = 'en'): Promise<any> {
    try {
      console.log('[TMAPI Client] getItemDetailByUrlMultilingual request:', {
        baseURL: this.client.defaults.baseURL,
        endpoint: '/1688/global/item_detail_by_url',
        url: url.substring(0, 100) + (url.length > 100 ? '...' : ''),
        language,
      });

      const response = await this.client.post(
        '/1688/global/item_detail_by_url',
        { url, language },
        {
          params: {
            apiToken: this.apiToken,
          },
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('[TMAPI Client] getItemDetailByUrlMultilingual response:', {
        status: response.status,
        dataCode: response.data?.code,
        dataMsg: response.data?.msg,
        hasData: !!response.data?.data,
      });

      return response.data;
    } catch (error: any) {
      console.error('[TMAPI Client] getItemDetailByUrlMultilingual error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw new Error(`Failed to get item detail by URL (multilingual): ${error.message}`);
    }
  }

  /**
   * Search for 1688 products by image (Multilingual version)
   * Based on TMAPI docs: GET /1688/global/search/image
   * https://tmapi.top/docs/ali/multi-language-apis/search-items-by-image-url
   */
  async searchByImageMultilingual(
    imgUrl: string,
    language: string = 'en',
    opts?: {
      category?: string;
      page?: number;
      pageSize?: number;
      sort?: string;
    }
  ): Promise<any> {
    try {
      const params: any = {
        apiToken: this.apiToken,
        img_url: imgUrl,
        language,
      };

      if (opts?.page) params.page = opts.page;
      if (opts?.pageSize) params.page_size = opts.pageSize;
      params.sort = this.normalizeSort(opts?.sort || 'sales'); // Default to sales

      console.log('[TMAPI Client] searchByImageMultilingual request:', {
        baseURL: this.client.defaults.baseURL,
        endpoint: '/1688/global/search/image',
        imgUrl: imgUrl.substring(0, 100) + '...',
        language,
        params: { ...params, apiToken: params.apiToken ? '[REDACTED]' : 'MISSING' },
      });

      const response = await this.client.get('/1688/global/search/image', { params });
      
      console.log('[TMAPI Client] searchByImageMultilingual response:', {
        status: response.status,
        dataCode: response.data?.code,
        dataMsg: response.data?.msg,
        itemsCount: response.data?.data?.items?.length || 0,
        totalCount: response.data?.data?.total_count,
      });

      return response.data;
    } catch (error: any) {
      console.error('[TMAPI Client] searchByImageMultilingual error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw new Error(`Failed to search by image (multilingual): ${error.message}`);
    }
  }

  /**
   * Search for 1688 products by keywords (Multilingual version)
   * Based on TMAPI docs: GET /1688/global/search/items
   * https://tmapi.top/docs/ali/multi-language-apis/search-items-by-keyword
   */
  async searchByKeywordMultilingual(
    keyword: string,
    language: string = 'en',
    opts?: {
      category?: string;
      page?: number;
      pageSize?: number;
      sort?: string;
    }
  ): Promise<any> {
    try {
      const params: any = {
        apiToken: this.apiToken,
        keyword,
        language,
      };

      if (opts?.page) params.page = opts.page;
      if (opts?.pageSize) params.page_size = opts.pageSize;
      params.sort = this.normalizeSort(opts?.sort || 'sales'); // Default to sales
      if (opts?.category) params.category = opts.category;

      console.log('[TMAPI Client] searchByKeywordMultilingual request:', {
        baseURL: this.client.defaults.baseURL,
        endpoint: '/1688/global/search/items',
        keyword,
        language,
        params: { ...params, apiToken: params.apiToken ? '[REDACTED]' : 'MISSING' },
      });

      const response = await this.client.get('/1688/global/search/items', { params });
      
      console.log('[TMAPI Client] searchByKeywordMultilingual response:', {
        status: response.status,
        dataCode: response.data?.code,
        dataMsg: response.data?.msg,
        itemsCount: response.data?.data?.items?.length || 0,
        totalCount: response.data?.data?.total_count,
      });

      return response.data;
    } catch (error: any) {
      console.error('[TMAPI Client] searchByKeywordMultilingual error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw new Error(`Failed to search by keyword (multilingual): ${error.message}`);
    }
  }
}

// Export singleton instance
export const tmapiClient = new TMAPIClient();
export default tmapiClient;

