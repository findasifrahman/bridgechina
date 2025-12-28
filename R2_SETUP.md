# Cloudflare R2 Setup Guide

## Overview

BridgeChina uses Cloudflare R2 (S3-compatible storage) to store uploaded images. We store **public URLs** in PostgreSQL, which allows images to be accessed directly without authentication.

## How It Works

1. **Upload Flow**:
   - User uploads image through admin panel
   - Server validates file (size, type)
   - Server generates thumbnail automatically
   - Both original and thumbnail are uploaded to R2
   - **Public URLs** are stored in PostgreSQL `media_assets` table

2. **URL Storage**:
   - `public_url`: Direct public URL to the original image
   - `thumbnail_url`: Direct public URL to the thumbnail
   - These URLs are stored in the database and used directly in `<img>` tags

3. **Public vs Private**:
   - We use **PUBLIC URLs** stored in the database
   - Images are accessible via direct URL (no authentication needed)
   - This allows fast loading and CDN benefits

## Setup Steps

### 1. Create R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** > **Create bucket**
3. Name your bucket (e.g., `bridgechina-media`)
4. Choose a location (closest to your users)

### 2. Create S3 API Token

1. In R2 dashboard, go to **Manage R2 API Tokens**
2. Click **Create API Token**
3. Select **S3 API Token** (NOT regular API token)
4. Give it a name (e.g., `bridgechina-upload`)
5. Set permissions: **Object Read & Write**
6. Copy the **Access Key ID** and **Secret Access Key**

### 3. Configure Public Access

**Option A: Use R2 Public URL (Easiest)**
- R2 provides public URLs automatically: `https://pub-{account-id}.r2.dev/{bucket}/{key}`
- No additional configuration needed
- Just set `R2_PUBLIC_BASE_URL` to empty or omit it

**Option B: Custom Domain (Recommended for Production)**
1. In R2 bucket settings, go to **Public Access**
2. Add a custom domain (e.g., `media.bridgechina.com`)
3. Configure DNS CNAME record pointing to R2
4. Set `R2_PUBLIC_BASE_URL=https://media.bridgechina.com` in `.env`

### 4. Environment Variables

Add these to `apps/api/.env`:

```bash
# R2 Configuration
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET=bridgechina-media

# IMPORTANT: R2_ENDPOINT is for API calls (private)
R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com

# IMPORTANT: R2_PUBLIC_BASE_URL is for public image URLs (different format!)
# Format: https://pub-{account-id}.r2.dev/{bucket}
# Example: https://pub-d64e7978ed801f4ac433d221e0cb0649.r2.dev/bridgechina-media
R2_PUBLIC_BASE_URL=https://pub-your_account_id.r2.dev/bridgechina-media

# OR for custom domain:
# R2_PUBLIC_BASE_URL=https://media.bridgechina.com
```

**⚠️ Common Mistake:**
- ❌ WRONG: `R2_PUBLIC_BASE_URL=https://d64e7978ed801f4ac433d221e0cb0649.r2.cloudflarestorage.com` (This is the private endpoint!)
- ✅ CORRECT: `R2_PUBLIC_BASE_URL=https://pub-d64e7978ed801f4ac433d221e0cb0649.r2.dev/bridgechina-media` (Public URL with `pub-` prefix and `.r2.dev` domain)

### 5. Find Your Account ID

1. Go to Cloudflare Dashboard
2. Click on your domain
3. The Account ID is in the right sidebar under "API"
4. Or check the R2 endpoint URL: `https://{account-id}.r2.cloudflarestorage.com`

## Testing Upload

1. Start the API server: `pnpm dev`
2. Go to Admin Panel > Media
3. Click "Upload Image"
4. Select an image (max 1MB)
5. Check browser console and server logs for any errors

## Troubleshooting

### Upload Stuck/Hanging

**Check:**
1. R2 credentials are correct in `.env`
2. Bucket name matches `R2_BUCKET`
3. Network connectivity to R2 endpoint
4. Check server logs for detailed error messages

**Common Issues:**
- Wrong credentials → Check Access Key ID and Secret Access Key
- Bucket doesn't exist → Verify bucket name in R2 dashboard
- Network timeout → Check firewall/proxy settings
- Wrong endpoint → Use format: `https://{account-id}.r2.cloudflarestorage.com`

### Images Not Loading

**Check:**
1. Public URL format in database
2. R2 bucket has public access enabled
3. Custom domain DNS is configured (if using custom domain)
4. CORS is configured (if loading from browser)

**Public URL Format:**
- Default: `https://pub-{account-id}.r2.dev/{bucket}/{key}`
- Custom: `https://your-domain.com/{key}`

### CORS Errors

If you see CORS errors when loading images:
1. Go to R2 bucket > Settings > CORS Policy
2. Add CORS configuration (see `CORS_SETUP.md`)
3. Or use server-side upload (already implemented)

## Database Schema

The `media_assets` table stores:
- `r2_key`: The object key in R2 (e.g., `uploads/1234567890-image.jpg`)
- `public_url`: Full public URL (e.g., `https://pub-xxx.r2.dev/bucket/uploads/1234567890-image.jpg`)
- `thumbnail_url`: Full public URL to thumbnail
- `thumbnail_key`: The thumbnail object key in R2

**These URLs are stored in the database and used directly in the frontend.**

## Production Recommendations

1. **Use Custom Domain**: Better performance and branding
2. **Enable CDN**: R2 automatically uses Cloudflare CDN
3. **Set CORS**: Configure CORS for your domain
4. **Monitor Usage**: Check R2 dashboard for storage/bandwidth
5. **Backup Strategy**: Consider periodic backups of R2 bucket

## Cost

R2 pricing:
- Storage: $0.015 per GB/month
- Class A operations (writes): $4.50 per million
- Class B operations (reads): $0.36 per million
- Egress: Free (unlike S3)

For a typical site with 1000 images (~500MB):
- Storage: ~$0.0075/month
- Operations: Minimal cost
- **Total: < $1/month**

