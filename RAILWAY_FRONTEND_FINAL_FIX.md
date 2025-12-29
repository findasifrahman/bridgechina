# Railway Frontend: Final Fix for pnpm-lock.yaml Issue

## Problem

Railway is running `pnpm i --frozen-lockfile` from `/apps/web/` directory, but `pnpm-lock.yaml` is in the repository root. This causes:
```
ERR_PNPM_NO_LOCKFILE  Cannot install with "frozen-lockfile" because pnpm-lock.yaml is absent
```

## Root Cause

Railway's Nixpacks is **auto-detecting** and running install **before** reading our custom `.nixpacks.toml` phases. It runs from the root directory (`/apps/web/`) without going to the monorepo root first.

## Solution: Manual Configuration Required

Railway's auto-detection cannot be fully overridden via config files. You **must manually set** the build command in Railway dashboard.

### Step-by-Step Fix:

1. **Go to Railway Dashboard:**
   - Open your frontend service
   - Click **Settings** → **Deploy**

2. **Set Install Command (if available):**
   - Look for **"Install Command"** or **"Install"** field
   - Set to: `cd ../.. && pnpm install --frozen-lockfile`
   - This ensures install runs from monorepo root

3. **Set Build Command:**
   - Find **"Build Command"** field
   - Clear any auto-detected command
   - Set to: `cd ../.. && pnpm --filter @bridgechina/web build`
   - OR combine: `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @bridgechina/web build`

4. **Set Start Command:**
   - Set to: `npx serve -s dist -l $PORT`

5. **Save and Redeploy**

## Alternative: Use Railway CLI

If you have Railway CLI installed:

```bash
# Link to your project
railway link

# Set build command
railway variables set RAILWAY_BUILD_COMMAND="cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @bridgechina/web build"

# Set start command  
railway variables set RAILWAY_START_COMMAND="npx serve -s dist -l $PORT"
```

## Why Manual Configuration is Needed

Railway's Nixpacks builder:
1. Auto-detects package manager (finds pnpm ✅)
2. Auto-runs install from root directory (`/apps/web/`) ❌
3. Then reads `.nixpacks.toml` for custom phases

By manually setting the build command, we bypass the auto-install and ensure everything runs from the monorepo root.

## Verification

After setting manual commands, check build logs:
- ✅ Should see: `cd ../..`
- ✅ Should see: `pnpm install --frozen-lockfile` (from root)
- ✅ Should see: `Lockfile is up to date`
- ✅ Should see: `pnpm --filter @bridgechina/web build`
- ✅ Build completes successfully

## Files Created (for reference, but manual config is required)

- `apps/web/.nixpacks.toml` - Nixpacks config (may not be fully respected)
- `apps/web/railway.toml` - Railway config (buildCommand should work)
- `apps/web/nixpacks.toml` - Alternative filename (Railway might check this)

**However, you still need to manually set the commands in Railway dashboard for guaranteed success.**

