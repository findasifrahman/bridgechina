# Quick Start - Database Setup

## 🚀 Complete Setup (First Time)

```bash
# 1. Stop any running servers
# (Ctrl+C if pnpm dev is running)

# 2. Apply migration
cd apps/api
pnpm db:migrate

# 3. Generate Prisma client
pnpm db:generate

# 4. Seed database (creates roles, categories, sample users)
cd ../..
pnpm db:seed

# 5. (Optional) Import CityPlaces with images
pnpm ingest:cityplaces data/cityplaces-guangzhou.json

# 6. Start dev server
pnpm dev
```

## 📋 What Each Command Does

### `pnpm db:migrate`
- Applies database schema changes
- Drops old image tables
- Adds new columns (cover_asset_id, gallery_asset_ids)
- Creates Guide tables

### `pnpm db:generate`
- Generates Prisma client from schema
- Required after schema changes

### `pnpm db:seed`
- Creates roles (ADMIN, OPS, EDITOR, SELLER, PARTNER, USER, GUIDE)
- Creates service categories
- Creates Guangzhou city
- Creates sample admin/seller users
- Creates sample hotels, restaurants, tours, etc.

### `pnpm ingest:cityplaces [file.json]`
- Bulk imports CityPlaces from JSON
- Downloads images from URLs
- Uploads to R2
- Creates MediaAsset records
- Links images to places

## 🔑 Default Login Credentials

After seeding:

**Admin:**
- Email: `admin@bridgechina.com`
- Password: `admin123`

**Seller:**
- Email: `seller@bridgechina.com`
- Password: `seller123`

⚠️ **Change these in production!**

## 📝 Example: Adding More CityPlaces

1. Create/edit `data/my-places.json`:
```json
[
  {
    "name": "Place Name",
    "city": "guangzhou",
    "address": "Full address",
    "description": "Description",
    "image_urls": ["https://example.com/image.jpg"]
  }
]
```

2. Run ingestion:
```bash
pnpm ingest:cityplaces data/my-places.json
```

## ❓ Common Issues

**"EPERM: operation not permitted"**
- Stop dev server first
- Close database tools
- Run command again

**"City not found"**
- Run `pnpm db:seed` first

**"R2 credentials not configured"**
- Set R2 env vars in `apps/api/.env`
- See `R2_SETUP.md` for details

