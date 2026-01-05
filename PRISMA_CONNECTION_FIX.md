# Prisma Connection Pool Fix

## Problem
The application was experiencing "too many database connections" errors in production because **multiple PrismaClient instances** were being created across different files, each opening its own connection pool.

## Root Cause
Found **15+ separate PrismaClient instantiations**:
- `apps/api/src/index.ts`
- `apps/api/src/routes/public.ts`
- `apps/api/src/routes/admin.ts`
- `apps/api/src/routes/auth.ts`
- `apps/api/src/routes/seller.ts`
- `apps/api/src/routes/user.ts`
- `apps/api/src/routes/ops.ts`
- `apps/api/src/routes/guide.ts`
- `apps/api/src/modules/chat/chat.agent.ts`
- `apps/api/src/modules/hotels/bookingcom.service.ts`
- `apps/api/src/modules/shopping/shopping.service.ts`
- `apps/api/src/modules/shopping/cache.ts`
- `apps/api/src/modules/whatsapp/whatsapp.service.ts`
- `apps/api/src/modules/whatsapp/whatsapp.routes.ts`
- `apps/api/src/middleware/auth.ts` (dynamic import)

Each instance created its own connection pool, quickly exhausting the database connection limit.

## Solution

### 1. Created Singleton PrismaClient
Created `apps/api/src/lib/prisma.ts` with a singleton pattern:
- Single PrismaClient instance shared across the entire application
- Uses global variable in development to prevent multiple instances during hot reload
- Graceful shutdown handler to disconnect on process exit

### 2. Updated All Files
Updated all files to import from the singleton:
```typescript
// Before:
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// After:
import { prisma } from '../lib/prisma.js';
```

### 3. Connection Pooling Configuration
- Updated Prisma schema with connection pooling comments
- Updated README with instructions to use pooled connection URLs in production

## Files Changed

### Created:
- `apps/api/src/lib/prisma.ts` - Singleton PrismaClient

### Updated:
- `apps/api/src/index.ts`
- `apps/api/src/routes/public.ts`
- `apps/api/src/routes/admin.ts`
- `apps/api/src/routes/auth.ts`
- `apps/api/src/routes/seller.ts`
- `apps/api/src/routes/user.ts`
- `apps/api/src/routes/ops.ts`
- `apps/api/src/routes/guide.ts`
- `apps/api/src/modules/chat/chat.agent.ts`
- `apps/api/src/modules/hotels/bookingcom.service.ts`
- `apps/api/src/modules/shopping/shopping.service.ts`
- `apps/api/src/modules/shopping/cache.ts`
- `apps/api/src/modules/whatsapp/whatsapp.service.ts`
- `apps/api/src/modules/whatsapp/whatsapp.routes.ts`
- `apps/api/src/middleware/auth.ts`
- `apps/api/prisma/schema.prisma`
- `README.md`

## Production Recommendations

1. **Use Connection Pooler**: 
   - Railway: Use the pooled connection URL (includes `?pgbouncer=true`)
   - Other providers: Use PgBouncer or similar connection pooler
   - This limits the number of actual database connections while allowing many concurrent requests

2. **Monitor Connections**:
   - Check database connection count regularly
   - Set up alerts for connection pool exhaustion

3. **Connection Limits**:
   - Default PostgreSQL limit is typically 100 connections
   - With connection pooling, you can handle many more concurrent requests
   - Adjust pool size based on your traffic patterns

## Testing

After deploying this fix:
1. Monitor database connections in production
2. Check application logs for connection errors
3. Verify that connection count stays within limits under load

## Additional Notes

- The singleton pattern ensures only one connection pool is created
- Prisma automatically manages connection pooling within that single instance
- The global variable pattern prevents issues during development hot reload
- Graceful shutdown ensures connections are properly closed on process exit



