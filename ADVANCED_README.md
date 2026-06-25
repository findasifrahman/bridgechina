# BridgeChina Advanced Developer README

This document records the repo structure, shopping API provider flow, TMAPI compatibility notes, category taxonomy, and search verification process.

## Repo Layout

- `apps/api` - Fastify API, Prisma models, shopping provider integrations, category sync scripts.
- `apps/api/src/modules/shopping` - TMAPI 1688 integration used when `IS_OTAPI_ACTIVE="false"`.
- `apps/api/src/modules/shopping_otapi` - OTAPI/RapidAPI integration used when `IS_OTAPI_ACTIVE="true"`.
- `apps/api/src/routes/public.shopping.ts` - Public shopping endpoints consumed by the storefront.
- `apps/api/prisma/schema.ecommerce.prisma` - Ecommerce database schema.
- `apps/api/prisma/seed.ts` - Development seed data and default accounts.
- `apps/api/scripts/sync-shopping-taxonomy.ts` - Syncs the shared shopping taxonomy into `product_categories`.
- `apps/api/scripts/verify-shopping-search.ts` - Deterministic and optional live checks for text search behavior.
- `apps/web/src/pages/admin/HomepageVisualMenuPage.vue` - Admin editor for the homepage visual menu tiles.
- `apps/web` - Vue storefront/admin app.
- `packages/ui` - Shared Vue UI/layout package, including the public shopping sidebar.
- `tmapi_docs.txt` - Local TMAPI API reference for 1688 search, detail, shop, and image endpoints.

## Shopping Provider Switch

The active shopping provider is selected in `apps/api/src/modules/shopping/shopping.provider.ts`.

```env
IS_OTAPI_ACTIVE="false"
TMAPI_API_16688_TOKEN="..."
TMAPI_BASE_URL="http://api.tmapi.top"
```

- `IS_OTAPI_ACTIVE="true"` routes shopping calls to `shopping_otapi`.
- `IS_OTAPI_ACTIVE="false"` routes shopping calls to `shopping`, the TMAPI implementation.
- The TMAPI client normalizes `http://api.tmapi.top` to `https://api.tmapi.top`.
- Do not remove either implementation; both are supported by the provider switch.
- Production image proxy URLs are built from `VITE_API_URL`, so the frontend should point to the backend origin itself, for example `https://bridgechina-production.up.railway.app`, not a Vercel-only `/api` path.

## TMAPI Search Behavior

TMAPI has two relevant search paths:

- English/global search: `/1688/global/search/items`
- Chinese/native search: `/1688/search/items`

The UI language selector sends `language=en` or `language=zh` through the public shopping routes. English searches now preserve the user's original phrase for the global endpoint. This matters for phrases such as:

- `xiaomi phone cover`
- `oppo phone back cover`
- `phone glass`

The native Chinese path still uses Chinese hints from `search.synonyms.ts`, because 1688 native search works best with product terms such as `手机壳`, `手机钢化膜`, and `手机充电器`.

## Product Normalization

TMAPI responses are normalized in `apps/api/src/modules/shopping/shopping.normalize.ts`.

Product list cards now preserve common TMAPI fields:

- `item_id`
- `title`
- `title_origin`
- `img`
- `price_info.price_min`
- `price_info.price_max`
- `quantity_begin`
- `sale_info.sale_quantity_90days`
- `shop_info`

Detail normalization supports:

- images
- SKU rows and SKU properties
- tier prices
- shop metadata
- vendor/member id
- detail HTML from `/1688/item_desc`
- package weight when available

## Category Taxonomy

The shared category source is `apps/api/src/modules/shopping/category-taxonomy.ts`.

Current top-level customer menu sections include:

- Phone Accessories
- Jewelry
- Shoes
- Mens Wear
- Women Wear
- Watches
- Gadgets
- Bags
- Beauty
- Eyewear
- Baby Items
- Home & Garden
- Sports & Outdoors

Phone Accessories includes normal subcategories such as Phone Charger, Phone Cover, Phone Glass, Charging Cable, Power Bank, Earphones, Phone Holder, and Other Phone Accessories.

Brand selections are stored as child categories with:

```ts
description: 'brand-selection'
```

The shared layout separates these into a `Brand selection` section in the left menu.

## Updating Categories

1. Edit `SHOPPING_CATEGORY_TREE` in `apps/api/src/modules/shopping/category-taxonomy.ts`.
2. Add or adjust matching search aliases in `apps/api/src/modules/shopping/search.synonyms.ts`.
3. Sync the database:

```bash
pnpm --filter @bridgechina/api sync:shopping-taxonomy
```

Fresh database seeds also apply the shared taxonomy.

## Search Verification Pattern

Run deterministic checks without starting the API:

```bash
pnpm --filter @bridgechina/api verify:shopping-search
```

The script verifies common text searches and every menu node in `SHOPPING_CATEGORY_TREE`. It checks:

- generated search candidates
- Chinese fallback query terms
- focus tokens
- category/menu coverage

Run live checks against a local API server:

```bash
pnpm --filter @bridgechina/api verify:shopping-search -- --live
```

Use a different API base URL:

```bash
VERIFY_SHOPPING_API_BASE_URL="http://localhost:3000" pnpm --filter @bridgechina/api verify:shopping-search -- --live
```

Run live checks for every menu item:

```bash
pnpm --filter @bridgechina/api verify:shopping-search -- --live --all-live-menu
```

When adding a new menu item, the script automatically includes it in deterministic checks as long as it is added to `SHOPPING_CATEGORY_TREE`.
Homepage visual menu tiles are also validated from the shared homepage tile seed, so new tiles can be checked the same way once they are added to the shared list.

## Homepage Visual Menu

The clickable homepage tile grid is stored in `homepage_visual_menu_items` and exposed through:

- `GET /api/public/shopping/home-visual-menu`
- `GET /api/admin/homepage/visual-menu`
- `POST /api/admin/homepage/visual-menu`
- `PUT /api/admin/homepage/visual-menu/:id`
- `DELETE /api/admin/homepage/visual-menu/:id`

The tile records store:

- `section_key`
- `section_label`
- `section_sort_order`
- `title`
- `search_keyword`
- `image_url`
- `image_alt`
- `sort_order`
- `is_active`

The homepage view renders each section as a 6-slot grid on desktop with 4 live tiles and 2 empty placeholders, and routes tile clicks into shopping search.
Each starter section now seeds 4 tiles by default. The current homepage set covers:

- Mobile accessories
- Jewellery
- Bags
- Furniture

The shared seed list lives in `apps/api/src/modules/shopping/homepage-visual-menu.ts` and is reused by both the database seed and the shopping search verifier.
Sidebar category searches are cached in the database for 7 days when they come from menu clicks, so repeated visits avoid a fresh TMAPI/OTAPI request while the cache is still warm.

## Public Shopping Endpoints

- `GET /api/public/shopping/categories`
- `GET /api/public/shopping/search`
- `GET /api/public/shopping/item/:externalId`
- `GET /api/public/shopping/vendor/:vendorId`
- `GET /api/public/shopping/hot`
- `GET /api/public/shopping/offers`
- `GET /api/public/shopping/home-curated`
- `POST /api/public/shopping/upload-image`
- `GET /api/public/image-proxy`

## Local Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm --filter @bridgechina/api build
pnpm --filter @bridgechina/web build
pnpm --filter @bridgechina/api sync:shopping-taxonomy
pnpm --filter @bridgechina/api verify:shopping-search
pnpm --filter @bridgechina/api db:push
pnpm --filter @bridgechina/api db:seed
```

## Operational Notes

- Keep provider-specific code separate. Improve TMAPI in `shopping`; improve OTAPI in `shopping_otapi`.
- Do not commit real API tokens into documentation.
- If the left menu does not show new categories, run `sync:shopping-taxonomy` and reload the web app.
- If English text search becomes broad, verify whether the global endpoint is receiving the original phrase or a generic canonical term.
- If Chinese search becomes broad, add targeted terms to `GROUP_ZH_HINTS`, `SUBGROUP_ZH_HINTS`, or the query rewrite table.
