# Media Upload & Attachment Guide

## Overview

The media upload system uses **Cloudflare R2** (S3-compatible storage) to store images. The process is straightforward and designed to be user-friendly.

## How It Works

### Step 1: Upload Images to Media Library

1. Go to **Admin Dashboard → Media**
2. Click **"Upload Image"** button
3. Select an image file (max 1MB)
4. Optionally select a category (hotel, restaurant, cityplace, etc.)
5. Click **"Upload"**
6. The image is automatically:
   - Uploaded to Cloudflare R2
   - A thumbnail is generated
   - A record is created in the `media_assets` table
   - The image appears in your media library

### Step 2: Attach Images to Hotels, Restaurants, City Places, etc.

1. Go to **Admin Dashboard → Catalog**
2. Select the tab (Hotels, Restaurants, City Places, etc.)
3. Click **"Add"** or **"Edit"** on an item
4. In the form, find the **"Multi Image Picker"** section
5. Click to open the media picker
6. Select images from your media library
7. The first image becomes the **cover image**
8. Additional images become **gallery images**
9. Click **"Save"**

## Technical Details

### Image Storage
- **Location**: Cloudflare R2 bucket
- **Path**: `uploads/{timestamp}-{filename}`
- **Thumbnails**: Automatically generated (smaller versions for faster loading)
- **Public URLs**: Automatically generated and stored in database

### Database Structure
- `media_assets` table stores all uploaded images
- Each entity (Hotel, Restaurant, etc.) has:
  - `cover_asset_id` → Single cover image
  - `gallery_asset_ids` → Array of gallery image IDs

### Image Limits
- **File size**: Max 1MB per image
- **Thumbnail**: Automatically generated (smaller size)
- **No limit** on number of images per entity

## Common Workflows

### Adding Images to a New Hotel
1. Upload hotel images to Media Library (if not already uploaded)
2. Go to Catalog → Hotels → Add Hotel
3. Fill in hotel details
4. Use Multi Image Picker to select images
5. Save

### Adding Images to Existing Restaurant
1. Go to Catalog → Restaurants
2. Click "Edit" on the restaurant
3. Use Multi Image Picker to add/change images
4. Save

### Bulk Upload for City Places
1. Use the data ingestion script: `pnpm ingest:cityplaces data/cityplaces-guangzhou.json`
2. The script automatically downloads images from URLs and uploads to R2
3. Images are automatically attached to City Places

## Troubleshooting

### Images Not Showing
- Check that `R2_PUBLIC_BASE_URL` is set correctly in `.env`
- Format: `https://pub-{account-id}.r2.dev` (no bucket name in path)
- Verify the image exists in R2 bucket
- Check browser console for CORS errors

### Upload Fails
- Verify R2 credentials in `.env`:
  - `R2_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET`
- Check file size (must be ≤ 1MB)
- Check file format (must be an image)

### Images Not Attaching
- Ensure images are uploaded to Media Library first
- Use the Multi Image Picker (not direct file upload in catalog forms)
- Check that `mediaAssets` are loaded (check browser console)

## Is It Too Much Trouble?

**Short answer: No!** The system is designed to be simple:

1. **One-time setup**: Configure R2 credentials in `.env`
2. **Simple workflow**: Upload once → Use everywhere
3. **Reusable**: Upload an image once, use it for multiple entities
4. **Organized**: Media library keeps all images in one place
5. **Fast**: Thumbnails load quickly, full images on demand

### Benefits
- ✅ Centralized media management
- ✅ Automatic thumbnail generation
- ✅ Reusable across all entities
- ✅ Easy to organize with categories and tags
- ✅ Fast loading with CDN (Cloudflare R2)

### Alternative: Direct Upload
If you prefer, you can also:
- Upload images directly in catalog forms (future enhancement)
- Use the ingestion script for bulk imports
- Import via API endpoints

## Quick Reference

**Upload Image**: Admin → Media → Upload Image  
**Attach to Entity**: Admin → Catalog → [Entity] → Edit → Multi Image Picker  
**View Media Library**: Admin → Media  
**Bulk Import**: `pnpm ingest:cityplaces data/cityplaces-guangzhou.json`

