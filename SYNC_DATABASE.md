# Sync Database with Prisma Schema

## Current Status
✅ Database schema is already in sync with Prisma schema (verified with `db:push`)

## If You Need to Sync Again

### Option 1: Push Schema Changes (Recommended)
```bash
# This will update your database to match the Prisma schema
pnpm --filter @bridgechina/api db:push
```

**Note:** If you get permission errors, stop the API server first:
1. Stop the running API server (Ctrl+C)
2. Run `pnpm --filter @bridgechina/api db:push`
3. Restart the API server

### Option 2: Use Migrations
```bash
# Create a new migration
pnpm --filter @bridgechina/api db:migrate

# Or apply existing migrations
pnpm --filter @bridgechina/api db:migrate:deploy
```

## Check Database Data

### Method 1: Check via Script
```bash
# Stop API server first, then:
pnpm --filter @bridgechina/api db:check
```

This will show:
- How many featured items are in the database
- How many offers are active
- How many banners are active
- Sample data from each table

### Method 2: Use Prisma Studio (Visual)
```bash
# Stop API server first, then:
pnpm --filter @bridgechina/api db:studio
```

This opens a web interface at `http://localhost:5555` where you can:
- Browse all tables
- View/edit data
- See relationships

## Regenerate Prisma Client

If you get permission errors, stop the API server first:
```bash
# 1. Stop API server (Ctrl+C in the terminal running it)
# 2. Then run:
pnpm --filter @bridgechina/api db:generate
# 3. Restart API server
```

## Verify Data is Accessible

After syncing, test if the API can read the data:

1. **Start API server:**
   ```bash
   pnpm --filter @bridgechina/api dev
   ```

2. **Test endpoint:**
   Open in browser: `http://localhost:3000/api/public/home?city_slug=guangzhou`
   
   Should return JSON with:
   - `featured_items_by_type` (object with arrays)
   - `top_hotels` (array)
   - `hot_products` (array)
   - etc.

3. **Check browser console:**
   - Open frontend: `http://localhost:5173`
   - Open DevTools (F12) → Network tab
   - Look for `/api/public/home` request
   - Check the response - does it have data?

## Common Issues

### Issue: Permission Error (EPERM)
**Solution:** Stop the API server, then run the command again

### Issue: Schema Out of Sync
**Solution:** Run `pnpm --filter @bridgechina/api db:push --accept-data-loss`

### Issue: Data Not Showing
**Possible causes:**
1. Data exists but `is_active = false` - check in Prisma Studio
2. Wrong city slug - check what cities exist in database
3. API not querying correctly - check API logs

### Issue: Prisma Client Out of Date
**Solution:** 
1. Stop API server
2. Run `pnpm --filter @bridgechina/api db:generate`
3. Restart API server

## Quick Diagnostic

Run this to see what data exists:
```bash
# Stop API server first!
pnpm --filter @bridgechina/api db:check
```

This will show you exactly what data is in your database and if Prisma can access it.

