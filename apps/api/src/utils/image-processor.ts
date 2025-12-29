/**
 * Image processing utilities using Sharp
 * Handles thumbnail generation and image optimization
 */

import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const MAX_FILE_SIZE = 1024 * 1024; // 1MB in bytes
const THUMBNAIL_WIDTH = 300;
const THUMBNAIL_HEIGHT = 300;
const THUMBNAIL_QUALITY = 80;

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error('R2 credentials not configured');
    }

    console.log('[R2] Initializing S3 client with endpoint:', endpoint);
    console.log('[R2] Account ID:', accountId);
    console.log('[R2] Access Key ID:', accessKeyId ? `${accessKeyId.substring(0, 4)}...` : 'NOT SET');

    s3Client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      // Add timeout configuration
      maxAttempts: 3,
    });
  }

  return s3Client;
}

export function validateImageSize(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`Image size exceeds maximum of ${MAX_FILE_SIZE / 1024}KB (1MB). Current size: ${(size / 1024).toFixed(2)}KB`);
  }
}

export async function generateThumbnail(
  imageBuffer: Buffer,
  width: number = THUMBNAIL_WIDTH,
  height: number = THUMBNAIL_HEIGHT
): Promise<Buffer> {
  return await sharp(imageBuffer)
    .resize(width, height, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: THUMBNAIL_QUALITY })
    .toBuffer();
}

export async function getImageDimensions(imageBuffer: Buffer): Promise<{ width: number; height: number }> {
  const metadata = await sharp(imageBuffer).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
  };
}

export async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  const client = getS3Client();
  const bucket = process.env.R2_BUCKET;

  if (!bucket) {
    throw new Error('R2_BUCKET not configured');
  }

  console.log(`[R2] Uploading to bucket: ${bucket}, key: ${key}, size: ${buffer.length} bytes, type: ${contentType}`);
  console.log(`[R2] Endpoint: ${process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`}`);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  // Add timeout wrapper
  const uploadPromise = client.send(command);
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('R2 upload timeout after 30 seconds')), 30000);
  });

  try {
    await Promise.race([uploadPromise, timeoutPromise]);
    console.log(`[R2] Successfully uploaded: ${key}`);
  } catch (error: any) {
    console.error(`[R2] Upload failed for ${key}:`, error);
    console.error(`[R2] Error details:`, {
      message: error.message,
      code: error.Code,
      requestId: error.$metadata?.requestId,
      httpStatusCode: error.$metadata?.httpStatusCode,
    });
    throw new Error(`R2 upload failed: ${error.message || 'Unknown error'}. Check your R2 credentials and network connection.`);
  }
}

export function getPublicUrl(key: string): string {
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;
  const accountId = process.env.R2_ACCOUNT_ID;
  
  // R2 public URL format: https://pub-{account-id}.r2.dev/{key}
  // NOTE: The bucket name is NOT included in the path for standard R2 public URLs
  // The key already contains the full path (e.g., "uploads/file.jpg" or "thumbnails/file.jpg")
  
  // If R2_PUBLIC_BASE_URL is set, use it
  if (publicBaseUrl) {
    // Remove trailing slash
    const base = publicBaseUrl.replace(/\/$/, '');
    
    // For standard R2 public URLs (pub-*.r2.dev), just append the key
    // For custom domains, the key might already include the bucket name
    const url = `${base}/${key}`;
    console.log(`[R2] Generated public URL: ${url} (base: ${base}, key: ${key})`);
    return url;
  }
  
  // Default R2 public URL format: https://pub-{account-id}.r2.dev/{key}
  if (accountId) {
    const url = `https://pub-${accountId}.r2.dev/${key}`;
    console.log(`[R2] Generated public URL (default): ${url}`);
    return url;
  }
  
  throw new Error('R2_PUBLIC_BASE_URL or R2_ACCOUNT_ID must be configured');
}

