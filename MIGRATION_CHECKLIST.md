# Migration Checklist

When database is accessible, run these migrations:

## Phase 2: Customer Profile Fields
```bash
cd apps/api
pnpm db:migrate --name add_customer_profile_fields
```

**Expected SQL:**
- ALTER TABLE customer_profiles ADD COLUMN full_name, gender, birth_year, etc.
- ADD CONSTRAINT for avatar_asset_id foreign key
- CREATE INDEX on marketing_consent

---

## Phase 8: Service Request Status Events
```bash
cd apps/api
pnpm db:migrate --name add_service_request_status_events
```

**Expected SQL:**
- CREATE TABLE service_request_status_events
- ADD FOREIGN KEY constraints
- CREATE INDEXES on request_id, status_to, created_at
- ADD relation to users table

---

## Verification
After migrations:
1. Run `pnpm prisma generate` to regenerate Prisma Client
2. Test API endpoints
3. Verify schema matches expected structure




