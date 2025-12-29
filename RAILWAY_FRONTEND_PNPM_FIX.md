# Railway Frontend: Force pnpm Usage

## Problem

Railway is using `npm` instead of `pnpm`, causing:
```
npm error Unsupported URL Type "workspace:": workspace:*
```

## Solution

Railway needs to detect pnpm. We've added:

1. **`packageManager` field** in `apps/web/package.json`
2. **`.nixpacks.toml`** in `apps/web/` to force pnpm
3. **Removed buildCommand from railway.toml** (let .nixpacks.toml handle it)

## Railway Configuration

### In Railway Dashboard:

**Settings → Source:**
- Root Directory: `/apps/web`

**Settings → Deploy:**
- Start Command: `npx serve -s dist -l $PORT`
- Build Command: (leave empty - .nixpacks.toml handles it)

**OR manually set Build Command:**
```bash
cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @bridgechina/web build
```

## How Railway Detects pnpm

Railway will detect pnpm if:
1. ✅ `packageManager` field exists in package.json
2. ✅ `pnpm-lock.yaml` exists in the repository root
3. ✅ `.nixpacks.toml` specifies pnpm

## Verification

After deployment, check build logs:
- Should see: `pnpm install` (not `npm install`)
- Should see: `Using pnpm version X.X.X`
- Build should complete successfully

## If Still Using npm

If Railway still uses npm after these changes:

1. **Check Railway Service Settings:**
   - Go to Settings → Source
   - Ensure Root Directory is `/apps/web`
   - Railway should detect `.nixpacks.toml` in that directory

2. **Manual Override:**
   - In Railway dashboard → Settings → Deploy
   - Set Build Command explicitly:
     ```bash
     cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @bridgechina/web build
     ```

3. **Check for pnpm-lock.yaml:**
   - Ensure `pnpm-lock.yaml` exists in repository root
   - Commit it if missing: `git add pnpm-lock.yaml && git commit -m "Add pnpm-lock.yaml"`

