# Railway Frontend Build Fix

## Problem

Railway was using `npm` instead of `pnpm`, causing this error:
```
npm error Unsupported URL Type "workspace:": workspace:*
```

This happens because npm doesn't understand pnpm's `workspace:*` protocol.

## Solution

Created configuration files to force Railway to use `pnpm`:

### Files Created:

1. **`apps/web/.nixpacks.toml`** - Tells Railway to use pnpm
2. **`apps/web/railway.toml`** - Railway-specific configuration
3. **Updated `apps/web/package.json`** - Added start script

## Railway Service Configuration

### In Railway Dashboard:

1. **Root Directory**: `/apps/web` (set in Settings → Source)

2. **Build Command** (auto-detected from `railway.toml`):
   ```bash
   cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @bridgechina/web build
   ```

3. **Start Command** (auto-detected from `railway.toml`):
   ```bash
   npx serve -s dist -l $PORT
   ```

4. **Environment Variables**:
   - `VITE_API_URL` = `https://bridgechina-production.up.railway.app`
   - `NODE_ENV` = `production`

## How It Works

1. Railway sets working directory to `/apps/web` (root directory)
2. Build command goes up to monorepo root (`cd ../..`)
3. Installs all dependencies with pnpm (respects workspace protocol)
4. Builds only the frontend (`pnpm --filter @bridgechina/web build`)
5. Output goes to `apps/web/dist/`
6. Start command serves from `dist/` directory

## Verification

After deployment, check:
- ✅ Build completes without npm errors
- ✅ Static files are served correctly
- ✅ Frontend connects to backend API
- ✅ CORS is configured correctly

## Alternative: Manual Configuration

If Railway doesn't auto-detect the config files, manually set in Railway dashboard:

**Settings → Deploy:**
- Build Command: `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @bridgechina/web build`
- Start Command: `npx serve -s dist -l $PORT`

**Settings → Source:**
- Root Directory: `/apps/web`

