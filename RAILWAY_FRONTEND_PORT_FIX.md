# Railway Frontend Port Configuration Fix

## Problem

Frontend service deployed successfully but web doesn't open. Railway asked for port but wasn't provided.

## Solution

### Step 1: Verify Port Configuration in Railway Dashboard

1. **Go to Railway Dashboard:**
   - Open your frontend service
   - Click **Settings** → **Networking**

2. **Check Port Configuration:**
   - Railway should automatically assign a port (usually shown in the Networking section)
   - The `$PORT` environment variable is automatically set by Railway
   - If you see a port number (e.g., `8080`), note it down

3. **Verify Start Command:**
   - Go to **Settings** → **Deploy**
   - **Custom Start Command** should be: `cd apps/web && pnpm start`
   - This uses the `start` script which reads `$PORT` from environment

### Step 2: Manual Port Configuration (If Needed)

If Railway doesn't automatically set the port:

1. **Go to Settings → Variables:**
   - Add environment variable: `PORT` = `8080` (or any port Railway assigns)
   - Railway usually assigns ports automatically, but you can set it manually

2. **Or in Networking Section:**
   - Look for "Port" field
   - Set it to `8080` (or the port Railway shows)

### Step 3: Verify Build Output

Make sure the `dist` folder exists after build:

1. **Check Build Logs:**
   - Should see: `vite build` completing successfully
   - Should see: `dist/` folder created

2. **If dist folder is missing:**
   - The build might have failed
   - Check build logs for errors
   - Ensure root directory is set to `.` (repo root)

### Step 4: Test the Service

1. **Check Deployment Logs:**
   - Should see: `Serving!`
   - Should see: `Local: http://localhost:XXXX` (where XXXX is the port)
   - Should NOT see errors about port or missing files

2. **Access the Domain:**
   - Use the Railway-generated domain (e.g., `your-service.up.railway.app`)
   - Should load the frontend application

## Troubleshooting

### Issue: "Port already in use" or "Cannot bind to port"

**Solution:**
- Railway automatically assigns ports
- Don't manually set `PORT` if Railway already provides it
- Remove any manual `PORT` environment variable if it conflicts

### Issue: "dist folder not found"

**Solution:**
1. Check that build completed successfully
2. Verify root directory is `.` (repo root), not `apps/web`
3. Build command should be: `pnpm install --frozen-lockfile && pnpm --filter @bridgechina/web build`
4. After build, `dist` should be at `apps/web/dist`

### Issue: "serve command not found"

**Solution:**
- The `start` script uses `npx serve` which should work
- If it doesn't, install `serve` as a dependency:
  ```bash
  pnpm add -D serve
  ```
- Then update start script to: `serve -s dist -l ${PORT:-3000}`

### Issue: Service starts but returns 502 Bad Gateway

**Solution:**
1. Check that the service is actually running (check deployment logs)
2. Verify the port matches what Railway expects
3. Check that `dist` folder contains `index.html`
4. Ensure the start command is correct: `cd apps/web && pnpm start`

## Files Changed

1. `apps/web/package.json`:
   - Added `start` script: `npx serve -s dist -l ${PORT:-3000}`
   - Uses `$PORT` from environment, defaults to 3000 if not set

2. `apps/web/railway.toml`:
   - Updated start command to use `pnpm start`

3. `apps/web/.nixpacks.toml`:
   - Updated start command to use `pnpm start`

## Verification Checklist

- [ ] Root directory set to `.` (repo root) in Railway
- [ ] Build command: `pnpm install --frozen-lockfile && pnpm --filter @bridgechina/web build`
- [ ] Start command: `cd apps/web && pnpm start`
- [ ] Build completes successfully (check logs)
- [ ] `dist` folder exists at `apps/web/dist` after build
- [ ] Deployment logs show "Serving!" message
- [ ] No port binding errors in logs
- [ ] Frontend domain loads successfully

## Next Steps

1. **Commit the changes:**
   ```bash
   git add apps/web/package.json apps/web/railway.toml apps/web/.nixpacks.toml
   git commit -m "Fix frontend start command to use pnpm start script"
   git push
   ```

2. **Redeploy on Railway:**
   - Railway will automatically redeploy on push
   - Or manually trigger redeploy from dashboard

3. **Verify:**
   - Check deployment logs for "Serving!" message
   - Access the Railway domain
   - Frontend should load successfully

