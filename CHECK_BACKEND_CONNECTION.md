# Backend Connection Status

## Current Configuration

### Frontend (localhost:5173)
- **Axios baseURL**: Uses `VITE_API_URL` if set, otherwise empty string (uses Vite proxy)
- **Vite Proxy**: Configured to proxy `/api/*` requests to `http://localhost:3000`

### What This Means

**If `VITE_API_URL` is NOT set (current state):**
- ✅ Frontend uses **LOCAL backend** via Vite proxy
- All `/api/*` requests go to `http://localhost:3000`
- **You need to run the backend locally on port 3000**

**If `VITE_API_URL` is set (e.g., to Railway URL):**
- Frontend uses **Railway backend**
- All `/api/*` requests go directly to Railway
- Local backend not needed

## How to Check What You're Using

### Method 1: Check Browser DevTools
1. Open `http://localhost:5173`
2. Open DevTools (F12) → Network tab
3. Look for API requests (e.g., `/api/public/home`)
4. Check the request URL:
   - If it shows `http://localhost:5173/api/...` → Using **LOCAL backend** (Vite proxy)
   - If it shows `https://bridgechina-production.up.railway.app/api/...` → Using **Railway backend**

### Method 2: Check Environment Variables
```bash
# Check if VITE_API_URL is set
echo $VITE_API_URL  # Linux/Mac
# or check in apps/web/.env.local or apps/web/.env
```

### Method 3: Check Console Logs
The axios interceptor will show errors if backend is not reachable.

## Current Setup (Based on Code)

**You are using LOCAL backend** because:
1. No `.env` file found in `apps/web/`
2. `vite.config.ts` has proxy to `localhost:3000`
3. `axios.ts` uses empty baseURL (which triggers Vite proxy)

## To Use Local Backend (Current Setup)

1. **Start backend locally:**
   ```bash
   pnpm --filter @bridgechina/api dev
   ```
   Should run on `http://localhost:3000`

2. **Start frontend:**
   ```bash
   pnpm --filter @bridgechina/web dev
   ```
   Runs on `http://localhost:5173`

3. **Verify connection:**
   - Check backend: `http://localhost:3000/api/public/home`
   - Check frontend: `http://localhost:5173` (should load data)

## To Use Railway Backend Instead

Create `apps/web/.env.local`:
```env
VITE_API_URL=https://bridgechina-production.up.railway.app/api
```

Then restart the frontend dev server.

## Troubleshooting

### Issue: "Network error" or "Connection refused"
**Cause:** Local backend not running
**Solution:** Start backend with `pnpm --filter @bridgechina/api dev`

### Issue: Data not loading but backend is running
**Cause:** Backend might be using Railway database, not local database
**Solution:** Check `apps/api/.env` - `DATABASE_URL` should point to your local database

### Issue: Want to switch to Railway
**Solution:** Create `apps/web/.env.local` with `VITE_API_URL=https://your-railway-url/api`

