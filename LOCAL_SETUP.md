# Local Development Setup

## Quick Start

### 1. Start Backend API
```bash
# Terminal 1
pnpm --filter @bridgechina/api dev
```
Backend will run on `http://localhost:3000` (or PORT from .env)

### 2. Start Frontend
```bash
# Terminal 2  
pnpm --filter @bridgechina/web dev
```
Frontend will run on `http://localhost:5173`

### 3. No Configuration Needed!

The Vite proxy is already configured in `apps/web/vite.config.ts`:
- All `/api/*` requests are automatically proxied to `http://localhost:3000`
- No need to set `VITE_API_URL` for local development
- Just make sure both servers are running!

**Note:** If your backend runs on a different port, update `apps/web/vite.config.ts`:
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:YOUR_PORT', // Change this
    changeOrigin: true,
    secure: false,
  },
}
```

## Verify Setup

1. **Check backend is running:**
   - Open: `http://localhost:3001/api/public/home?city_slug=guangzhou`
   - Should return JSON data

2. **Check frontend can reach backend:**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Visit `http://localhost:5173`
   - Check if API requests are being made to `http://localhost:3001/api`

3. **Check browser console:**
   - Look for any CORS errors
   - Look for API errors

## Troubleshooting

### Issue: CORS errors
**Solution:** Make sure backend CORS allows `http://localhost:5173`

### Issue: Network errors
**Solution:** 
- Check backend is running
- Check `VITE_API_URL` in `apps/web/.env.local` matches backend URL
- Check backend port matches the URL

### Issue: 404 errors
**Solution:**
- Check backend routes are registered
- Check the API path is correct (`/api/public/home` not `/public/home`)

### Issue: No data showing
**Solution:**
- Check database has data: `pnpm --filter @bridgechina/api db:studio`
- Run seed: `pnpm --filter @bridgechina/api db:seed`
- Check browser console for API response errors

