# How to Rollback the Migration

## Important: Do this ONLY if you have a database backup

The migration `20260102103755_add_external_hotels` may have caused data loss. Here's how to rollback:

### Step 1: Check What Data Still Exists
Run the SQL script `check-data-loss.sql` to see what tables still have data.

### Step 2: Restore from Backup (Recommended)
If you have a database backup from before the migration:
```bash
# Restore the backup
psql -h your_host -U your_user -d your_database < backup_file.sql
```

### Step 3: Mark Migration as Rolled Back
```bash
cd apps/api
pnpm prisma migrate resolve --rolled-back 20260102103755_add_external_hotels
```

### Step 4: Create a Safer Migration
The issue is that the migration:
1. Drops image junction tables (which may have had data)
2. Makes columns NOT NULL without checking for NULL values first

We need to create a migration that:
1. First migrates data from image junction tables to `gallery_asset_ids` JSONB columns
2. Then drops the old tables
3. Only then adds the new external hotel tables

## Alternative: Fix the Current State

If you can't rollback, we can:
1. Check what data is missing
2. Recreate missing tables if needed
3. Create a new migration that properly handles the transition



