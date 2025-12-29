/**
 * TMAPI Client
 * Handles all TMAPI 1688 API calls
 */

import axios, { AxiosInstance } from 'axios';
import https from 'node:https';

// TMAPI 1688 API base URL
// Default: https://api.tmapi.com (can be overridden via TMAPI_BASE_URL env var)
// Common patterns: https://api.tmapi.com, https://api.tmapi.com/api/1688
const TMAPI_BASE_URL = process.env.TMAPI_BASE_URL || 'https://api.tmapi.top';
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
   * Convert R2 image URL to Alibaba-affiliated URL for image search
   * Based on TMAPI docs: POST /1688/tools/image/convert_url
   * https://tmapi.top/docs/ali/tool-apis/image-url-convert
   */
  async convertImageUrl(url: string): Promise<string> {
    try {
      console.log('[TMAPI Client] convertImageUrl request:', {
        baseURL: this.client.defaults.baseURL,
        endpoint: '/1688/tools/image/convert_url',
        url,
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
        data: response.data,
      });

      if (response.data?.data?.image_url) {
        // TMAPI returns relative path, need to construct full URL
        const imageUrl = response.data.data.image_url;
        if (imageUrl.startsWith('http')) {
          return imageUrl;
        }
        return `https://cbu01.alicdn.com${imageUrl}`;
      }
      if (response.data?.data?.converted_url) {
        return response.data.data.converted_url;
      }
      if (response.data?.converted_url) {
        return response.data.converted_url;
      }
      if (response.data?.url) {
        return response.data.url;
      }
      throw new Error('Invalid response from image-url-convert');
    } catch (error: any) {
      console.error('[TMAPI Client] convertImageUrl error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
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
      if (opts?.sort) params.sort = opts.sort || 'default';

      console.log('[TMAPI Client] searchByImage request:', {
        baseURL: this.client.defaults.baseURL,
        endpoint: '/1688/search/image',
        method: 'GET',
        params: { ...params, apiToken: params.apiToken ? '[REDACTED]' : 'MISSING' },
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
      if (opts?.sort) params.sort = opts.sort || 'default';
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

      if (opts?.province) params.province = opts.province;
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
}

// Export singleton instance
export const tmapiClient = new TMAPIClient();
export default tmapiClient;

