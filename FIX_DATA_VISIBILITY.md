# Fix: Data Not Showing Because of is_active Filter

## The Problem

Your database has data (like the 2 city_places you showed), but the API is filtering it out because it only returns items where `is_active = true`.

Looking at the API code:
```typescript
// Line 171-175 in apps/api/src/routes/public.ts
prisma.cityPlace.findMany({
  where: {
    ...(cityId ? { city_id: cityId } : {}),
    is_active: true,  // <-- This filters out inactive items!
  },
```

## Solution 1: Check Your Data Status

Run this to see which items are inactive:
```bash
# Stop API server first, then:
pnpm --filter @bridgechina/api db:check-active
```

This will show you:
- How many city_places are active vs inactive
- How many featured_items are active vs inactive
- How many offers/banners are active vs inactive

## Solution 2: Fix the Data (Recommended)

### Option A: Using SQL (Quick)
Run this SQL in your database client:
```sql
-- Activate all city places
UPDATE city_places SET is_active = true WHERE is_active = false OR is_active IS NULL;

-- Activate all featured items
UPDATE featured_items SET is_active = true WHERE is_active = false OR is_active IS NULL;

-- Activate all offers
UPDATE service_based_offers SET is_active = true WHERE is_active = false OR is_active IS NULL;

-- Activate all banners
UPDATE homepage_banners SET is_active = true WHERE is_active = false OR is_active IS NULL;
```

### Option B: Using Prisma Studio (Visual)
```bash
# Stop API server first, then:
pnpm --filter @bridgechina/api db:studio
```

Then:
1. Open `city_places` table
2. Find your 2 rows
3. Check the `is_active` column
4. If it's `false` or `NULL`, change it to `true`
5. Save

## Solution 3: Temporarily Remove Filter (For Testing)

If you want to see ALL data regardless of `is_active`, you can temporarily modify the API:

**File: `apps/api/src/routes/public.ts`**
**Line 174:** Change from:
```typescript
is_active: true,
```
To:
```typescript
// is_active: true,  // Temporarily disabled to show all data
```

**But this is NOT recommended for production!** Only use this to verify your data exists.

## Why This Happened

The `is_active` field was likely added in a migration, and:
1. Existing data might have been created with `is_active = false` or `NULL`
2. Or the default value wasn't applied to existing rows
3. Or someone manually set them to `false`

## Verify After Fixing

After updating the data:
1. Restart your API server
2. Test: `http://localhost:3000/api/public/home?city_slug=guangzhou`
3. Check if `top_city_places` now has data
4. Check frontend: `http://localhost:5173` - data should appear!

## Quick Fix Command

If you want to activate everything at once:
```sql
UPDATE city_places SET is_active = true;
UPDATE featured_items SET is_active = true;
UPDATE service_based_offers SET is_active = true;
UPDATE homepage_banners SET is_active = true;
```

**Note:** This will activate ALL items. If you want to be selective, use Prisma Studio instead.








