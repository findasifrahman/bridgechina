/**
 * Cloudflare R2 S3-compatible client utilities
 * 
 * Note: For R2, you need S3-compatible credentials (ACCESS_KEY_ID and SECRET_ACCESS_KEY),
 * NOT Cloudflare API tokens. These are created in:
 * Cloudflare Dashboard > R2 > Manage R2 API Tokens > Create API Token (S3 API Token)
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3Client) {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error('R2 credentials not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY');
    }

    s3Client = new S3Client({
      region: 'auto', // R2 uses 'auto' as the region
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return s3Client;
}

export async function generatePresignedPutUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<{ uploadUrl: string; key: string }> {
  const client = getS3Client();
  const bucket = process.env.R2_BUCKET;

  if (!bucket) {
    throw new Error('R2_BUCKET not configured');
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn });

  return {
    uploadUrl,
    key,
  };
}

export async function generatePresignedGetUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = getS3Client();
  const bucket = process.env.R2_BUCKET;

  if (!bucket) {
    throw new Error('R2_BUCKET not configured');
  }

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return await getSignedUrl(client, command, { expiresIn });
}

export function getPublicUrl(key: string): string {
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;
  const accountId = process.env.R2_ACCOUNT_ID;
  
  // R2 public URL format: https://pub-{account-id}.r2.dev/{key}
  // NOTE: The bucket name is NOT included in the path for standard R2 public URLs
  // The key already contains the full path (e.g., "uploads/file.jpg")
  
  if (publicBaseUrl) {
    const base = publicBaseUrl.replace(/\/$/, '');
    return `${base}/${key}`;
  }
  
  // Fallback: https://pub-{account-id}.r2.dev/{key}
  if (accountId) {
    return `https://pub-${accountId}.r2.dev/${key}`;
  }
  
  throw new Error('R2_PUBLIC_BASE_URL or R2_ACCOUNT_ID must be configured');
}

/**
 * Delete an object from R2
 * @param key The R2 key (path) of the object to delete
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteFromR2(key: string): Promise<void> {
  const client = getS3Client();
  const bucket = process.env.R2_BUCKET;

  if (!bucket) {
    throw new Error('R2_BUCKET not configured');
  }

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await client.send(command);
  console.log(`[R2] Deleted object: ${key}`);
}

/**
 * Delete multiple objects from R2
 * @param keys Array of R2 keys to delete
 * @returns Promise that resolves when all deletions are complete
 */
export async function deleteMultipleFromR2(keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  const client = getS3Client();
  const bucket = process.env.R2_BUCKET;

  if (!bucket) {
    throw new Error('R2_BUCKET not configured');
  }

  // Delete in parallel (R2 supports concurrent deletions)
  await Promise.all(
    keys.map(async (key) => {
      try {
        const command = new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        });
        await client.send(command);
        console.log(`[R2] Deleted object: ${key}`);
      } catch (error: any) {
        // Log error but don't fail entire operation
        console.error(`[R2] Failed to delete ${key}:`, error.message);
      }
    })
  );
}

/**
 * Upload a buffer directly to R2 (server-side upload)
 * @param key The R2 key (path) where the object should be stored
 * @param buffer The file buffer to upload
 * @param contentType The MIME type of the file
 * @returns Promise that resolves when upload is complete
 */
export async function uploadToR2(key: string, buffer: Buffer, contentType: string): Promise<void> {
  const client = getS3Client();
  const bucket = process.env.R2_BUCKET;

  if (!bucket) {
    throw new Error('R2_BUCKET not configured');
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await client.send(command);
  console.log(`[R2] Uploaded object: ${key}`);
}

