import axios, { AxiosInstance } from 'axios';

function normalizeBaseUrl(raw: string | undefined): string {
  const value = String(raw || '').trim();
  if (!value) return 'https://otapi-1688.p.rapidapi.com';
  if (/^https?:\/\//i.test(value)) return value.replace(/\/+$/, '');
  return `https://${value.replace(/^\/+/, '').replace(/\/+$/, '')}`;
}

const OTAPI_BASE_URL = normalizeBaseUrl(process.env.OTAPI_BASE_URL || process.env.OTAPI_RAPID_BASE_URL || 'otapi-1688.p.rapidapi.com');
const OTAPI_RAPID_HOST = process.env.OTAPI_RAPID_HOST || new URL(OTAPI_BASE_URL).host;
const OTAPI_RAPID_TOKEN = process.env.OTAPI_RAPID_TOKEN || process.env.RAPIDAPI_KEY || process.env.OTAPI_API_KEY;
const OTAPI_TIMEOUT_MS = Number(process.env.OTAPI_TIMEOUT_MS || 60000);

const DEBUG_OTAPI = process.env.DEBUG_OTAPI === '1' || process.env.DEBUG_OTAPI === 'true';

function safeJson(value: any): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function summarizeOtapiDebugItem(item: any) {
  if (!item || typeof item !== 'object') {
    return { missing: true, type: typeof item };
  }

  return {
    id: item?.Id ?? item?.ItemId ?? item?.ItemID,
    title: item?.Title ?? item?.ItemTitle ?? item?.Name,
    price: item?.Price ?? null,
    features: item?.Features ?? null,
    featuredValues: item?.FeaturedValues ?? null,
    physicalParameters: item?.PhysicalParameters ?? null,
    masterQuantity: item?.MasterQuantity ?? item?.masterQuantity ?? item?.MasterQty ?? null,
    vendorScore: item?.VendorScore ?? item?.Vendor?.Score ?? item?.Vendor?.VendorScore ?? null,
  };
}

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
      timeout: OTAPI_TIMEOUT_MS,
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
          const itemsContainer = res.data?.Result?.Items;
          const items = itemsContainer?.Items?.Content || itemsContainer?.Items || itemsContainer?.Item || [];
          const sampleItems = Array.isArray(items) ? items.slice(0, 3) : [];
          console.log('[OTAPI Client] Response:', {
            method: res.config.method,
            url: res.config.url,
            status: res.status,
            hasData: res.data !== undefined,
            topLevelKeys: res.data && typeof res.data === 'object' ? Object.keys(res.data).slice(0, 25) : undefined,
          });
          console.log(
            '[OTAPI Client] OTAPI items summary:',
            safeJson({
              totalCount: itemsContainer?.Items?.TotalCount ?? itemsContainer?.TotalCount ?? res.data?.TotalCount,
              sample: sampleItems.map(summarizeOtapiDebugItem),
            })
          );
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
    languageOfQuery?: string;
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
      LanguageOfQuery: params.languageOfQuery || params.language || 'en',
      framePosition: params.framePosition ?? 0,
      frameSize: params.frameSize ?? 50,
      Provider: 'Alibaba1688',
      SearchMethod: 'Default',
    };

    if (params.CategoryId) qp.CategoryId = params.CategoryId;
    if (params.ItemTitle) qp.ItemTitle = params.ItemTitle;
    if (params.OrderBy) qp.OrderBy = params.OrderBy;
    if (params.MinPrice !== undefined) qp.MinPrice = params.MinPrice;
    if (params.MaxPrice !== undefined) qp.MaxPrice = params.MaxPrice;
    if (params.MinVolume !== undefined) qp.MinVolume = params.MinVolume;
    if (params.ImageUrl) qp.ImageUrl = params.ImageUrl;
    if (params.VendorId) qp.VendorId = params.VendorId;

    const xmlParts: string[] = ['<SearchItemsParameters>'];
    xmlParts.push('<Provider>Alibaba1688</Provider>');
    xmlParts.push('<SearchMethod>Default</SearchMethod>');
    xmlParts.push(`<LanguageOfQuery>${escapeXml(qp.LanguageOfQuery)}</LanguageOfQuery>`);
    xmlParts.push('<EnableDirectSearch xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:nil="true" />');
    if (params.CategoryId) xmlParts.push(`<CategoryId>${escapeXml(params.CategoryId)}</CategoryId>`);
    if (params.ItemTitle) xmlParts.push(`<ItemTitle>${escapeXml(params.ItemTitle)}</ItemTitle>`);
    if (params.OrderBy) xmlParts.push(`<OrderBy>${escapeXml(params.OrderBy)}</OrderBy>`);
    if (params.MinPrice !== undefined) xmlParts.push(`<MinPrice>${escapeXml(String(params.MinPrice))}</MinPrice>`);
    if (params.MaxPrice !== undefined) xmlParts.push(`<MaxPrice>${escapeXml(String(params.MaxPrice))}</MaxPrice>`);
    if (params.MinVolume !== undefined) xmlParts.push(`<MinVolume>${escapeXml(String(params.MinVolume))}</MinVolume>`);
    if (params.ImageUrl) xmlParts.push(`<ImageUrl>${escapeXml(params.ImageUrl)}</ImageUrl>`);
    if (params.VendorId) xmlParts.push(`<VendorId>${escapeXml(params.VendorId)}</VendorId>`);
    xmlParts.push('</SearchItemsParameters>');

    qp.xmlParameters = xmlParts.join('');

    if (DEBUG_OTAPI) {
      console.log('[OTAPI Client] Request: BatchSearchItemsFrame', {
        language: qp.language,
        framePosition: qp.framePosition,
        frameSize: qp.frameSize,
        xmlParameters: qp.xmlParameters,
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

  async getItemFullInfo(params: { itemId: string; language?: string; blockList?: string[] }): Promise<any> {
    const qp: any = {
      itemId: params.itemId,
      language: params.language || 'en',
      sessionId: 'godMode',
    };

    if (params.blockList && params.blockList.length > 0) {
      qp.blockList = params.blockList.join(',');
    }
    qp.itemParameters = '';

    const response = await this.client.get('/GetItemFullInfo', { params: qp });
    return response.data;
  }

  async batchGetItemFullInfo(params: { itemId: string; language?: string; blockList?: string[] }): Promise<any> {
    return this.getItemFullInfo(params);
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

function escapeXml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
