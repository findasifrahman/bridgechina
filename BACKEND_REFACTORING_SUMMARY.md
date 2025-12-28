# Backend Refactoring Summary

## ✅ COMPLETED

### PART 1: Schema Correction ✅
- ✅ Removed all per-entity image tables from Prisma schema:
  - CityPlaceImage, CityImage, TransportImage, TourImage, MedicalImage, RestaurantImage, HotelImage, ProductImage, EsimImage
- ✅ Added `cover_asset_id` and `gallery_asset_ids` JSONB to:
  - Hotel, Restaurant, MedicalCenter, Tour, TransportProduct, City, CityPlace, Product, EsimPlan
- ✅ Updated MediaAsset relations to support cover images
- ✅ Migration SQL file created: `apps/api/prisma/migrations/20251228003310_remove_image_tables_add_guide_service/migration.sql`

### PART 2: Reviews System ✅
- ✅ Updated Review model to support "guide" entity_type
- ✅ Added public review endpoint: `GET /api/public/reviews?entity_type=&entity_id=`
- ✅ Added user review endpoint: `POST /api/user/reviews`
- ✅ Added helper function to update entity ratings automatically

### PART 3: Guide Service ✅
- ✅ Added GuideProfile, GuideRequest, GuideOffer models
- ✅ Added GUIDE role to schema
- ✅ Created Guide routes (`/api/guide/*`):
  - GET `/api/guide/profile` - Get guide's own profile
  - POST `/api/guide/profile` - Create/update guide profile
  - GET `/api/guide/requests` - Get open requests in guide's city
  - POST `/api/guide/offers` - Create offer for a request
  - GET `/api/guide/offers` - Get guide's offers
- ✅ Created User routes for guide requests:
  - POST `/api/user/guide-request` - Request guide service
  - GET `/api/user/guide-requests` - Get user's guide requests
  - POST `/api/user/guide-offers/:id/accept` - Accept a guide offer
- ✅ Added Admin Guide CRUD:
  - GET `/api/admin/catalog/guides` - List guides (paginated, searchable, filterable)
  - GET `/api/admin/catalog/guides/:id` - Get guide details
  - PUT `/api/admin/catalog/guides/:id` - Update guide (verify, etc.)
  - DELETE `/api/admin/catalog/guides/:id` - Delete guide
  - GET `/api/admin/guide/requests` - List all guide requests
  - GET `/api/admin/guide/requests/:id` - Get request details
  - PUT `/api/admin/guide/requests/:id/status` - Update request status

### PART 4: CityPlace + Tour + Transport Flow ✅
- ✅ Updated CityPlace APIs to use new image structure (cover_asset_id + gallery_asset_ids)
- ✅ Updated public CityPlace API to return images correctly
- ✅ Added endpoint: `POST /api/user/request-transport-from-cityplace`
- ✅ TransportBooking already supports different types (pickup, point_to_point, daily_charter)

### PART 5: Admin Catalog (Partial) ✅
- ✅ CityPlace CRUD: Full pagination, search, filters, sort
- ✅ Guide CRUD: Full pagination, search, filters, sort
- ✅ Hotels CRUD: Updated to use new image structure, pagination added
- ⏳ Tours CRUD: Needs update to new image structure + pagination
- ⏳ Transport CRUD: Needs update to new image structure + pagination

### PART 6: Data Ingestion Script ✅
- ✅ Created `scripts/ingest-cityplaces.ts`
- ✅ Script features:
  - Reads JSON input file
  - Downloads images from public URLs
  - Uploads to Cloudflare R2
  - Generates thumbnails
  - Creates MediaAsset records
  - Creates CityPlace records with images
- ✅ Added example input: `data/cityplaces-guangzhou.json`
- ✅ Added script command: `pnpm ingest:cityplaces [file.json]`

## ⏳ REMAINING WORK

### 1. Update Remaining Catalog APIs
**Tours:**
- Update GET to use cover_asset_id + gallery_asset_ids
- Update POST/PUT to accept image_ids and convert to new structure
- Add pagination, search, filters

**Transport:**
- Update GET to use cover_asset_id + gallery_asset_ids
- Update POST/PUT to accept image_ids and convert to new structure
- Add pagination, search, filters
- Ensure TransportBooking supports one-way/round-trip/full-day (already in schema)

**Restaurants, Medical Centers:**
- Similar updates needed

### 2. Update Public APIs
- Update Hotels, Tours, Transport public endpoints to use new image structure
- Ensure they return coverAsset and galleryAssets

### 3. Update Seed Script
- Update seed script to use new image structure
- Add GUIDE role to seed
- Add sample guide profiles

### 4. Test Migration
- Run migration: `pnpm db:migrate`
- Verify all image tables dropped
- Verify new columns added
- Verify guide tables created

## 📋 MIGRATION INSTRUCTIONS

### Before Migration:
1. **Backup your database** (important!)
2. Existing image data in the dropped tables will be lost
3. Admin should re-upload images using the new structure after migration

### Run Migration:
```bash
cd apps/api
pnpm db:migrate
```

Or if you want to apply the migration manually:
```bash
cd apps/api
psql $DATABASE_URL -f prisma/migrations/20251228003310_remove_image_tables_add_guide_service/migration.sql
```

### After Migration:
1. Regenerate Prisma client: `pnpm db:generate`
2. Re-upload images through admin panel (they'll use the new structure)
3. Test guide service flow end-to-end

## 🔧 API ENDPOINTS SUMMARY

### Guide Service
- **User**: `POST /api/user/guide-request`, `GET /api/user/guide-requests`, `POST /api/user/guide-offers/:id/accept`
- **Guide**: `GET /api/guide/profile`, `POST /api/guide/profile`, `GET /api/guide/requests`, `POST /api/guide/offers`, `GET /api/guide/offers`
- **Admin**: `GET /api/admin/catalog/guides`, `GET /api/admin/catalog/guides/:id`, `PUT /api/admin/catalog/guides/:id`, `DELETE /api/admin/catalog/guides/:id`, `GET /api/admin/guide/requests`, `GET /api/admin/guide/requests/:id`, `PUT /api/admin/guide/requests/:id/status`

### Reviews
- **Public**: `GET /api/public/reviews?entity_type=&entity_id=`
- **User**: `POST /api/user/reviews`, `GET /api/user/reviews`

### CityPlace
- **Public**: `GET /api/public/catalog/cityplaces`, `GET /api/public/catalog/cityplaces/:id`
- **Admin**: `GET /api/admin/catalog/cityplaces` (paginated), `POST /api/admin/catalog/cityplaces`, `PUT /api/admin/catalog/cityplaces/:id`, `DELETE /api/admin/catalog/cityplaces/:id`

## 📝 NOTES

- All image references now use `cover_asset_id` (single) + `gallery_asset_ids` (JSONB array of MediaAsset.id strings)
- Guide profiles are one-to-one with users (user_id is primary key)
- Guide requests are one-to-one with service_requests
- Reviews automatically update entity ratings when created
- Data ingestion script requires R2 credentials in .env

## 🚀 NEXT STEPS

1. **Run the migration** (backup first!)
2. **Update remaining catalog APIs** (Tours, Transport, Restaurants, Medical)
3. **Update public APIs** to use new image structure
4. **Test guide service flow** end-to-end
5. **Test data ingestion script** with sample data
6. **Update frontend** to use new image structure (separate task)

