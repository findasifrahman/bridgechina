# Fix: external_catalog_items.created_at Error

## The Error
```
The column `external_catalog_items.created_at` does not exist in the current database.
```

## The Problem
The Prisma schema had `created_at` field, but your database table doesn't have this column.

## The Fix
I've removed `created_at` and `updated_at` from the `ExternalCatalogItem` model in Prisma schema.

## Next Steps

1. **Stop your API server** (Ctrl+C in the terminal running `pnpm dev`)

2. **Regenerate Prisma client:**
   ```bash
   pnpm --filter @bridgechina/api db:generate
   ```

3. **Restart the API:**
   ```bash
   pnpm dev
   ```

## Verify the Fix

After regenerating, the error should be gone. The code uses `last_synced_at` for ordering, which should exist in your database.

## If Error Persists

Check what columns actually exist:
```bash
# Stop API server first, then:
pnpm --filter @bridgechina/api db:check-catalog
```

This will show you the actual columns in your database so we can match the Prisma schema exactly.


