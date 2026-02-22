import axios, { AxiosInstance } from 'axios';

const OTAPI_RAPID_HOST = 'otapi-1688.p.rapidapi.com';
const OTAPI_BASE_URL = `https://${OTAPI_RAPID_HOST}`;
const OTAPI_RAPID_TOKEN = process.env.OTAPI_RAPID_TOKEN;

const DEBUG_OTAPI = process.env.DEBUG_OTAPI === '1' || process.env.DEBUG_OTAPI === 'true';

console.log('[OTAPI Client] Initialized:', {
  baseURL: OTAPI_BASE_URL,
  hasToken: !!OTAPI_RAPID_TOKEN,
  tokenLength: OTAPI_RAPID_TOKEN?.length || 0,
  tokenPrefix: OTAPI_RAPID_TOKEN ? `${OTAPI_RAPID_TOKEN.substring(0, 6)}...` : 'MISSING',
});

if (!OTAPI_RAPID_TOKEN) {
  console.warn('[OTAPI] ⚠️  WARNING: OTAPI_RAPID_TOKEN not set in environment');
}

interface OTAPIConfig {
  baseURL?: string;
  rapidToken?: string;
}

class OTAPIClient {
  private client: AxiosInstance;

  constructor(config?: OTAPIConfig) {
    const rapidToken = config?.rapidToken || OTAPI_RAPID_TOKEN || '';

    this.client = axios.create({
      baseURL: config?.baseURL || OTAPI_BASE_URL,
      timeout: 30000,
      headers: {
        'x-rapidapi-host': OTAPI_RAPID_HOST,
        'x-rapidapi-key': rapidToken,
      },
    });

    console.log('[OTAPI Client] Axios client created:', {
      baseURL: this.client.defaults.baseURL,
      timeout: this.client.defaults.timeout,
      hasToken: !!rapidToken,
    });

    this.client.interceptors.response.use(
      (res) => {
        if (DEBUG_OTAPI) {
          console.log('[OTAPI Client] Response:', {
            method: res.config.method,
            url: res.config.url,
            status: res.status,
            hasData: res.data !== undefined,
            topLevelKeys: res.data && typeof res.data === 'object' ? Object.keys(res.data).slice(0, 25) : undefined,
          });
        }
        return res;
      },
      (err) => {
        if (DEBUG_OTAPI) {
          console.error('[OTAPI Client] Error response:', {
            message: err?.message,
            method: err?.config?.method,
            url: err?.config?.url,
            params: err?.config?.params,
            status: err?.response?.status,
            data: err?.response?.data,
          });
        }
        throw err;
      }
    );
  }

  async searchItemsFrame(params: {
    language?: string;
    framePosition?: number;
    frameSize?: number;
    CategoryId?: string;
    ItemTitle?: string;
    OrderBy?: string;
    MinPrice?: string | number;
    MaxPrice?: string | number;
    MinVolume?: string | number;
    ImageUrl?: string;
    VendorId?: string;
  }): Promise<any> {
    const qp: any = {
      language: params.language || 'en',
      framePosition: params.framePosition ?? 0,
      frameSize: params.frameSize ?? 50,
    };

    if (params.CategoryId) qp.CategoryId = params.CategoryId;
    if (params.ItemTitle) qp.ItemTitle = params.ItemTitle;
    if (params.OrderBy) qp.OrderBy = params.OrderBy;
    if (params.MinPrice !== undefined) qp.MinPrice = String(params.MinPrice);
    if (params.MaxPrice !== undefined) qp.MaxPrice = String(params.MaxPrice);
    if (params.MinVolume !== undefined) qp.MinVolume = String(params.MinVolume);
    if (params.ImageUrl) qp.ImageUrl = params.ImageUrl;
    if (params.VendorId) qp.VendorId = params.VendorId;

    if (DEBUG_OTAPI) {
      console.log('[OTAPI Client] Request: BatchSearchItemsFrame', {
        language: qp.language,
        framePosition: qp.framePosition,
        frameSize: qp.frameSize,
        hasItemTitle: !!qp.ItemTitle,
        hasImageUrl: !!qp.ImageUrl,
        imageUrlPrefix: qp.ImageUrl ? String(qp.ImageUrl).substring(0, 120) : undefined,
        orderBy: qp.OrderBy,
        categoryId: qp.CategoryId,
      });
    }

    try {
      const response = await this.client.get('/BatchSearchItemsFrame', { params: qp });
      return response.data;
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      if (status === 401 || status === 403) {
        const details = data ? JSON.stringify(data).slice(0, 500) : undefined;
        throw new Error(
          `OTAPI RapidAPI auth/plan error (${status}). Check OTAPI_RAPID_TOKEN is set correctly on the server and that the RapidAPI subscription/quota for otapi-1688 is active.` +
            (details ? ` Response: ${details}` : '')
        );
      }
      throw err;
    }
  }

  async batchGetItemFullInfo(params: { itemId: string; language?: string }): Promise<any> {
    const qp: any = {
      itemId: params.itemId,
      language: params.language || 'en',
    };

    const response = await this.client.get('/BatchGetItemFullInfo', { params: qp });
    return response.data;
  }

  async getItemDescription(params: { itemId: string; language?: string }): Promise<any> {
    const qp: any = {
      itemId: params.itemId,
      language: params.language || 'en',
    };

    const response = await this.client.get('/GetItemDescription', { params: qp });
    return response.data;
  }

  async getVendorInfo(params: { vendorId: string; language?: string }): Promise<any> {
    const qp: any = {
      vendorId: params.vendorId,
      language: params.language || 'en',
    };

    const response = await this.client.get('/GetVendorInfo', { params: qp });
    return response.data;
  }

  async searchItemReviews(params: {
    itemId: string;
    language?: string;
    framePosition?: number;
    frameSize?: number;
  }): Promise<any> {
    const qp: any = {
      itemId: params.itemId,
      language: params.language || 'en',
      framePosition: params.framePosition ?? 0,
      frameSize: params.frameSize ?? 50,
    };

    const response = await this.client.get('/SearchItemReviews', { params: qp });
    return response.data;
  }

  async getBriefCatalog(): Promise<any> {
    const response = await this.client.get('/GetBriefCatalog');
    return response.data;
  }
}

export const otapiClient = new OTAPIClient();
export default otapiClient;
