# Troubleshooting: Database Data Not Loading

## ✅ Completed Fixes

1. **Added `db:push` script** - Now you can run `pnpm --filter @bridgechina/api db:push`
2. **Fixed axios baseURL** - Now uses `VITE_API_URL` environment variable
3. **Added `hot_products` to `/home` endpoint** - Shopping tab will now work
4. **Database schema verified** - Schema is in sync with database

## 🔍 Diagnostic Steps

### Step 1: Check Environment Variables

**Frontend (Vercel):**
- Make sure `VITE_API_URL` is set to your Railway backend URL
- Example: `VITE_API_URL=https://bridgechina-production.up.railway.app/api`

**Backend (Railway):**
- Make sure `DATABASE_URL` is set correctly
- Check `apps/api/.env` file

### Step 2: Verify Database Has Data

Run Prisma Studio to check:
```bash
pnpm --filter @bridgechina/api db:studio
```

Check these tables have data:
- `featured_items` - Should have entries with `is_active = true`
- `service_based_offers` - Should have active offers  
- `homepage_banners` - Should have banners with `is_active = true`
- `media_assets` - Should have images
- `external_hot_items` - Should have pinned items for shopping

### Step 3: Test API Endpoints Directly

Test these endpoints in your browser or Postman:

1. **Homepage data:**
   ```
   GET https://bridgechina-production.up.railway.app/api/public/home?city_slug=guangzhou
   ```
   Should return: `top_hotels`, `top_restaurants`, `featured_items_by_type`, `hot_products`, etc.

2. **Offers:**
   ```
   GET https://bridgechina-production.up.railway.app/api/public/offers
   ```
   Should return array of active offers

3. **Banners:**
   ```
   GET https://bridgechina-production.up.railway.app/api/public/banners
   ```
   Should return array of active banners

### Step 4: Check Browser Console

Open browser DevTools (F12) and check:
- **Console tab** - Look for API errors
- **Network tab** - Check if API requests are being made and what responses you get

### Step 5: Compare with Backup

If your backup works but current doesn't:

1. **Compare Prisma schemas:**
   - Backup: `apps/api/prisma/schema.prisma`
   - Current: `apps/api/prisma/schema.prisma`
   - Are they different?

2. **Compare API routes:**
   - Backup: `apps/api/src/routes/public.ts` (especially `/home` endpoint)
   - Current: `apps/api/src/routes/public.ts`
   - Are the responses different?

3. **Compare environment variables:**
   - Backup `.env` files
   - Current `.env` files
   - Are they the same?

## 🚨 Common Issues & Solutions

### Issue: "Network error" in browser console
**Solution:** Check `VITE_API_URL` is set correctly in Vercel

### Issue: API returns empty arrays
**Solution:** 
1. Check database has data (use Prisma Studio)
2. Run `pnpm --filter @bridgechina/api db:seed` to populate data

### Issue: API returns 404
**Solution:** 
1. Check backend is running on Railway
2. Check API routes are registered correctly
3. Verify the URL path is correct

### Issue: CORS errors
**Solution:** 
1. Check backend CORS settings in `apps/api/src/index.ts`
2. Make sure Vercel URL is in allowed origins

## 📝 Next Steps

1. **Check Vercel environment variables:**
   - Go to Vercel project settings
   - Check `VITE_API_URL` is set to your Railway backend

2. **Check Railway backend:**
   - Verify backend is running
   - Check logs for errors
   - Verify `DATABASE_URL` is set

3. **Test locally:**
   ```bash
   # Terminal 1: Start backend
   pnpm --filter @bridgechina/api dev
   
   # Terminal 2: Start frontend
   pnpm --filter @bridgechina/web dev
   ```
   Then test if data loads locally

4. **If still not working:**
   - Share browser console errors
   - Share API response from Network tab
   - Share Railway backend logs

