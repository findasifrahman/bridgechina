# Migration Notes

## Phase 2: Customer Profile Fields

**Migration Name:** `add_customer_profile_fields`

**SQL to run (if creating manually):**

```sql
-- Add new fields to customer_profiles table
ALTER TABLE "customer_profiles" 
  ADD COLUMN "full_name" TEXT,
  ADD COLUMN "gender" TEXT,
  ADD COLUMN "birth_year" INTEGER,
  ADD COLUMN "country_of_residence" TEXT,
  ADD COLUMN "city_of_residence" TEXT,
  ADD COLUMN "preferred_currency" TEXT,
  ADD COLUMN "preferred_contact_channel" TEXT,
  ADD COLUMN "wechat_id" TEXT,
  ADD COLUMN "dietary_preferences" JSONB,
  ADD COLUMN "travel_interests" JSONB,
  ADD COLUMN "budget_preferences" JSONB,
  ADD COLUMN "marketing_consent" BOOLEAN DEFAULT false,
  ADD COLUMN "avatar_asset_id" TEXT;

-- Add foreign key constraint for avatar_asset_id
ALTER TABLE "customer_profiles" 
  ADD CONSTRAINT "customer_profiles_avatar_asset_id_fkey" 
  FOREIGN KEY ("avatar_asset_id") 
  REFERENCES "media_assets"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for marketing_consent
CREATE INDEX IF NOT EXISTS "customer_profiles_marketing_consent_idx" 
  ON "customer_profiles"("marketing_consent");
```

**To create migration properly:**
```bash
cd apps/api
pnpm db:migrate
# Or if you want to create migration file first:
npx prisma migrate dev --name add_customer_profile_fields --create-only
```





