# Fix Your R2 Public URL

## Your Current Setting (WRONG)

```bash
R2_PUBLIC_BASE_URL="https://d64e7978ed801f4ac433d221e0cb0649.r2.cloudflarestorage.com"
```

**This is the PRIVATE endpoint** - it won't work for public image URLs!

## Correct Format

Update your `.env` file:

```bash
# Use this format instead:
R2_PUBLIC_BASE_URL="https://pub-d64e7978ed801f4ac433d221e0cb0649.r2.dev/bridgechina-media"
```

**Key differences:**
1. Use `pub-` prefix before account ID
2. Use `.r2.dev` domain (not `.r2.cloudflarestorage.com`)
3. Include your bucket name at the end

## How to Find Your Correct Public URL

1. Go to Cloudflare Dashboard > R2
2. Click on your bucket
3. Click on any uploaded file
4. Look at the "Public URL" - it will show the correct format
5. Copy the base URL (everything before the file key)

Example:
- File URL: `https://pub-d64e7978ed801f4ac433d221e0cb0649.r2.dev/bridgechina-media/uploads/image.jpg`
- Base URL: `https://pub-d64e7978ed801f4ac433d221e0cb0649.r2.dev/bridgechina-media`

## After Fixing

1. Update `.env` with correct `R2_PUBLIC_BASE_URL`
2. Restart your API server: `pnpm dev`
3. Try uploading again

The upload should now work and images will be accessible via the public URLs stored in the database.

