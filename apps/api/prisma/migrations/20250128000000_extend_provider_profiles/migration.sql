-- AlterTable: Add new fields to service_provider_profiles (all nullable, safe)
-- Using DO block to safely add columns only if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_provider_profiles' AND column_name = 'provider_type') THEN
        ALTER TABLE "service_provider_profiles" ADD COLUMN "provider_type" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_provider_profiles' AND column_name = 'display_name') THEN
        ALTER TABLE "service_provider_profiles" ADD COLUMN "display_name" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_provider_profiles' AND column_name = 'company_name') THEN
        ALTER TABLE "service_provider_profiles" ADD COLUMN "company_name" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_provider_profiles' AND column_name = 'contact_name') THEN
        ALTER TABLE "service_provider_profiles" ADD COLUMN "contact_name" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_provider_profiles' AND column_name = 'whatsapp') THEN
        ALTER TABLE "service_provider_profiles" ADD COLUMN "whatsapp" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_provider_profiles' AND column_name = 'wechat') THEN
        ALTER TABLE "service_provider_profiles" ADD COLUMN "wechat" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_provider_profiles' AND column_name = 'email') THEN
        ALTER TABLE "service_provider_profiles" ADD COLUMN "email" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_provider_profiles' AND column_name = 'website') THEN
        ALTER TABLE "service_provider_profiles" ADD COLUMN "website" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_provider_profiles' AND column_name = 'description') THEN
        ALTER TABLE "service_provider_profiles" ADD COLUMN "description" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_provider_profiles' AND column_name = 'languages') THEN
        ALTER TABLE "service_provider_profiles" ADD COLUMN "languages" JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_provider_profiles' AND column_name = 'service_area') THEN
        ALTER TABLE "service_provider_profiles" ADD COLUMN "service_area" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_provider_profiles' AND column_name = 'address_text') THEN
        ALTER TABLE "service_provider_profiles" ADD COLUMN "address_text" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_provider_profiles' AND column_name = 'verified') THEN
        ALTER TABLE "service_provider_profiles" ADD COLUMN "verified" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_provider_profiles' AND column_name = 'rating') THEN
        ALTER TABLE "service_provider_profiles" ADD COLUMN "rating" DOUBLE PRECISION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_provider_profiles' AND column_name = 'review_count') THEN
        ALTER TABLE "service_provider_profiles" ADD COLUMN "review_count" INTEGER NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_provider_profiles' AND column_name = 'cover_asset_id') THEN
        ALTER TABLE "service_provider_profiles" ADD COLUMN "cover_asset_id" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_provider_profiles' AND column_name = 'gallery_asset_ids') THEN
        ALTER TABLE "service_provider_profiles" ADD COLUMN "gallery_asset_ids" JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_provider_profiles' AND column_name = 'onboarding_completed_at') THEN
        ALTER TABLE "service_provider_profiles" ADD COLUMN "onboarding_completed_at" TIMESTAMP(3);
    END IF;
END $$;

-- CreateIndex: Add index on verified field
CREATE INDEX IF NOT EXISTS "service_provider_profiles_verified_idx" ON "service_provider_profiles"("verified");

-- AlterTable: Add new fields to guide_profiles (all nullable, safe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guide_profiles' AND column_name = 'wechat') THEN
        ALTER TABLE "guide_profiles" ADD COLUMN "wechat" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guide_profiles' AND column_name = 'whatsapp') THEN
        ALTER TABLE "guide_profiles" ADD COLUMN "whatsapp" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guide_profiles' AND column_name = 'is_living_inside_china') THEN
        ALTER TABLE "guide_profiles" ADD COLUMN "is_living_inside_china" BOOLEAN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guide_profiles' AND column_name = 'current_occupation') THEN
        ALTER TABLE "guide_profiles" ADD COLUMN "current_occupation" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guide_profiles' AND column_name = 'years_of_experience') THEN
        ALTER TABLE "guide_profiles" ADD COLUMN "years_of_experience" INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guide_profiles' AND column_name = 'identity_verified') THEN
        ALTER TABLE "guide_profiles" ADD COLUMN "identity_verified" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guide_profiles' AND column_name = 'additional_photos_asset_ids') THEN
        ALTER TABLE "guide_profiles" ADD COLUMN "additional_photos_asset_ids" JSONB;
    END IF;
END $$;

-- CreateIndex: Add index on identity_verified field
CREATE INDEX IF NOT EXISTS "guide_profiles_identity_verified_idx" ON "guide_profiles"("identity_verified");

-- CreateTable: Create service_provider_service_profiles table (new table, no data loss)
CREATE TABLE IF NOT EXISTS "service_provider_service_profiles" (
    "id" TEXT NOT NULL,
    "provider_profile_id" TEXT NOT NULL,
    "category_key" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "pricing_info" JSONB,
    "availability_info" JSONB,
    "specializations" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_provider_service_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Add indexes for service_provider_service_profiles
CREATE UNIQUE INDEX IF NOT EXISTS "service_provider_service_profiles_provider_profile_id_category_key_key" ON "service_provider_service_profiles"("provider_profile_id", "category_key");
CREATE INDEX IF NOT EXISTS "service_provider_service_profiles_provider_profile_id_idx" ON "service_provider_service_profiles"("provider_profile_id");
CREATE INDEX IF NOT EXISTS "service_provider_service_profiles_category_key_idx" ON "service_provider_service_profiles"("category_key");
CREATE INDEX IF NOT EXISTS "service_provider_service_profiles_is_active_idx" ON "service_provider_service_profiles"("is_active");

-- AddForeignKey: Add foreign key for cover_asset_id (only if MediaAsset table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'media_assets') THEN
        -- Check if foreign key doesn't exist before adding
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'service_provider_profiles_cover_asset_id_fkey'
            AND table_name = 'service_provider_profiles'
        ) THEN
            ALTER TABLE "service_provider_profiles" ADD CONSTRAINT "service_provider_profiles_cover_asset_id_fkey" 
            FOREIGN KEY ("cover_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- AddForeignKey: Add foreign key for service_provider_service_profiles
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_provider_profiles') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'service_provider_service_profiles_provider_profile_id_fkey'
            AND table_name = 'service_provider_service_profiles'
        ) THEN
            ALTER TABLE "service_provider_service_profiles" ADD CONSTRAINT "service_provider_service_profiles_provider_profile_id_fkey" 
            FOREIGN KEY ("provider_profile_id") REFERENCES "service_provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

