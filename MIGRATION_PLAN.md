# Migration Plan: Remove Image Tables + Add Guide Service

## Overview
This migration removes per-entity image tables and standardizes on `cover_asset_id` + `gallery_asset_ids` JSON field. Also adds Guide service models.

## Steps

### 1. Drop Image Tables (in order to avoid FK constraints)
```sql
DROP TABLE IF EXISTS city_place_images CASCADE;
DROP TABLE IF EXISTS city_images CASCADE;
DROP TABLE IF EXISTS transport_images CASCADE;
DROP TABLE IF EXISTS tour_images CASCADE;
DROP TABLE IF EXISTS medical_images CASCADE;
DROP TABLE IF EXISTS restaurant_images CASCADE;
DROP TABLE IF EXISTS hotel_images CASCADE;
DROP TABLE IF EXISTS product_images CASCADE;
DROP TABLE IF EXISTS esim_images CASCADE;
```

### 2. Add New Columns
```sql
-- Hotels
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS cover_asset_id TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS gallery_asset_ids JSONB;

-- Restaurants
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS cover_asset_id TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS gallery_asset_ids JSONB;

ALTER TABLE medical_centers ADD COLUMN IF NOT EXISTS cover_asset_id TEXT;
ALTER TABLE medical_centers ADD COLUMN IF NOT EXISTS gallery_asset_ids JSONB;


ALTER TABLE tours ADD COLUMN IF NOT EXISTS cover_asset_id TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS gallery_asset_ids JSONB;


ALTER TABLE transport_products ADD COLUMN IF NOT EXISTS cover_asset_id TEXT;
ALTER TABLE transport_products ADD COLUMN IF NOT EXISTS gallery_asset_ids JSONB;


ALTER TABLE products ADD COLUMN IF NOT EXISTS gallery_asset_ids JSONB;


ALTER TABLE esim_plans ADD COLUMN IF NOT EXISTS gallery_asset_ids JSONB;

-- Cities
ALTER TABLE cities ADD COLUMN IF NOT EXISTS cover_asset_id TEXT;
ALTER TABLE cities ADD COLUMN IF NOT EXISTS gallery_asset_ids JSONB;


ALTER TABLE city_places ADD COLUMN IF NOT EXISTS cover_asset_id TEXT;
ALTER TABLE city_places ADD COLUMN IF NOT EXISTS gallery_asset_ids JSONB;
```

### 3. Add Foreign Keys
```sql
ALTER TABLE hotels ADD CONSTRAINT hotels_cover_asset_id_fkey 
  FOREIGN KEY (cover_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL;

ALTER TABLE restaurants ADD CONSTRAINT restaurants_cover_asset_id_fkey 
  FOREIGN KEY (cover_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL;

ALTER TABLE medical_centers ADD CONSTRAINT medical_centers_cover_asset_id_fkey 
  FOREIGN KEY (cover_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL;

ALTER TABLE tours ADD CONSTRAINT tours_cover_asset_id_fkey 
  FOREIGN KEY (cover_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL;

ALTER TABLE transport_products ADD CONSTRAINT transport_products_cover_asset_id_fkey 
  FOREIGN KEY (cover_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL;

ALTER TABLE products ADD CONSTRAINT products_cover_asset_id_fkey 
  FOREIGN KEY (cover_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL;

ALTER TABLE cities ADD CONSTRAINT cities_cover_asset_id_fkey 
  FOREIGN KEY (cover_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL;

ALTER TABLE city_places ADD CONSTRAINT city_places_cover_asset_id_fkey 
  FOREIGN KEY (cover_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL;
```

### 4. Create Guide Tables
```sql
CREATE TABLE guide_profiles (
  user_id TEXT PRIMARY KEY,
  city_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  languages JSONB NOT NULL,
  hourly_rate DOUBLE PRECISION,
  daily_rate DOUBLE PRECISION,
  verified BOOLEAN NOT NULL DEFAULT false,
  rating DOUBLE PRECISION,
  review_count INTEGER NOT NULL DEFAULT 0,
  cover_asset_id TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL,

  CONSTRAINT guide_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT guide_profiles_city_id_fkey FOREIGN KEY (city_id) REFERENCES cities(id),
  CONSTRAINT guide_profiles_cover_asset_id_fkey FOREIGN KEY (cover_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL
);

CREATE INDEX guide_profiles_city_id_idx ON guide_profiles(city_id);
CREATE INDEX guide_profiles_verified_idx ON guide_profiles(verified);
CREATE INDEX guide_profiles_rating_idx ON guide_profiles(rating);

CREATE TABLE guide_requests (
  request_id TEXT PRIMARY KEY,
  service_mode TEXT NOT NULL,
  start_time TIMESTAMP(3),
  end_time TIMESTAMP(3),
  meeting_point TEXT,
  places JSONB,
  notes TEXT,
  people_count INTEGER,
  budget_min DOUBLE PRECISION,
  budget_max DOUBLE PRECISION,
  status TEXT,

  CONSTRAINT guide_requests_request_id_fkey FOREIGN KEY (request_id) REFERENCES service_requests(id) ON DELETE CASCADE
);

CREATE TABLE guide_offers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  request_id TEXT NOT NULL,
  guide_id TEXT NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CNY',
  message TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT guide_offers_request_id_fkey FOREIGN KEY (request_id) REFERENCES guide_requests(request_id) ON DELETE CASCADE,
  CONSTRAINT guide_offers_guide_id_fkey FOREIGN KEY (guide_id) REFERENCES guide_profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX guide_offers_request_id_idx ON guide_offers(request_id);
CREATE INDEX guide_offers_guide_id_idx ON guide_offers(guide_id);
```

### 5. Update ServiceCategory
```sql
-- Add 'guide' to service categories if not exists
INSERT INTO service_categories (id, key, name)
VALUES (gen_random_uuid()::TEXT, 'guide', 'Guide Service')
ON CONFLICT (key) DO NOTHING;
```

### 6. Add GUIDE Role
```sql
INSERT INTO roles (id, name, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::TEXT, 'GUIDE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;
```

## Notes
- Existing image data in the dropped tables will be lost. Admin should re-upload images using the new structure.
- The `gallery_asset_ids` field stores an array of MediaAsset.id strings as JSONB.
- Guide profiles are linked to users (one-to-one).
- Guide requests are linked to service_requests (one-to-one).

