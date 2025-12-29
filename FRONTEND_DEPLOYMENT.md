# Frontend Deployment Guide

## Current Setup

- **Backend (API)**: Deployed to Railway at `https://bridgechina-production.up.railway.app`
- **Frontend (Web)**: Not yet deployed - needs separate deployment

## Frontend Deployment Options

### Option 1: Railway (Recommended for Simplicity)

Deploy the frontend as a **separate Railway service** in the same project.

#### Steps:

1. **In Railway Dashboard:**
   - Go to your Railway project
   - Click **"+ New"** → **"GitHub Repo"**
   - Select the same repository (`brandchina`)

2. **Configure the Service:**
   - **Root Directory**: Set to `/apps/web`
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm preview` (or use a static file server)

3. **Environment Variables:**
   - `VITE_API_URL`: `https://bridgechina-production.up.railway.app`
   - `NODE_ENV`: `production`

4. **Alternative: Use Static File Server**
   - Install `serve`: `pnpm add -D serve`
   - **Start Command**: `npx serve -s dist -l 3000`

#### Pros:
- ✅ Same platform as backend
- ✅ Easy to manage
- ✅ Automatic deployments

#### Cons:
- ⚠️ Railway charges per service
- ⚠️ Need to configure static file serving

---

### Option 2: Vercel (Recommended for Frontend)

Vercel is optimized for frontend deployments and offers free tier.

#### Steps:

1. **Connect Repository:**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository

2. **Configure Project:**
   - **Root Directory**: `apps/web`
   - **Framework Preset**: Vite
   - **Build Command**: `pnpm install && pnpm build`
   - **Output Directory**: `dist`

3. **Environment Variables:**
   - `VITE_API_URL`: `https://bridgechina-production.up.railway.app`

4. **Deploy:**
   - Vercel auto-detects Vite and configures everything
   - Automatic deployments on every push

#### Pros:
- ✅ Free tier with generous limits
- ✅ Optimized for frontend
- ✅ Automatic HTTPS and CDN
- ✅ Preview deployments for PRs
- ✅ Zero configuration needed

#### Cons:
- ⚠️ Separate platform from backend

---

### Option 3: Netlify

Similar to Vercel, great for static sites.

#### Steps:

1. **Connect Repository:**
   - Go to [netlify.com](https://netlify.com)
   - Import your GitHub repository

2. **Configure Build:**
   - **Base directory**: `apps/web`
   - **Build command**: `pnpm install && pnpm build`
   - **Publish directory**: `apps/web/dist`

3. **Environment Variables:**
   - `VITE_API_URL`: `https://bridgechina-production.up.railway.app`

#### Pros:
- ✅ Free tier
- ✅ Easy setup
- ✅ Automatic deployments

---

### Option 4: Cloudflare Pages

Free and fast CDN.

#### Steps:

1. **Connect Repository:**
   - Go to Cloudflare Dashboard → Pages
   - Connect GitHub repository

2. **Build Settings:**
   - **Framework preset**: Vite
   - **Build command**: `pnpm install && pnpm build`
   - **Build output directory**: `apps/web/dist`
   - **Root directory**: `apps/web`

3. **Environment Variables:**
   - `VITE_API_URL`: `https://bridgechina-production.up.railway.app`

#### Pros:
- ✅ Free
- ✅ Fast global CDN
- ✅ Automatic HTTPS

---

## Recommended: Vercel Setup

Here's a quick setup for Vercel (easiest option):

### 1. Create `vercel.json` in `apps/web/`:

```json
{
  "buildCommand": "pnpm install && pnpm build",
  "outputDirectory": "dist",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "vite"
}
```

### 2. Set Environment Variable in Vercel:
- `VITE_API_URL` = `https://bridgechina-production.up.railway.app`

### 3. Deploy:
- Push to GitHub
- Vercel automatically deploys

---

## Update Frontend Configuration

Make sure your frontend can connect to the Railway backend:

### 1. Update `apps/web/vite.config.ts`:

The proxy is only for development. Production uses `VITE_API_URL`.

### 2. Environment Variables:

Create `.env.production` in `apps/web/` (optional, can set in deployment platform):

```bash
VITE_API_URL=https://bridgechina-production.up.railway.app
```

---

## Quick Start: Deploy to Vercel

1. **Install Vercel CLI** (optional):
   ```bash
   npm i -g vercel
   ```

2. **In `apps/web/` directory:**
   ```bash
   cd apps/web
   vercel
   ```

3. **Follow prompts:**
   - Link to existing project or create new
   - Set `VITE_API_URL` environment variable
   - Deploy!

4. **Or use GitHub integration:**
   - Go to vercel.com
   - Import repository
   - Configure as above
   - Auto-deploys on every push

---

## Testing the Deployment

After deploying frontend:

1. **Test API Connection:**
   - Open browser console on your frontend URL
   - Check network requests to `/api/health`
   - Should connect to Railway backend

2. **Verify CORS:**
   - Make sure `APP_BASE_URL` and `FRONTEND_URL` in Railway include your frontend URL
   - Update Railway environment variables if needed

3. **Test Authentication:**
   - Try logging in
   - Check if cookies are set correctly

---

## Summary

**Current State:**
- ✅ Backend deployed to Railway
- ❌ Frontend not deployed yet

**Recommended Next Steps:**
1. Deploy frontend to **Vercel** (easiest, free, optimized for frontend)
2. Set `VITE_API_URL` environment variable to your Railway backend URL
3. Update Railway CORS settings to allow your frontend domain

**Alternative:**
- Deploy frontend to Railway as separate service (if you prefer keeping everything in one place)

