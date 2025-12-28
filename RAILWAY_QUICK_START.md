# Railway Quick Start Guide

## 🚀 Quick Deployment Steps

### 1. Connect Repository to Railway

1. Go to [Railway Dashboard](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `brandchina` repository

### 2. Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "Add PostgreSQL"
3. Railway automatically creates `DATABASE_URL` environment variable

### 3. Configure Environment Variables

Go to your service → **Variables** tab and add:

```bash
# Required - Authentication
JWT_ACCESS_SECRET=<generate-random-32-chars>
JWT_REFRESH_SECRET=<generate-random-32-chars>
JWT_ACCESS_EXPIRES=12h
JWT_REFRESH_EXPIRES=14d

# Required - Application
APP_BASE_URL=https://your-frontend-domain.com
FRONTEND_URL=https://your-frontend-domain.com
NODE_ENV=production

# Optional - Cloudflare R2 (for image uploads)
R2_ACCOUNT_ID=<your-account-id>
R2_ACCESS_KEY_ID=<your-access-key>
R2_SECRET_ACCESS_KEY=<your-secret-key>
R2_BUCKET=<your-bucket-name>
R2_PUBLIC_BASE_URL=<your-public-url>
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com

# Optional - TMAPI Shopping
TMAPI_BASE_URL=https://api.tmapi.top
TMAPI_API_16688_TOKEN=<your-token>
```

**Generate JWT Secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Deploy

Railway will automatically:
1. Detect the monorepo structure
2. Run `pnpm install`
3. Generate Prisma client
4. Build the API
5. Start the server

### 5. Run Database Migrations

After first deployment, open Railway shell and run:

```bash
cd apps/api
pnpm prisma migrate deploy
pnpm db:seed
```

Or use Railway CLI:
```bash
railway run pnpm --filter @bridgechina/api prisma migrate deploy
railway run pnpm --filter @bridgechina/api db:seed
```

### 6. Verify Deployment

1. Check health endpoint: `https://your-app.railway.app/health`
2. Should return: `{"status":"ok","timestamp":"..."}`

## 📁 Files Created for Railway

- `railway.toml` - Railway configuration
- `railway.json` - Alternative Railway config (JSON format)
- `.nixpacks.toml` - Build configuration
- `Procfile` - Process file (Heroku-style)
- `RAILWAY_SETUP.md` - Detailed setup guide
- `DEPLOYMENT_CHECKLIST.md` - Deployment checklist

## 🔧 Build Configuration

Railway uses these files to build and deploy:

**Build Command:**
```bash
pnpm install --frozen-lockfile && pnpm --filter @bridgechina/api db:generate && pnpm --filter @bridgechina/api build
```

**Start Command:**
```bash
cd apps/api && pnpm start
```

## 🌐 Frontend Deployment

### Option 1: Separate Railway Service (Recommended)

1. Create new service in Railway
2. Set root directory: `/apps/web`
3. Build command: `pnpm install && pnpm --filter @bridgechina/web build`
4. Start command: `pnpm --filter @bridgechina/web preview`
5. Set `VITE_API_URL` to your backend URL

### Option 2: Static Hosting (Vercel, Netlify, etc.)

1. Build locally: `pnpm --filter @bridgechina/web build`
2. Deploy `apps/web/dist` folder
3. Set `VITE_API_URL` environment variable

## 🐛 Troubleshooting

### Build Fails
- Check Railway build logs
- Verify `pnpm-lock.yaml` is committed
- Ensure Node.js >= 18

### Database Connection
- Verify `DATABASE_URL` is set
- Check PostgreSQL service is running
- Run migrations: `prisma migrate deploy`

### CORS Errors
- Set `APP_BASE_URL` and `FRONTEND_URL` correctly
- Check frontend is using correct API URL

## 📚 More Information

- See `RAILWAY_SETUP.md` for detailed guide
- See `DEPLOYMENT_CHECKLIST.md` for checklist
- Railway Docs: https://docs.railway.app

