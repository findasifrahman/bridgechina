/**
 * Data Ingestion Script for CityPlaces
 * 
 * Usage: pnpm ingest:cityplaces [input-file.json]
 * 
 * Input file format:
 * [
 *   {
 *     "name": "Place Name",
 *     "city": "guangzhou", // city slug
 *     "description": "Full description",
 *     "short_description": "Short description",
 *     "address": "Full address",
 *     "lat": 23.1291,
 *     "lng": 113.2644,
 *     "cost_range": "¥¥",
 *     "opening_hours": {"mon": "09:00-18:00", "tue": "09:00-18:00"},
 *     "customer_support_phone": "+86-20-12345678",
 *     "is_family_friendly": true,
 *     "is_pet_friendly": false,
 *     "tags": ["temple", "historical"],
 *     "image_urls": [
 *       "https://example.com/image1.jpg",
 *       "https://example.com/image2.jpg"
 *     ]
 *   }
 * ]
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const prisma = new PrismaClient();

// Get or create system user for uploads
async function getSystemUserId(): Promise<string> {
  // Try to find an admin user first
  const adminUser = await prisma.user.findFirst({
    where: {
      roles: {
        some: {
          role: {
            name: 'ADMIN',
          },
        },
      },
    },
  });

  if (adminUser) {
    return adminUser.id;
  }

  // Fallback: find any user
  const anyUser = await prisma.user.findFirst();
  if (anyUser) {
    return anyUser.id;
  }

  throw new Error('No users found in database. Please seed the database first.');
}

// R2 Configuration
function getS3Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 credentials not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
  }

  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

function getPublicUrl(key: string): string {
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;
  const accountId = process.env.R2_ACCOUNT_ID;
  
  if (publicBaseUrl) {
    const base = publicBaseUrl.replace(/\/$/, '');
    return `${base}/${key}`;
  }
  
  if (accountId) {
    return `https://pub-${accountId}.r2.dev/${key}`;
  }
  
  throw new Error('R2_PUBLIC_BASE_URL or R2_ACCOUNT_ID must be configured');
}

async function downloadImage(url: string): Promise<Buffer> {
  console.log(`  Downloading: ${url}`);
  
  // Convert Wikimedia thumbnail URL to direct image URL
  // Thumbnail URLs: https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/File.jpg/800px-File.jpg
  // Direct URLs: https://upload.wikimedia.org/wikipedia/commons/8/8a/File.jpg
  let directUrl = url;
  if (url.includes('/thumb/')) {
    // Extract the file path from thumbnail URL
    const match = url.match(/\/commons\/thumb\/(.+)\/\d+px-/);
    if (match) {
      directUrl = `https://upload.wikimedia.org/wikipedia/commons/${match[1]}`;
      console.log(`  Using direct URL: ${directUrl}`);
    }
  }
  
  const response = await fetch(directUrl, {
    headers: {
      'User-Agent': 'BridgeChina-Ingestion-Script/1.0 (https://bridgechina.com; contact@bridgechina.com)',
      'Accept': 'image/*',
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Failed to download image: ${response.status} ${errorText.substring(0, 200)}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function uploadToR2(key: string, buffer: Buffer, contentType: string): Promise<void> {
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
  console.log(`  Uploaded: ${key}`);
}

async function processImage(
  imageUrl: string,
  index: number,
  placeName: string
): Promise<{ assetId: string; isCover: boolean }> {
  try {
    // Download image
    const imageBuffer = await downloadImage(imageUrl);
    
    // Validate it's an image
    const metadata = await sharp(imageBuffer).metadata();
    if (!metadata.format) {
      throw new Error('Not a valid image');
    }

    // Generate thumbnail
    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Generate keys
    const timestamp = Date.now();
    const sanitizedName = placeName.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50);
    const ext = metadata.format === 'jpeg' ? 'jpg' : metadata.format;
    const originalKey = `uploads/${timestamp}-${sanitizedName}-${index}.${ext}`;
    const thumbnailKey = `thumbnails/${timestamp}-${sanitizedName}-${index}.${ext}`;

    // Upload both
    await Promise.all([
      uploadToR2(originalKey, imageBuffer, `image/${metadata.format}`),
      uploadToR2(thumbnailKey, thumbnailBuffer, 'image/jpeg'),
    ]);

    // Get public URLs
    const publicUrl = getPublicUrl(originalKey);
    const thumbnailUrl = getPublicUrl(thumbnailKey);

    // Get system user ID
    const systemUserId = await getSystemUserId();

    // Create media asset
    const asset = await prisma.mediaAsset.create({
      data: {
        r2_key: originalKey,
        public_url: publicUrl,
        thumbnail_key: thumbnailKey,
        thumbnail_url: thumbnailUrl,
        mime_type: `image/${metadata.format}`,
        size: imageBuffer.length,
        width: metadata.width || null,
        height: metadata.height || null,
        tags: [],
        category: 'cityplace',
        uploaded_by: systemUserId,
      },
    });

    return {
      assetId: asset.id,
      isCover: index === 0,
    };
  } catch (error: any) {
    console.error(`  Error processing image ${imageUrl}:`, error.message);
    throw error;
  }
}

interface CityPlaceInput {
  name: string;
  city: string; // city slug
  description?: string;
  short_description?: string;
  address: string;
  lat?: number;
  lng?: number;
  cost_range?: string;
  opening_hours?: Record<string, string>;
  customer_support_phone?: string;
  is_family_friendly?: boolean;
  is_pet_friendly?: boolean;
  tags?: string[];
  image_urls?: string[];
}

/**
 * Attempt to find free images from Wikimedia Commons
 * This is a fallback when image_urls are not provided
 */
async function findFreeImages(placeName: string, cityName: string): Promise<string[]> {
  // For now, return empty array - in future could integrate with:
  // - Wikimedia Commons API
  // - Unsplash API
  // - Pexels API
  // For now, user should provide image_urls in JSON
  console.log(`  ℹ️  No image_urls provided. Consider adding image URLs to your JSON file.`);
  return [];
}

async function ingestCityPlace(input: CityPlaceInput): Promise<void> {
  console.log(`\nProcessing: ${input.name}`);

  // Find city
  const city = await prisma.city.findUnique({
    where: { slug: input.city },
  });

  if (!city) {
    throw new Error(`City not found: ${input.city}`);
  }

  // Generate slug from name
  const slug = input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  // Check if place already exists
  const existing = await prisma.cityPlace.findUnique({
    where: { slug },
  });

  // Process images (always process, even if place exists)
  // If no image_urls provided, try to find free images (future enhancement)
  let imageUrls = input.image_urls || [];
  if (imageUrls.length === 0) {
    console.log(`  ⚠️  No image_urls provided, attempting to find free images...`);
    const foundImages = await findFreeImages(input.name, city.name);
    if (foundImages.length > 0) {
      imageUrls = foundImages;
      console.log(`  ✅ Found ${foundImages.length} free image(s)`);
    }
  }
  
  const assetIds: string[] = [];
  let coverAssetId: string | null = null;

  if (imageUrls.length > 0) {
    console.log(`  Processing ${imageUrls.length} image(s)...`);
    for (let i = 0; i < imageUrls.length; i++) {
      try {
        const { assetId, isCover } = await processImage(imageUrls[i], i, input.name);
        assetIds.push(assetId);
        if (isCover) {
          coverAssetId = assetId;
        }
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: any) {
        console.error(`  ⚠️  Failed to process image ${i + 1} (${imageUrls[i]}): ${error.message}`);
      }
    }
    if (assetIds.length > 0) {
      console.log(`  ✅ Successfully processed ${assetIds.length}/${imageUrls.length} image(s)`);
    } else {
      console.log(`  ⚠️  No images were successfully processed`);
    }
  } else {
    console.log(`  ⚠️  No image_urls provided in input data`);
  }

  if (existing) {
    console.log(`  Place already exists with slug: ${slug}, updating...`);
    
    // Merge existing gallery assets with new ones (avoid duplicates)
    const existingGalleryIds = (existing.gallery_asset_ids as string[]) || [];
    const newGalleryIds = assetIds.length > 1 ? assetIds.slice(1) : [];
    const mergedGalleryIds = [...new Set([...existingGalleryIds, ...newGalleryIds])];
    
    // Update existing place
    const place = await prisma.cityPlace.update({
      where: { slug },
      data: {
        // Update fields if provided
        short_description: input.short_description !== undefined ? input.short_description : existing.short_description,
        description: input.description !== undefined ? input.description : existing.description,
        address: input.address || existing.address,
        geo_lat: input.lat !== undefined ? input.lat : existing.geo_lat,
        geo_lng: input.lng !== undefined ? input.lng : existing.geo_lng,
        cost_range: input.cost_range !== undefined ? input.cost_range : existing.cost_range,
        opening_hours: input.opening_hours !== undefined ? input.opening_hours : existing.opening_hours,
        customer_support_phone: input.customer_support_phone !== undefined ? input.customer_support_phone : existing.customer_support_phone,
        is_family_friendly: input.is_family_friendly !== undefined ? input.is_family_friendly : existing.is_family_friendly,
        is_pet_friendly: input.is_pet_friendly !== undefined ? input.is_pet_friendly : existing.is_pet_friendly,
        // Update images: use new cover if provided, otherwise keep existing
        cover_asset_id: coverAssetId || existing.cover_asset_id,
        // Merge gallery assets
        gallery_asset_ids: mergedGalleryIds.length > 0 ? mergedGalleryIds : null,
      },
    });

    console.log(`  ✅ Updated: ${place.name} (${place.id})`);
    if (assetIds.length > 0) {
      console.log(`  📸 Added ${assetIds.length} new image(s)`);
    }
    return;
  }

  // Create new city place
  const place = await prisma.cityPlace.create({
    data: {
      city_id: city.id,
      name: input.name,
      slug,
      short_description: input.short_description || null,
      description: input.description || null,
      address: input.address,
      geo_lat: input.lat || null,
      geo_lng: input.lng || null,
      cost_range: input.cost_range || null,
      opening_hours: input.opening_hours || null,
      customer_support_phone: input.customer_support_phone || null,
      is_family_friendly: input.is_family_friendly || false,
      is_pet_friendly: input.is_pet_friendly || false,
      is_active: true,
      cover_asset_id: coverAssetId,
      gallery_asset_ids: assetIds.length > 1 ? assetIds.slice(1) : null,
    },
  });

  console.log(`  ✅ Created: ${place.name} (${place.id})`);
  if (assetIds.length > 0) {
    console.log(`  📸 Attached ${assetIds.length} image(s)`);
  }
}

async function main() {
  const inputFile = process.argv[2] || 'data/cityplaces-guangzhou.json';
  // Resolve from project root (go up from apps/api/scripts to project root)
  const projectRoot = path.resolve(process.cwd(), '../..');
  // If input file starts with ../ or is absolute, use as-is, otherwise resolve from project root
  let filePath: string;
  if (inputFile.startsWith('../') || path.isAbsolute(inputFile)) {
    filePath = path.resolve(projectRoot, inputFile.replace(/^\.\.\//, ''));
  } else {
    filePath = path.resolve(projectRoot, inputFile);
  }

  console.log(`Reading input file: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const places: CityPlaceInput[] = JSON.parse(fileContent);

  console.log(`Found ${places.length} places to ingest\n`);

  let success = 0;
  let failed = 0;

  for (const place of places) {
    try {
      await ingestCityPlace(place);
      success++;
    } catch (error: any) {
      console.error(`  ❌ Failed: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n✅ Completed: ${success} succeeded, ${failed} failed`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

