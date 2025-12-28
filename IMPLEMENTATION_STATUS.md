# Implementation Status - Backend Refactoring

## ✅ Completed

### PART 1: Schema Correction
- ✅ Removed all per-entity image tables from schema
- ✅ Added `cover_asset_id` and `gallery_asset_ids` JSONB to all entities
- ✅ Updated MediaAsset relations
- ✅ Migration SQL file created

### PART 2: Reviews System
- ✅ Updated Review model to support "guide" entity_type
- ⏳ Review APIs need to be added/updated

### PART 3: Guide Service
- ✅ Added GuideProfile, GuideRequest, GuideOffer models
- ✅ Added GUIDE role
- ⏳ Guide APIs need to be implemented

### PART 4: CityPlace APIs
- ✅ Updated admin CityPlace CRUD to use new image structure
- ✅ Updated public CityPlace API to use new image structure
- ⏳ Need to add endpoints for requesting guide/transport from CityPlace

### PART 5: Admin Catalog APIs
- ✅ CityPlace CRUD updated with pagination/search/filters
- ⏳ Hotels, Tours, Transport, GuideProfile CRUD need similar updates

### PART 6: Data Ingestion Script
- ⏳ Script needs to be created

## 🔄 In Progress

### Next Steps:
1. Update Hotels, Tours, Transport admin CRUD APIs
2. Add Guide service APIs (user + guide + admin)
3. Add Review APIs with guide support
4. Create data ingestion script
5. Update TransportBooking to support one-way/round-trip/full-day

## 📝 Notes

- Migration file created but not yet applied
- All image table references removed from schema
- New structure uses `cover_asset_id` (single) + `gallery_asset_ids` (JSONB array)

