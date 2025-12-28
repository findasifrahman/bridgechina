# Update Your R2_PUBLIC_BASE_URL

## Your Current Setting

```bash
R2_PUBLIC_BASE_URL="https://pub-01637ccce9644ffc8b9c5b8dd003cf33.r2.dev"
```

## ✅ Correct Format (Add Bucket Name)

Update your `.env` file to include your bucket name:

```bash
# Format: {public-url}/{bucket-name}
R2_PUBLIC_BASE_URL="https://pub-01637ccce9644ffc8b9c5b8dd003cf33.r2.dev/bridgechina"
```

**Important:** The bucket name (`bridgechina`) must be added to the URL!

## How URLs Are Generated

The code will generate URLs like:
- Original: `{R2_PUBLIC_BASE_URL}/uploads/1234567890-image.jpg`
- Which becomes: `https://pub-01637ccce9644ffc8b9c5b8dd003cf33.r2.dev/bridgechina/uploads/1234567890-image.jpg`

## After Updating

1. Update `.env` with the bucket name in `R2_PUBLIC_BASE_URL`
2. Restart API server: `pnpm dev`
3. Try uploading again

The upload should now complete and images will be accessible via the correct public URLs.

