# Sync Local Database to Railway

This guide will help you sync your local PostgreSQL database to Railway.

## Prerequisites

1. **PostgreSQL tools installed:**
   - `pg_dump` - for dumping database
   - `psql` - for restoring database
   
   **Windows:** Install PostgreSQL from https://www.postgresql.org/download/windows/
   **macOS:** `brew install postgresql`
   **Linux:** `sudo apt-get install postgresql-client`

2. **Database access:**
   - Local database must be running and accessible
   - Railway database must be accessible

## ⚠️ WARNING

**This will DROP ALL TABLES in your Railway database and replace them with your local database!**

Make sure:
- You have a backup of Railway database if needed
- You want to completely replace Railway with local data
- All local data is correct and ready to sync

## Steps

### 1. Stop your API server
```bash
# Press Ctrl+C in the terminal running pnpm dev
```

### 2. Run the sync script
```bash
pnpm --filter @bridgechina/api db:sync-to-railway
```

The script will:
1. ✅ Dump your local database (schema + data)
2. ✅ Drop all tables in Railway database
3. ✅ Restore the dump to Railway database
4. ✅ Clean up temporary files

### 3. Verify the sync

After sync completes, you can verify:
```bash
# Check Railway database connection
pnpm --filter @bridgechina/api db:connection
```

Or test your Railway API endpoint to see if data loads.

## Troubleshooting

### Error: "pg_dump: command not found"
- Install PostgreSQL client tools
- Make sure `pg_dump` and `psql` are in your PATH

### Error: "connection refused" or "could not connect"
- Check that local PostgreSQL is running
- Verify Railway database URL is correct
- Check firewall/network settings

### Error: "permission denied"
- Make sure database user has necessary permissions
- Check that Railway database allows connections from your IP

### Error: "database does not exist"
- Verify database names in connection strings
- Railway database should be named "railway"

## Alternative: Manual Sync

If the script doesn't work, you can do it manually:

### 1. Dump local database
```bash
pg_dump -h localhost -p 5432 -U postgres -d bridgechina -F p -f local-dump.sql
# Enter password when prompted: asif10018
```

### 2. Connect to Railway and drop tables
```bash
psql -h mainline.proxy.rlwy.net -p 17048 -U postgres -d railway
# Enter password: zQLrMLvvUyHVjBcNWobjRBYicRSBPNjP
```

Then in psql:
```sql
-- Drop all tables
DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

\q
```

### 3. Restore to Railway
```bash
psql -h mainline.proxy.rlwy.net -p 17048 -U postgres -d railway -f local-dump.sql
# Enter password when prompted
```

## After Sync

1. **Update Railway environment variables:**
   - Make sure Railway app has the correct `DATABASE_URL`
   - It should already be set, but verify it matches

2. **Restart Railway app:**
   - Railway should auto-deploy, or manually restart

3. **Test:**
   - Check Railway API endpoints
   - Verify data is loading correctly





