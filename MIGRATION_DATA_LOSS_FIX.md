# Migration Data Loss Issue - Recovery Guide

## Problem
The migration `20260102103755_add_external_hotels` may have caused data loss because:

1. **Dropped Image Junction Tables**: The migration drops these tables:
   - `city_images`
   - `city_place_images`
   - `esim_images`
   - `hotel_images`
   - `medical_images`
   - `product_images`
   - `restaurant_images`
   - `tour_images`
   - `transport_images`

2. **Made Columns NOT NULL**: 
   - `external_search_cache.query_json` - will fail if NULL values exist
   - `external_search_cache.results_json` - will fail if NULL values exist

3. **Changed HotelBooking columns to nullable**: This should be safe, but if there were constraints, it might have caused issues.

## What Data Was Actually Lost?

The migration should NOT have deleted data from main tables like:
- `hotels`
- `restaurants`
- `medical_centers`
- `tours`
- `transport_products`
- `cities`
- `city_places`
- etc.

However, if you had data in the image junction tables, that data is lost unless you have a backup.

## Recovery Steps

### Option 1: Restore from Database Backup
If you have a database backup from before the migration:
```bash
# Restore the backup
psql -h your_host -U your_user -d your_database < backup_file.sql

# Then manually apply only the new external hotel tables
```

### Option 2: Rollback Migration (if possible)
```bash
cd apps/api
pnpm prisma migrate resolve --rolled-back 20260102103755_add_external_hotels
```

Then create a new migration that:
1. Preserves existing image junction tables OR migrates their data first
2. Only adds the new external hotel tables
3. Doesn't make columns NOT NULL if they have NULL values

### Option 3: Manual Data Recovery
If you have the image junction table data elsewhere, you can:
1. Recreate the tables
2. Restore the data
3. Then migrate to the new schema

## Prevention for Future

Before running migrations that drop tables or make columns NOT NULL:
1. **Always backup your database first**
2. **Check for NULL values** in columns that will become NOT NULL
3. **Migrate data** from old tables to new structure before dropping
4. **Test migrations** on a copy of production data first

## Next Steps

1. Check if your main data tables still have data:
   ```sql
   SELECT COUNT(*) FROM hotels;
   SELECT COUNT(*) FROM restaurants;
   SELECT COUNT(*) FROM medical_centers;
   -- etc.
   ```

2. If main tables are empty, restore from backup immediately

3. If only image tables are lost, we can recreate them or migrate to the new structure

4. Create a safer migration that:
   - Migrates image data from junction tables to `gallery_asset_ids` JSONB columns
   - Then drops the old tables
   - Only adds new external hotel tables





