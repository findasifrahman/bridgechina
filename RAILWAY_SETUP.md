# Railway Deployment Guide

This guide explains how to deploy the BridgeChina monorepo to Railway.

## Prerequisites

1. Railway account (https://railway.app)
2. GitHub repository connected to Railway
3. PostgreSQL database service in Railway
4. Environment variables configured

## Setup Steps

### 1. Create Railway Project

1. Go to Railway dashboard
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository

### 2. Add PostgreSQL Database

1. In your Railway project, click "New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will automatically create a `DATABASE_URL` environment variable

### 3. Configure Environment Variables

In Railway, go to your service → Variables tab and add:

#### Required Variables

```bash
# Database (automatically set by Railway PostgreSQL service)
DATABASE_URL=<automatically set by Railway>

# JWT Secrets (generate secure random strings, min 32 chars)
JWT_ACCESS_SECRET=<generate-secure-random-string>
JWT_REFRESH_SECRET=<generate-secure-random-string>
JWT_ACCESS_EXPIRES=12h
JWT_REFRESH_EXPIRES=14d

# Application
APP_BASE_URL=<your-frontend-url>
FRONTEND_URL=<your-frontend-url>  # Same as APP_BASE_URL
PORT=3000  # Railway sets this automatically, but good to have
NODE_ENV=production
```

#### Optional Variables (for full functionality)

```bash
# Cloudflare R2 (for image uploads)
R2_ACCOUNT_ID=<your-cloudflare-account-id>
R2_ACCESS_KEY_ID=<your-r2-access-key>
R2_SECRET_ACCESS_KEY=<your-r2-secret-key>
R2_BUCKET=<your-r2-bucket-name>
R2_PUBLIC_BASE_URL=<your-r2-public-url>
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com

# TMAPI 1688 Shopping Integration
TMAPI_BASE_URL=https://api.tmapi.top
TMAPI_API_16688_TOKEN=<your-tmapi-token>
```

### 4. Configure Build Settings

Railway will automatically detect the monorepo structure. The `railway.toml` file configures:

- **Build Command**: `pnpm install && pnpm --filter @bridgechina/api db:generate && pnpm --filter @bridgechina/api build`
- **Start Command**: `cd apps/api && pnpm start`

### 5. Deploy Database Migrations

After the first deployment, you need to run migrations:

**Option A: Via Railway CLI**
```bash
railway run pnpm --filter @bridgechina/api prisma migrate deploy
railway run pnpm --filter @bridgechina/api db:seed
```

**Option B: Via Railway Dashboard**
1. Go to your service → Deployments
2. Click on the latest deployment
3. Open the shell/terminal
4. Run:
```bash
cd apps/api
pnpm prisma migrate deploy
pnpm db:seed
```

### 6. Deploy Frontend (Separate Service)

For the frontend, you have two options:

#### Option A: Deploy as Separate Railway Service (Recommended)

1. In Railway, create a new service
2. Connect to the same GitHub repo
3. Set root directory to `/apps/web`
4. Configure build:
   - **Build Command**: `pnpm install && pnpm --filter @bridgechina/web build`
   - **Start Command**: `pnpm --filter @bridgechina/web preview`
5. Set environment variable:
   - `VITE_API_URL=<your-backend-railway-url>`

#### Option B: Serve Frontend from API (Simpler)

1. Build frontend and serve static files from Fastify
2. Update `apps/api/src/index.ts` to serve static files
3. This is more complex but keeps everything in one service

## Environment Variables Reference

### Generating JWT Secrets

```bash
# Generate secure random strings (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run this twice to get two different secrets for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.

### Getting R2 Credentials

1. Go to Cloudflare Dashboard → R2
2. Click "Manage R2 API Tokens"
3. Create "S3 API Token"
4. Copy `ACCESS_KEY_ID` and `SECRET_ACCESS_KEY`
5. Get your `ACCOUNT_ID` from Cloudflare dashboard URL or account settings

## Troubleshooting

### Build Fails

- Check that `pnpm` is available (Railway should auto-detect)
- Verify all dependencies are in `package.json`
- Check build logs in Railway dashboard

### Database Connection Issues

- Verify `DATABASE_URL` is set correctly
- Check that PostgreSQL service is running
- Ensure migrations have been run

### CORS Errors

- Verify `APP_BASE_URL` and `FRONTEND_URL` are set to your frontend URL
- Check that the frontend is making requests to the correct backend URL
- Review CORS configuration in `apps/api/src/index.ts`

### Port Issues

- Railway automatically sets `PORT` environment variable
- Your app should use `process.env.PORT || 3000`
- Don't hardcode port numbers

## Monitoring

- Check Railway dashboard for logs
- Use Railway's built-in metrics
- Set up alerts for deployment failures

## Continuous Deployment

Railway automatically deploys on every push to your main branch (if configured).

To disable auto-deploy:
1. Go to service settings
2. Disable "Auto Deploy"

## Manual Deployment

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy
railway up
```

## Next Steps

1. Set up custom domain in Railway
2. Configure SSL (automatic with Railway)
3. Set up monitoring and alerts
4. Configure backup strategy for database
5. Set up staging environment

