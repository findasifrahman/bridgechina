# Railway Deployment Guide - Clear Instructions

## 🎯 Which Folder to Deploy?

**Answer: Deploy the ENTIRE monorepo (root folder)**

Railway will:
1. Clone your entire GitHub repository (root directory)
2. Run build commands from the root
3. Use pnpm workspace filters to build only what's needed
4. Start the API service from `apps/api`

## 📁 Project Structure

```
brandchina/                    ← Deploy THIS (root)
├── apps/
│   ├── api/                   ← Backend service (built & started)
│   └── web/                   ← Frontend (deploy separately if needed)
├── packages/
│   ├── shared/                ← Shared code
│   └── ui/                    ← UI components
├── railway.toml               ← Railway config (tells Railway how to build)
├── package.json               ← Root package.json (workspace config)
└── pnpm-workspace.yaml        ← pnpm workspace config
```

## 🚀 Step-by-Step Railway Setup

### Step 1: Create Railway Service

1. Go to [Railway Dashboard](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `brandchina` repository
5. **IMPORTANT**: Railway will detect the root directory automatically
   - **DO NOT** set a root directory in Railway settings
   - Railway will use the root of your repo

### Step 2: Railway Auto-Detection

Railway will automatically:
- Detect it's a Node.js project
- Find `package.json` in root
- Use `railway.toml` or `.nixpacks.toml` for build config
- Run the build and start commands we configured

### Step 3: Build Process (What Railway Does)

From the **root directory**, Railway runs:

```bash
# 1. Install all dependencies (monorepo-wide)
pnpm install --frozen-lockfile

# 2. Generate Prisma client (for API)
pnpm --filter @bridgechina/api db:generate

# 3. Build the API TypeScript code
pnpm --filter @bridgechina/api build

# 4. Start the server
cd apps/api && pnpm start
```

### Step 4: Configure Environment Variables

In Railway dashboard → Your Service → **Variables** tab:

**Required:**
```bash
DATABASE_URL=<auto-set-by-railway-postgres>
JWT_ACCESS_SECRET=<generate-random-32-chars>
JWT_REFRESH_SECRET=<generate-random-32-chars>
JWT_ACCESS_EXPIRES=12h
JWT_REFRESH_EXPIRES=14d
APP_BASE_URL=https://your-frontend-url.com
FRONTEND_URL=https://your-frontend-url.com
NODE_ENV=production
```

**Optional:**
```bash
R2_ACCOUNT_ID=<your-r2-account-id>
R2_ACCESS_KEY_ID=<your-r2-access-key>
R2_SECRET_ACCESS_KEY=<your-r2-secret>
R2_BUCKET=<your-bucket-name>
R2_PUBLIC_BASE_URL=<your-r2-public-url>
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
TMAPI_BASE_URL=https://api.tmapi.top
TMAPI_API_16688_TOKEN=<your-tmapi-token>
```

### Step 5: Add PostgreSQL Database

1. In Railway project, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway automatically:
   - Creates the database
   - Sets `DATABASE_URL` environment variable
   - Links it to your service

### Step 6: Deploy & Run Migrations

After Railway deploys:

1. Open Railway shell (or use Railway CLI):
   ```bash
   railway shell
   ```

2. Run migrations:
   ```bash
   cd apps/api
   pnpm prisma migrate deploy
   pnpm db:seed
   ```

Or use Railway CLI from your local machine:
```bash
railway run pnpm --filter @bridgechina/api prisma migrate deploy
railway run pnpm --filter @bridgechina/api db:seed
```

## 🔧 How Railway Configuration Works

### railway.toml (in root directory)

This file tells Railway:
- **Build Command**: What to run to build your app
- **Start Command**: What to run to start your app

Railway reads this from the **root** of your repository.

### Build Command Breakdown

```bash
pnpm install --frozen-lockfile
# ↑ Installs all dependencies in monorepo

pnpm --filter @bridgechina/api db:generate
# ↑ Only runs in apps/api, generates Prisma client

pnpm --filter @bridgechina/api build
# ↑ Only builds apps/api (TypeScript → JavaScript)
```

### Start Command Breakdown

```bash
cd apps/api && pnpm start
# ↑ Changes to apps/api directory
# ↑ Runs: node dist/index.js (from apps/api/package.json)
```

## ❓ Common Questions

### Q: Should I set "Root Directory" in Railway?

**A: NO!** Leave it empty. Railway should use the root of your repo.

### Q: Why deploy the entire monorepo?

**A:** Because:
- Your `apps/api` depends on `packages/shared` and `packages/ui`
- pnpm workspaces need the root `package.json` and `pnpm-workspace.yaml`
- Railway needs to see the full structure to build correctly

### Q: Can I deploy just `apps/api` folder?

**A:** Not recommended because:
- You'd lose workspace dependencies (`@bridgechina/shared`, `@bridgechina/ui`)
- You'd need to restructure the project
- Current setup works perfectly with the full monorepo

### Q: What about the frontend (`apps/web`)?

**A:** Two options:

**Option 1: Separate Railway Service (Recommended)**
- Create a new service in Railway
- Set root directory to `/apps/web` (in Railway settings)
- Build: `pnpm install && pnpm --filter @bridgechina/web build`
- Start: `pnpm --filter @bridgechina/web preview`
- Set `VITE_API_URL` to your backend URL

**Option 2: Deploy to Vercel/Netlify**
- Build locally: `pnpm --filter @bridgechina/web build`
- Deploy `apps/web/dist` folder
- Set `VITE_API_URL` environment variable

## ✅ Verification

After deployment, check:

1. **Health Endpoint:**
   ```
   GET https://your-app.railway.app/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Check Logs:**
   - Railway Dashboard → Your Service → Logs
   - Should see: "Server listening on port XXXX"

3. **Test API:**
   ```bash
   curl https://your-app.railway.app/api/public/cities
   ```

## 🐛 Troubleshooting

### Build Fails: "Cannot find module @bridgechina/shared"

**Solution:** Make sure Railway is building from the root directory, not `apps/api`. Check Railway service settings - root directory should be empty or `/`.

### Port Error

**Solution:** Railway sets `PORT` automatically. Your code uses `process.env.PORT || 3000` which is correct.

### Database Connection Fails

**Solution:**
1. Verify PostgreSQL service is running
2. Check `DATABASE_URL` is set (auto-set by Railway)
3. Run migrations: `prisma migrate deploy`

## 📝 Summary

- **Deploy:** Entire monorepo (root directory)
- **Root Directory in Railway:** Leave empty (default)
- **Build:** Runs from root, uses pnpm filters
- **Start:** Changes to `apps/api` and runs `pnpm start`
- **Database:** Add PostgreSQL service in Railway
- **Migrations:** Run after first deployment

