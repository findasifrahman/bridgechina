/**
 * Cloudflare R2 S3-compatible client utilities
 * 
 * Note: For R2, you need S3-compatible credentials (ACCESS_KEY_ID and SECRET_ACCESS_KEY),
 * NOT Cloudflare API tokens. These are created in:
 * Cloudflare Dashboard > R2 > Manage R2 API Tokens > Create API Token (S3 API Token)
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
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
  if (publicBaseUrl) {
    return `${publicBaseUrl}/${key}`;
  }
  
  // Fallback to presigned URL if no public URL configured
  const accountId = process.env.R2_ACCOUNT_ID;
  const bucket = process.env.R2_BUCKET;
  return `https://pub-${accountId}.r2.dev/${bucket}/${key}`;
}

export async function deleteMultipleFromR2(keys: string[]): Promise<void> {
  const client = getS3Client();
  const bucket = process.env.R2_BUCKET;

  if (!bucket) {
    throw new Error('R2_BUCKET not configured');
  }

  // Delete objects in batches (S3 DeleteObjects supports up to 1000 objects)
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    const command = new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: batch.map(key => ({ Key: key })),
      },
    });
    
    await client.send(command);
  }
}

// Image processing functions (stubs - implement with sharp or similar if needed)
export function validateImageSize(size: number): void {
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (size > maxSize) {
    throw new Error(`Image size exceeds maximum of ${maxSize} bytes`);
  }
}

export async function getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
  // Stub implementation - use sharp or similar library for production
  // For now, return default dimensions
  return { width: 0, height: 0 };
}

export async function generateThumbnail(buffer: Buffer): Promise<Buffer> {
  // Stub implementation - use sharp or similar library for production
  // For now, return original buffer
  return buffer;
}

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
}

