# Railway Frontend: Manual Configuration Required

## Problem

Railway is auto-detecting and using `npm` instead of `pnpm`. Even with configuration files, Railway might still use npm.

## Solution: Manual Configuration in Railway Dashboard

Since Railway's auto-detection is using npm, you need to **manually configure** the build command in Railway dashboard.

### Step-by-Step:

1. **Go to Railway Dashboard:**
   - Open your frontend service
   - Click **Settings** tab

2. **Set Root Directory:**
   - Go to **Settings → Source**
   - Set **Root Directory**: `/apps/web`

3. **Set Build Command (IMPORTANT):**
   - Go to **Settings → Deploy**
   - Find **"Build Command"** field
   - **Clear any auto-detected command**
   - **Manually enter:**
     ```bash
     cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @bridgechina/web build
     ```
   - This explicitly uses `pnpm` instead of letting Railway auto-detect

4. **Set Start Command:**
   - In **Settings → Deploy**
   - Set **Start Command**:
     ```bash
     npx serve -s dist -l $PORT
     ```

5. **Environment Variables:**
   - Go to **Variables** tab
   - Add:
     - `VITE_API_URL` = `https://bridgechina-production.up.railway.app`
     - `NODE_ENV` = `production`

6. **Save and Redeploy:**
   - Click **Save** or **Redeploy**
   - Railway will now use your manual build command with pnpm

## Why This Works

By manually setting the build command, you bypass Railway's auto-detection that was choosing npm. The command explicitly:
1. Goes to monorepo root (`cd ../..`)
2. Uses `pnpm` (not npm)
3. Installs dependencies
4. Builds only the frontend

## Alternative: Use Railway CLI

If you prefer command line:

```bash
railway variables set BUILD_COMMAND="cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @bridgechina/web build"
railway variables set START_COMMAND="npx serve -s dist -l $PORT"
```

## Verification

After redeploy, check build logs:
- ✅ Should see: `pnpm install` (not `npm install`)
- ✅ Should see: `Using pnpm version X.X.X`
- ✅ Build completes successfully
- ✅ No "workspace:*" errors

