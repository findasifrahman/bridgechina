# Safe Migration Instructions - Extend Provider Profiles

## ⚠️ IMPORTANT: This migration is SAFE - It only ADDS columns and tables, NO DATA DELETION

## What This Migration Does

This migration **ONLY ADDS** new fields and tables. It does NOT:
- ❌ Delete any tables
- ❌ Delete any columns
- ❌ Delete any data
- ❌ Modify existing data

## Changes Made

### 1. ServiceProviderProfile Table - ADD new columns (all nullable)
- `provider_type`, `display_name`, `company_name`, `contact_name`
- `whatsapp`, `wechat`, `email`, `website`
- `description`, `languages`, `service_area`, `address_text`
- `verified`, `rating`, `review_count`
- `cover_asset_id`, `gallery_asset_ids`, `onboarding_completed_at`

### 2. GuideProfile Table - ADD new columns (all nullable)
- `wechat`, `whatsapp`
- `is_living_inside_china`, `current_occupation`, `years_of_experience`
- `identity_verified`, `additional_photos_asset_ids`

### 3. ServiceProviderServiceProfile Table - CREATE new table
- New table for per-service provider profiles
- No impact on existing data

## How to Apply the Migration

### Option 1: Apply Migration SQL Directly (Recommended for Production)

1. **Connect to your database** (when connection is available)

2. **Run the migration SQL file**:
   ```bash
   cd apps/api
   psql -h mainline.proxy.rlwy.net -p 17048 -U postgres -d railway -f prisma/migrations/20250128000000_extend_provider_profiles/migration.sql
   ```

   Or use your database client (pgAdmin, DBeaver, etc.) to run the SQL file.

3. **Mark migration as applied in Prisma**:
   ```bash
   cd apps/api
   pnpm prisma migrate resolve --applied 20250128000000_extend_provider_profiles
   ```

### Option 2: Use Prisma Migrate (When DB Connection is Stable)

```bash
cd apps/api
pnpm prisma migrate deploy
```

### Option 3: If Prisma Still Wants to Reset

If Prisma still detects issues and wants to reset:

1. **DO NOT ACCEPT THE RESET** - Cancel the command

2. **Check migration history**:
   ```bash
   pnpm prisma migrate status
   ```

3. **Resolve the modified migration issue first**:
   - The warning about `20251228003310_remove_image_tables_add_guide_service` being modified
   - You may need to check if that migration file was changed

4. **Then apply this migration** using Option 1 or 2 above

## Verification

After applying the migration, verify:

1. **Check new columns exist**:
   ```sql
   SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'service_provider_profiles' 
   AND column_name IN ('provider_type', 'display_name', 'verified');
   ```

2. **Check new table exists**:
   ```sql
   SELECT * FROM information_schema.tables 
   WHERE table_name = 'service_provider_service_profiles';
   ```

3. **Verify no data was lost**:
   ```sql
   SELECT COUNT(*) FROM service_provider_profiles;
   SELECT COUNT(*) FROM guide_profiles;
   ```

## Safety Features

- ✅ All new columns are **nullable** (no NOT NULL constraints on new columns)
- ✅ Uses `ADD COLUMN IF NOT EXISTS` to prevent errors if column already exists
- ✅ Uses `CREATE TABLE IF NOT EXISTS` to prevent errors if table already exists
- ✅ Uses `CREATE INDEX IF NOT EXISTS` to prevent duplicate index errors
- ✅ Uses conditional foreign key creation (DO blocks) to prevent errors
- ✅ Default values provided where needed (`verified = false`, `review_count = 0`)

## Next Steps After Migration

1. Run `pnpm prisma generate` to update TypeScript types
2. TypeScript errors in `provider.ts` will resolve automatically
3. Create provider profile UI (`apps/web/src/pages/provider/ProfilePage.vue`)



