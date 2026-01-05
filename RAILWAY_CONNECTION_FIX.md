# Railway PostgreSQL Connection Fix

## Issue
Railway PostgreSQL is experiencing "Connection reset by peer" errors, indicating connection pool exhaustion.

## Root Cause
Railway PostgreSQL has limited connections (typically 100-200 max connections). If your application creates too many connections or doesn't properly pool them, you'll hit these limits.

## Solution

### 1. Use Railway's Pooled Connection URL

Railway provides a pooled connection URL that uses PgBouncer. This is the **recommended solution**.

**In Railway Dashboard:**
1. Go to your PostgreSQL service
2. Click on the "Variables" tab
3. Look for `DATABASE_URL` or `POSTGRES_URL`
4. Use the **pooled connection URL** (usually has `pgbouncer=true` or mentions "pooled")

The pooled URL format should look like:
```
postgresql://user:password@host.railway.internal:5432/db?pgbouncer=true&connection_limit=10
```

Or Railway might provide it as:
```
postgresql://user:password@host.railway.internal:5432/db?sslmode=require&connection_limit=10
```

### 2. Update Your DATABASE_URL Environment Variable

In Railway, update your `DATABASE_URL` to use the pooled connection:

```bash
# If Railway provides a separate pooled URL, use that
# Or append these parameters to your existing DATABASE_URL:
?connection_limit=10&pool_timeout=10
```

**Important:** Railway's pooled connections typically support 10-20 connections per instance. Don't set `connection_limit` higher than Railway's limit.

### 3. Code Changes Applied

We've made the following changes:

1. **Fixed dynamic import in `apps/api/src/middleware/auth.ts`**
   - Changed from `await import('../lib/prisma.js')` to static import
   - Ensures we're using the singleton instance (all imports use the same PrismaClient)

2. **Enhanced `apps/api/src/lib/prisma.ts`**
   - Added proper graceful shutdown handlers (SIGINT, SIGTERM, beforeExit)
   - Singleton pattern was already correct (using globalThis.__prisma)
   - Removed unnecessary datasource configuration (Prisma uses DATABASE_URL directly)

### 4. Verify Singleton Pattern

The Prisma Client is correctly implemented as a singleton:
- Uses `globalThis.__prisma` to cache the instance
- All routes import from the same `./lib/prisma.js` file
- Only one PrismaClient instance should exist per process

### 5. Monitor Connection Usage

Check your Railway logs for:
- Connection count warnings
- "too many clients already" errors
- Connection reset errors

If issues persist, you may need to:
- Reduce `connection_limit` further (try 5)
- Check for connection leaks in your code
- Consider scaling your Railway PostgreSQL instance

## Testing

After deploying:
1. Monitor Railway logs for connection errors
2. Check application logs for Prisma connection warnings
3. Verify your application handles traffic normally

## Additional Notes

- Prisma Client automatically manages connection pooling
- The singleton pattern ensures only one connection pool exists
- Railway's pooled connections (PgBouncer) are recommended for production
- Default Prisma pool size formula: `num_physical_cpus * 2 + 1` (but Railway limits override this)

