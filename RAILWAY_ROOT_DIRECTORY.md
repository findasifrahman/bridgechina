# Railway Root Directory Configuration

## Where to Find Root Directory Setting

The **Root Directory** setting in Railway is located in a different place than Watch Paths:

### Location:

1. **Go to your Railway service** (not the project, but the individual service)
2. Click on the **service name** (e.g., "bridgechina-api" or your frontend service)
3. Go to **Settings** tab (gear icon)
4. Scroll down to **"Deploy"** section
5. Look for **"Root Directory"** or **"Source"** setting

### Alternative Location:

If you don't see it in Settings:
1. Go to your service
2. Click **"Settings"** → **"Source"**
3. You'll see **"Root Directory"** field there

---

## Watch Paths vs Root Directory

### Watch Paths (What you're seeing):
- **Purpose**: Controls which file changes trigger a new deployment
- **Location**: Settings → Watch Paths
- **Example**: `/apps/web/**` means "redeploy if any file in `/apps/web/` changes"
- **Not the same as Root Directory!**

### Root Directory:
- **Purpose**: Tells Railway where your application code is located
- **Location**: Settings → Source → Root Directory
- **Example**: `/apps/web` means "build and run from the `apps/web` folder"
- **This is what you need to set!**

---

## For Your Frontend Deployment

### Setting Root Directory for Frontend:

1. **Create a new Railway service** for your frontend
2. **In the service settings:**
   - **Root Directory**: `/apps/web`
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `npx serve -s dist -l $PORT` (or use a static file server)

### Watch Paths (Optional but Recommended):

Add these watch paths so Railway only redeploys when frontend code changes:
- `/apps/web/**` - Watch all frontend files
- `/packages/ui/**` - Watch UI components (if used by frontend)
- `/packages/shared/**` - Watch shared code (if used by frontend)

**Don't add:**
- `/apps/api/**` - This would trigger frontend redeploy when backend changes (not needed)

---

## Current Backend Service

For your **backend service** (already deployed):
- **Root Directory**: Should be empty or `/` (root of repo)
- **Watch Paths**: `/apps/api/**` (only redeploy when API code changes)

---

## Quick Setup for Frontend

### Step 1: Create New Service
1. In Railway project → Click **"+ New"**
2. Select **"GitHub Repo"**
3. Choose your `brandchina` repository

### Step 2: Configure Service
1. Go to **Settings** → **Source**
2. Set **Root Directory**: `/apps/web`
3. Go to **Settings** → **Deploy**
4. Set **Build Command**: `pnpm install && pnpm build`
5. Set **Start Command**: `npx serve -s dist -l $PORT`

### Step 3: Add Watch Paths (Optional)
1. Go to **Settings** → **Watch Paths**
2. Add: `/apps/web/**`
3. Add: `/packages/ui/**` (if frontend uses UI package)
4. Add: `/packages/shared/**` (if frontend uses shared package)

### Step 4: Environment Variables
1. Go to **Variables** tab
2. Add: `VITE_API_URL` = `https://bridgechina-production.up.railway.app`
3. Add: `NODE_ENV` = `production`

---

## Visual Guide

```
Railway Service Settings:
├── General
│   └── Service name, etc.
├── Source  ← ROOT DIRECTORY IS HERE
│   ├── Repository
│   ├── Branch
│   └── Root Directory  ← SET THIS TO /apps/web
├── Deploy
│   ├── Build Command
│   └── Start Command
├── Variables
│   └── Environment variables
└── Watch Paths  ← THIS IS DIFFERENT (for triggering deploys)
    └── File change patterns
```

---

## Summary

- **Root Directory**: Settings → Source → Root Directory (set to `/apps/web` for frontend)
- **Watch Paths**: Settings → Watch Paths (optional, for smart redeployments)
- **They are different settings with different purposes!**

