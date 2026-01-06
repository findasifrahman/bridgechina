# Database Seeding Safety

## Safe Seeding Command

The seed script uses `upsert` operations which are **safe to run multiple times** without destroying data.

### Command
```bash
# From project root
pnpm db:seed

# Or from apps/api directory
cd apps/api
pnpm db:seed
```

### How It Works

The seed script uses Prisma's `upsert` operation with empty `update: {}` objects:

```typescript
await prisma.role.upsert({
  where: { name: roleName },
  update: {},  // Empty update = no changes to existing records
  create: { name: roleName },  // Only creates if doesn't exist
});
```

### What This Means

✅ **Safe Operations:**
- Creates records that don't exist
- Leaves existing records completely unchanged
- Never deletes data
- Can be run multiple times safely

❌ **Does NOT:**
- Delete existing records
- Modify existing records (because `update: {}` is empty)
- Overwrite data

### When to Run Seed

Run `pnpm db:seed` when:
- Setting up a new database
- Adding new seed data (roles, categories, cities, etc.)
- Ensuring base data exists after migrations
- After deploying to a new environment

### Current Seed Data

The seed script currently creates:
- Roles (ADMIN, OPS, EDITOR, SELLER, PARTNER, USER, SERVICE_PROVIDER)
- Service Categories (9 core services)
- Cities (Guangzhou, Hainan)
- Sample admin and seller users
- Sample hotels, restaurants, medical centers, tours, transport products, eSIM plans
- Homepage blocks

All using safe `upsert` operations.



