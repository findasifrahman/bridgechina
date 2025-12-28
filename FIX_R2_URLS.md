# Fix R2 Image URLs

## Problem
The image URLs saved in the database include the bucket name in the path, which is incorrect for R2 public URLs. 

**Incorrect format:**
```
https://pub-01637ccce9644ffc8b9c5b8dd003cf33.r2.dev/bridgechina/uploads/1766834116251-safari_park1.jpg
```

**Correct format:**
```
https://pub-01637ccce9644ffc8b9c5b8dd003cf33.r2.dev/uploads/1766834116251-safari_park1.jpg
```

## Solution

### 1. The code has been fixed
The `getPublicUrl()` function in `apps/api/src/utils/image-processor.ts` has been updated to NOT include the bucket name in the URL path. All new uploads will use the correct format.

### 2. Fix existing URLs in database

Run this API endpoint to fix all existing URLs in the database:

**Using curl:**
```bash
curl -X POST http://localhost:3000/api/admin/media/fix-urls \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**Using browser console (when logged in as admin):**
```javascript
fetch('/api/admin/media/fix-urls', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
})
  .then(res => res.json())
  .then(data => console.log('Fixed URLs:', data));
```

**Or create a simple script:**
```bash
# In apps/api directory
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getPublicUrl } = require('./src/utils/image-processor.js');

(async () => {
  const assets = await prisma.mediaAsset.findMany();
  let fixed = 0;
  for (const asset of assets) {
    const newPublicUrl = getPublicUrl(asset.r2_key);
    const newThumbnailUrl = asset.thumbnail_key ? getPublicUrl(asset.thumbnail_key) : null;
    if (asset.public_url !== newPublicUrl || asset.thumbnail_url !== newThumbnailUrl) {
      await prisma.mediaAsset.update({
        where: { id: asset.id },
        data: {
          public_url: newPublicUrl,
          thumbnail_url: newThumbnailUrl,
        },
      });
      fixed++;
      console.log(\`Fixed: \${asset.id} -> \${newPublicUrl}\`);
    }
  }
  console.log(\`\nFixed \${fixed} URLs\`);
  await prisma.\$disconnect();
})();
"
```

### 3. Verify R2 Bucket Public Access

Make sure your R2 bucket has public access enabled:

1. Go to Cloudflare Dashboard > R2
2. Click on your bucket (`bridgechina`)
3. Go to Settings > Public Access
4. Enable "Public Development URL" or connect a custom domain
5. Copy the public URL (should be `https://pub-{account-id}.r2.dev`)
6. Update `R2_PUBLIC_BASE_URL` in `.env` if needed

### 4. Test

After fixing URLs, test by:
1. Opening a place detail page
2. Check browser console for image URLs
3. Try opening an image URL directly in a new tab
4. Images should load correctly

## Notes

- The bucket name (`bridgechina`) should NOT be in the public URL path
- The key already contains the full path: `uploads/file.jpg` or `thumbnails/file.jpg`
- Only the key is appended to the public base URL

