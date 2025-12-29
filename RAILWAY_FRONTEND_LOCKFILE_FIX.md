# Railway Frontend: pnpm-lock.yaml Not Found Fix

## Problem

Railway error:
```
ERR_PNPM_NO_LOCKFILE  Cannot install with "frozen-lockfile" because pnpm-lock.yaml is absent
```

This happens because:
- Railway sets root directory to `/apps/web`
- `pnpm-lock.yaml` is in the repository root (not in `/apps/web/`)
- Build command runs from `/apps/web/` directory

## Solution

The build command must **go to the monorepo root first** before running `pnpm install`.

### Updated Configuration

**`apps/web/.nixpacks.toml`** and **`apps/web/railway.toml`** now use:
```bash
cd ../.. && pnpm install --frozen-lockfile
```

This:
1. Changes to monorepo root (`cd ../..` from `/apps/web/`)
2. Finds `pnpm-lock.yaml` in root
3. Installs all dependencies correctly

## Railway Dashboard Configuration

### Build Command (in Railway Dashboard):

**Settings → Deploy → Build Command:**
```bash
cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @bridgechina/web build
```

**OR** if Railway auto-detects from `railway.toml`, it should use:
```bash
cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @bridgechina/web build
```

### Start Command:

**Settings → Deploy → Start Command:**
```bash
npx serve -s dist -l $PORT
```

## How It Works

1. Railway sets working directory to `/apps/web/` (root directory)
2. Build command goes up 2 levels: `cd ../..` → monorepo root
3. `pnpm install` finds `pnpm-lock.yaml` in root
4. Installs all workspace dependencies
5. Builds only frontend: `pnpm --filter @bridgechina/web build`
6. Output in `apps/web/dist/`
7. Serve from `dist/` directory

## Verification

After deployment, check build logs:
- ✅ Should see: `cd ../..`
- ✅ Should see: `pnpm install --frozen-lockfile`
- ✅ Should see: `Lockfile is up to date`
- ✅ Should see: `pnpm --filter @bridgechina/web build`
- ✅ Build completes successfully

