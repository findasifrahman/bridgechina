# Cloudflare R2 CORS Configuration

To fix CORS errors when uploading images directly to R2, you need to configure CORS on your R2 bucket.

## Option 1: Configure CORS via Cloudflare Dashboard (Recommended)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** > Your bucket
3. Click on **Settings** tab
4. Scroll down to **CORS Policy**
5. Add the following CORS configuration:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://yourdomain.com"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

6. Click **Save**

## Option 2: Use Server-Side Upload (Current Implementation)

The current implementation uses **server-side upload** which avoids CORS issues entirely:

- Images are uploaded to your Fastify API server (`/api/admin/media/upload`)
- The server handles:
  - File size validation (1MB max)
  - Thumbnail generation
  - Upload to R2
  - Database recording

This approach:
- ✅ No CORS configuration needed
- ✅ Better security (server validates files)
- ✅ Automatic thumbnail generation
- ✅ File size validation
- ✅ Better error handling

## Option 3: Configure CORS via Wrangler CLI

If you prefer using the CLI:

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create a CORS configuration file (cors.json)
cat > cors.json << EOF
[
  {
    "AllowedOrigins": ["http://localhost:5173", "https://yourdomain.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
EOF

# Apply CORS to your bucket
wrangler r2 bucket cors put <your-bucket-name> --file cors.json
```

## Current Status

✅ **Server-side upload is implemented and working** - No CORS configuration needed!

The frontend now uses `/api/admin/media/upload` which:
- Accepts multipart/form-data
- Validates file size (1MB max)
- Generates thumbnails automatically
- Uploads both original and thumbnail to R2
- Stores metadata in database

If you still want to use presigned URLs (direct upload), configure CORS as shown above.

