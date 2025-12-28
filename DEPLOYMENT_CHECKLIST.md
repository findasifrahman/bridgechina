# Railway Deployment Checklist

Use this checklist to ensure your Railway deployment is properly configured.

## Pre-Deployment

- [ ] Repository is pushed to GitHub
- [ ] Railway project is created and connected to GitHub repo
- [ ] PostgreSQL database service is added to Railway project
- [ ] All environment variables are configured in Railway dashboard

## Required Environment Variables

### Database
- [ ] `DATABASE_URL` - Automatically set by Railway PostgreSQL service

### Authentication
- [ ] `JWT_ACCESS_SECRET` - Secure random string (32+ characters)
- [ ] `JWT_REFRESH_SECRET` - Secure random string (32+ characters)
- [ ] `JWT_ACCESS_EXPIRES` - e.g., "12h"
- [ ] `JWT_REFRESH_EXPIRES` - e.g., "14d"

### Application
- [ ] `APP_BASE_URL` - Your frontend URL (e.g., https://yourdomain.com)
- [ ] `FRONTEND_URL` - Same as APP_BASE_URL
- [ ] `NODE_ENV` - Set to "production"
- [ ] `PORT` - Railway sets this automatically, but can be set to 3000

### Optional (for full functionality)
- [ ] `R2_ACCOUNT_ID` - Cloudflare R2 account ID
- [ ] `R2_ACCESS_KEY_ID` - Cloudflare R2 access key
- [ ] `R2_SECRET_ACCESS_KEY` - Cloudflare R2 secret key
- [ ] `R2_BUCKET` - R2 bucket name
- [ ] `R2_PUBLIC_BASE_URL` - Public URL for R2 assets
- [ ] `R2_ENDPOINT` - R2 endpoint URL
- [ ] `TMAPI_BASE_URL` - TMAPI base URL (default: https://api.tmapi.top)
- [ ] `TMAPI_API_16688_TOKEN` - TMAPI API token

## Build Configuration

- [ ] `railway.toml` exists in root directory
- [ ] `.nixpacks.toml` exists (optional, helps with build detection)
- [ ] `Procfile` exists (optional, for Heroku-style deployment)

## Database Setup

- [ ] Run migrations: `pnpm --filter @bridgechina/api prisma migrate deploy`
- [ ] Seed database (first time only): `pnpm --filter @bridgechina/api db:seed`

## Post-Deployment

- [ ] Verify health endpoint: `https://your-api-url.railway.app/health`
- [ ] Test API endpoints
- [ ] Verify CORS is working (test from frontend)
- [ ] Check Railway logs for errors
- [ ] Verify database connection
- [ ] Test authentication flow

## Frontend Configuration

If deploying frontend separately:

- [ ] Create new Railway service for frontend
- [ ] Set root directory to `/apps/web`
- [ ] Configure build command: `pnpm install && pnpm --filter @bridgechina/web build`
- [ ] Configure start command: `pnpm --filter @bridgechina/web preview`
- [ ] Set `VITE_API_URL` environment variable to backend URL

## Troubleshooting

### Build Fails
- Check Railway build logs
- Verify `pnpm-lock.yaml` is committed
- Check Node.js version (should be >= 18)
- Verify all dependencies are in package.json

### Database Connection Fails
- Verify `DATABASE_URL` is set correctly
- Check PostgreSQL service is running
- Verify migrations have been run

### CORS Errors
- Verify `APP_BASE_URL` and `FRONTEND_URL` are set
- Check CORS configuration in `apps/api/src/index.ts`
- Ensure frontend is making requests to correct backend URL

### Port Issues
- Railway sets `PORT` automatically
- Don't hardcode port numbers
- Use `process.env.PORT || 3000`

## Generating JWT Secrets

```bash
# Generate secure random strings
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run this command twice to generate two different secrets.

## Quick Deploy Commands

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link project
railway link

# Run migrations
railway run pnpm --filter @bridgechina/api prisma migrate deploy

# Seed database (first time only)
railway run pnpm --filter @bridgechina/api db:seed

# View logs
railway logs

# Open shell
railway shell
```

