# Fix Database Schema: pubdlic → public

## The Problem
Your database is connected to schema `pubdlic` (typo) instead of `public`. Your data is in the `public` schema, but Prisma is looking in `pubdlic`.

## Solution

### Step 1: Find Your DATABASE_URL

The DATABASE_URL is set in one of these places:
1. `apps/api/.env` file (if it exists)
2. System environment variables
3. Railway environment variables (if deployed)

### Step 2: Fix the Schema Name

Update your `DATABASE_URL` to use `schema=public` instead of `schema=pubdlic`.

**Current (WRONG):**
```
postgresql://postgres:password@localhost:5432/bridgechina?schema=pubdlic
```

**Fixed (CORRECT):**
```
postgresql://postgres:password@localhost:5432/bridgechina?schema=public
```

**Or remove schema parameter (uses default 'public'):**
```
postgresql://postgres:password@localhost:5432/bridgechina
```

### Step 3: Update the Connection

#### Option A: If you have `apps/api/.env` file
1. Open `apps/api/.env`
2. Find the line with `DATABASE_URL=`
3. Change `schema=pubdlic` to `schema=public` (or remove the schema parameter)
4. Save the file

#### Option B: If using environment variables
Update your system/Railway environment variable:
```bash
# Remove or update the DATABASE_URL environment variable
# Change schema=pubdlic to schema=public
```

#### Option C: Create .env file
If the file doesn't exist, create `apps/api/.env`:
```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/bridgechina?schema=public"
```

### Step 4: Regenerate Prisma Client

After fixing the DATABASE_URL:
```bash
# Stop API server first, then:
pnpm --filter @bridgechina/api db:generate
```

### Step 5: Verify the Fix

```bash
pnpm --filter @bridgechina/api db:connection
```

Should now show:
- Schema: `public` ✅

### Step 6: Test Data Access

After fixing, restart your API and test:
```bash
pnpm dev
```

Then check if data loads at `http://localhost:5173`

## Quick SQL Fix (If Needed)

If you accidentally created tables in the `pubdlic` schema, you can move them:

```sql
-- Check what's in pubdlic schema
SELECT table_name FROM information_schema.tables WHERE table_schema = 'pubdlic';

-- Move tables from pubdlic to public (if needed)
-- Note: This is advanced - only do if you have data in pubdlic that needs moving
```

But since your data is in `public` schema, you just need to fix the connection string!




