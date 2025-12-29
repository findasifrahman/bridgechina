# Database Connection Diagnostic

## Issue
Backup version loads data from database, but current version doesn't show images/offers even though `.env` points to the same database.

## What to Check

### 1. Prisma Client Generation
✅ **DONE** - Prisma client has been regenerated:
```bash
pnpm --filter @bridgechina/api db:generate
```

### 2. Database Schema Sync
Check if the Prisma schema matches your database:
```bash
# Check if schema is in sync
pnpm --filter @bridgechina/api db:push --accept-data-loss

# OR run migrations
pnpm --filter @bridgechina/api db:migrate:deploy
```

### 3. Verify Database Connection
Check your `.env` file in `apps/api/.env`:
- `DATABASE_URL` should be the same as your backup
- Format: `postgresql://user:password@host:port/database`

### 4. Check API Endpoints
Test these endpoints directly:
- `GET /api/public/home?city_slug=guangzhou` - Should return homepage data
- `GET /api/public/offers` - Should return active offers
- `GET /api/public/banners` - Should return homepage banners

### 5. Check Database Data
Verify data exists in these tables:
- `featured_items` - Should have entries with `is_active = true`
- `service_based_offers` - Should have active offers
- `homepage_banners` - Should have banners with `is_active = true`
- `media_assets` - Should have images
- `external_hot_items` - Should have pinned items for shopping

### 6. Common Issues

**Issue: Prisma schema doesn't match database**
- Solution: Run `pnpm --filter @bridgechina/api db:push` to sync schema

**Issue: Missing data in database**
- Solution: Run `pnpm --filter @bridgechina/api db:seed` to populate initial data

**Issue: API not connecting to database**
- Check `.env` file location (should be in `apps/api/.env`)
- Verify `DATABASE_URL` is correct
- Check if database is accessible

**Issue: Prisma client out of date**
- Solution: Regenerate with `pnpm --filter @bridgechina/api db:generate`

## Fixed Issues

1. ✅ Added `hot_products` to `/home` endpoint response
2. ✅ Regenerated Prisma client
3. ✅ Verified offers endpoint exists at `/api/public/offers`
4. ✅ Added `db:push` script to package.json
5. ✅ Fixed axios baseURL to use `VITE_API_URL` environment variable
6. ✅ Database schema is in sync (verified with `db:push`)

## Next Steps

1. **Check browser console** - Look for API errors
2. **Check API logs** - See if database queries are failing
3. **Compare backup vs current**:
   - Check if backup has different Prisma schema
   - Check if backup has different API route implementations
   - Check if backup has different environment variables

## Quick Test

Run the API and test:
```bash
# Start API
pnpm --filter @bridgechina/api dev

# In another terminal, test endpoint
curl http://localhost:3001/api/public/home?city_slug=guangzhou
```

If this returns data, the issue is in the frontend. If it doesn't, the issue is in the API/database connection.

