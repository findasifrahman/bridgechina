# Railway Frontend Not Loading - Debug Guide

## Problem
Frontend service returns 200 OK but doesn't load the frontend content.

## Possible Causes

1. **Dist folder missing or empty** - Build didn't create dist or it's in wrong location
2. **Serve command not finding dist** - Working directory issue
3. **SPA routing issue** - Vue Router needs proper configuration
4. **Missing index.html** - Build output incomplete

## Debug Steps

### Step 1: Check Build Logs

In Railway Dashboard → Frontend Service → Deploy Logs:

Look for:
- ✅ `vite build` command executed
- ✅ `dist/` folder created
- ✅ Build completed successfully
- ❌ Any errors about missing files

### Step 2: Check Deployment Logs

In Railway Dashboard → Frontend Service → Deploy Logs (after start):

Look for:
- ✅ "Dist folder contents:" - Should list files
- ✅ "Starting serve on port XXXX"
- ✅ "Serving from: /app/apps/web/dist"
- ❌ "ERROR: dist folder not found!"
- ❌ "ERROR: dist/index.html not found!"

### Step 3: Verify Root Directory

1. Go to **Settings → Deploy**
2. **Root Directory** should be: `.` (repo root)
3. NOT `apps/web`

### Step 4: Check Build Output Location

The build should create:
- `apps/web/dist/index.html`
- `apps/web/dist/assets/` (JS, CSS files)

If these don't exist, the build failed.

### Step 5: Test the Serve Command

The start script now includes debugging. Check deployment logs for:
- Current directory
- Dist folder contents
- Any error messages

## Quick Fixes

### Fix 1: Verify Build Completed

If build logs show errors, fix them first. The dist folder must exist for serve to work.

### Fix 2: Check Serve Command

The start script uses:
```bash
serve -s dist -l ${PORT:-3000}
```

The `-s` flag enables SPA mode (serves index.html for all routes).

### Fix 3: Verify File Structure

After build, you should have:
```
apps/web/dist/
  ├── index.html
  ├── assets/
  │   ├── index-*.js
  │   └── index-*.css
  └── vite.svg (if exists)
```

### Fix 4: Manual Test

If you can SSH into Railway (if available), check:
```bash
cd apps/web
ls -la dist/
cat dist/index.html
```

## Updated Configuration

I've updated:
1. Added `serve` as devDependency
2. Created `start.sh` script with debugging
3. Updated start commands to use the script

## Next Steps

1. **Commit and push:**
   ```bash
   git add .
   git commit -m "Add serve dependency and debug start script"
   git push
   ```

2. **Redeploy on Railway**

3. **Check deployment logs** for the debug output

4. **If dist folder is missing:**
   - Check build logs for errors
   - Verify root directory is `.` (repo root)
   - Verify build command runs successfully

5. **If dist exists but serve fails:**
   - Check the error message in deployment logs
   - Verify PORT environment variable is set
   - Check that serve package is installed

