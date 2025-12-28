# Data Ingestion & Seeding Guide

## Overview

There are **two separate scripts** for populating your database:

1. **Seed Script** (`pnpm db:seed`) - Initial database setup (roles, categories, sample users, basic data)
2. **Data Ingestion Script** (`pnpm ingest:cityplaces`) - Bulk import CityPlaces with images from JSON

---

## 1. Seed Script (Initial Setup)

### Purpose
Creates essential database structure:
- Roles (ADMIN, OPS, EDITOR, SELLER, PARTNER, USER, GUIDE)
- Service categories
- Sample cities
- Sample admin/seller users
- Basic sample data

### Usage

```bash
# From project root
pnpm db:seed
```

### What it creates:
- ✅ All roles (including new GUIDE role)
- ✅ All service categories (including 'guide')
- ✅ Guangzhou city
- ✅ Admin user (email: `admin@bridgechina.com`, password: `admin123`)
- ✅ Seller user (email: `seller@bridgechina.com`, password: `seller123`)
- ✅ Sample hotels, restaurants, medical centers, tours, transport products
- ✅ Sample eSIM plans

### When to run:
- **First time setup** after migration
- **After resetting database** (development)
- **When you need fresh sample data**

### Credentials (default):
```
Admin:
  Email: admin@bridgechina.com
  Password: admin123

Seller:
  Email: seller@bridgechina.com
  Password: seller123
```

**⚠️ Change these in production!**

---

## 2. Data Ingestion Script (CityPlaces Bulk Import)

### Purpose
Bulk import tourist places (CityPlaces) with:
- Downloading images from public URLs
- Uploading to Cloudflare R2
- Generating thumbnails
- Creating MediaAsset records
- Creating CityPlace records

### Prerequisites

1. **R2 Credentials** in `apps/api/.env`:
```env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET=your_bucket_name
R2_PUBLIC_BASE_URL=https://pub-xxxxx.r2.dev
```

2. **Input JSON file** with CityPlace data (see format below)

### Usage

```bash
# From project root (recommended)
pnpm ingest:cityplaces data/cityplaces-guangzhou.json

# Or from apps/api directory
cd apps/api
pnpm ingest:cityplaces data/cityplaces-guangzhou.json

# With custom file path (relative to project root)
pnpm ingest:cityplaces data/my-places.json
```

**Note:** The script runs from `apps/api` directory internally, but paths should be relative to project root.

### Input JSON Format

Create a JSON file (e.g., `data/cityplaces-guangzhou.json`):

```json
[
  {
    "name": "Canton Tower",
    "city": "guangzhou",
    "short_description": "Iconic 600m tall tower",
    "description": "Full description here...",
    "address": "222 Yuejiang West Road, Haizhu District, Guangzhou",
    "lat": 23.1064,
    "lng": 113.3245,
    "cost_range": "¥¥¥",
    "opening_hours": {
      "mon": "09:00-23:00",
      "tue": "09:00-23:00",
      "wed": "09:00-23:00",
      "thu": "09:00-23:00",
      "fri": "09:00-23:00",
      "sat": "09:00-23:00",
      "sun": "09:00-23:00"
    },
    "customer_support_phone": "+86-20-89338222",
    "is_family_friendly": true,
    "is_pet_friendly": false,
    "tags": ["landmark", "observation", "tower"],
    "image_urls": [
      "https://example.com/tower1.jpg",
      "https://example.com/tower2.jpg"
    ]
  }
]
```

### Required Fields:
- `name` - Place name (required)
- `city` - City slug (must exist in database, e.g., "guangzhou")
- `address` - Full address (required)

### Optional Fields:
- `description` - Full description
- `short_description` - Brief description
- `lat`, `lng` - Coordinates
- `cost_range` - Price range (e.g., "¥", "¥¥", "¥¥¥")
- `opening_hours` - JSON object with day: hours
- `customer_support_phone` - Phone number
- `is_family_friendly` - Boolean
- `is_pet_friendly` - Boolean
- `tags` - Array of strings
- `image_urls` - Array of public image URLs (will be downloaded and uploaded to R2)

### What the script does:

1. ✅ Reads JSON file
2. ✅ For each place:
   - Validates city exists
   - Generates slug from name
   - Downloads images from `image_urls`
   - Generates thumbnails (300x300)
   - Uploads to R2 (original + thumbnail)
   - Creates MediaAsset records
   - Sets first image as cover, rest as gallery
   - Creates CityPlace record
3. ✅ Skips duplicates (by slug)
4. ✅ Reports success/failure for each place

### Example Output:

```
Reading input file: data/cityplaces-guangzhou.json
Found 2 places to ingest

Processing: Canton Tower
  Processing 2 images...
  Downloading: https://example.com/tower1.jpg
  Uploaded: uploads/1234567890-canton_tower-0.jpg
  Downloading: https://example.com/tower2.jpg
  Uploaded: uploads/1234567890-canton_tower-1.jpg
  ✅ Created: Canton Tower (abc-123-def)

Processing: Chen Clan Ancestral Hall
  ✅ Created: Chen Clan Ancestral Hall (xyz-456-ghi)

✅ Completed: 2 succeeded, 0 failed
```

---

## Complete Setup Workflow

### First Time Setup:

```bash
# 1. Apply migration
cd apps/api
pnpm db:migrate

# 2. Generate Prisma client
pnpm db:generate

# 3. Seed database (roles, categories, sample data)
cd ../..
pnpm db:seed

# 4. (Optional) Ingest CityPlaces
pnpm ingest:cityplaces data/cityplaces-guangzhou.json
```

### Adding More CityPlaces:

```bash
# Create/edit JSON file with new places
# Then run ingestion
pnpm ingest:cityplaces data/new-places.json
```

---

## Troubleshooting

### Seed Script Issues:

**Error: "Cannot find module 'argon2.node'"**
```bash
pnpm rebuild
pnpm install
```

**Error: "Role already exists"**
- This is normal - seed script uses `upsert`, so it's safe to run multiple times

### Ingestion Script Issues:

**Error: "R2 credentials not configured"**
- Check `apps/api/.env` has all R2 variables set

**Error: "City not found: guangzhou"**
- Run seed script first: `pnpm db:seed`
- Or create the city manually in admin panel

**Error: "Failed to download image"**
- Check image URLs are publicly accessible
- Check internet connection
- Some URLs may require authentication (not supported)

**Error: "Place already exists"**
- Script skips duplicates by slug
- To update, delete existing place first or change the name

**Images not showing after ingestion:**
- Check R2 public URL configuration
- Verify `R2_PUBLIC_BASE_URL` is correct
- Check CORS settings on R2 bucket

---

## Tips

1. **Start small**: Test with 1-2 places first
2. **Image URLs**: Use publicly accessible URLs (no auth required)
3. **City slug**: Must match exactly (case-sensitive)
4. **Slug generation**: Auto-generated from name, but you can't control it
5. **Batch size**: Script processes one place at a time (with 500ms delay between images)
6. **Large batches**: For 100+ places, consider splitting into multiple files

---

## Example: Creating Your Own Data File

1. Create `data/my-places.json`
2. Add places in JSON format (see above)
3. Run: `pnpm ingest:cityplaces data/my-places.json`

The script will:
- Create all places
- Download and upload images
- Link everything together automatically

---

## Next Steps After Ingestion

1. **Verify in admin panel**: `/admin/catalog/cityplaces`
2. **Check images**: Ensure thumbnails load correctly
3. **Link to tours**: Use admin panel to link places to tours
4. **Add reviews**: Users can add reviews through the app

