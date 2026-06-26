# BridgeChina / ChinabuyBD

BridgeChina has been reset into a shopping-first ecommerce platform backed by a new PostgreSQL database named `chinabuybd`.

The old service-request flow has been removed from the active product. The new system focuses on:

- product discovery and shopping search
- shopping cart and checkout
- payment proof upload
- seller approval and admin fulfillment tracking
- manual product management from the admin panel
- blog posts and homepage promos
- WhatsApp/Twilio messaging support

## Roles

The ecommerce backend uses three primary roles:

- `CUSTOMER` - browse products, add to cart, checkout, upload payment proof, track order status
- `SELLER` - review incoming purchase items, approve/reject payment proofs, manage products
- `ADMIN` - see seller-approved orders, update order fulfillment status, manage catalog content, blog content, and homepage content

## Database

- Database name: `chinabuybd`
- PostgreSQL schema: `public`
- Prisma schema file: `apps/api/prisma/schema.ecommerce.prisma`

The ecommerce schema includes:

- `users`, `roles`, `user_roles`
- `customer_profiles`, `seller_profiles`
- `addresses`
- `products`, `product_categories`
- `carts`, `cart_items`
- `orders`, `order_items`
- `payment_proofs`
- `shipping_updates`, `order_status_events`
- `blog_posts`
- `homepage_banners`, `homepage_offers`
- `external_search_cache`, `external_catalog_items`, `external_hot_items`
- `media_assets`
- `conversations`, `messages`
- `twilio_webhook_events`, `twilio_message_statuses`
- `site_settings`

Legacy tables for hotels, medical, tours, restaurants, transport, eSIM, and service requests are no longer part of the ecommerce backend.

## Tech Stack

- Frontend: Vue 3 + Vite + TypeScript + TailwindCSS + Pinia + Vue Router
- Backend: Fastify + TypeScript + Prisma ORM
- Database: PostgreSQL
- Storage: Cloudflare R2
- Auth: JWT access tokens + httpOnly refresh cookie
- Messaging: Twilio WhatsApp
- Shopping search: OTAPI or TMAPI, controlled by `IS_OTAPI_ACTIVE`

## Local Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure API environment

Create `apps/api/.env` with a local PostgreSQL URL that points to `chinabuybd`:

```bash
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/chinabuybd?schema=public"
JWT_ACCESS_SECRET="your-secure-random-string"
JWT_REFRESH_SECRET="your-secure-random-string"
JWT_ACCESS_EXPIRES="12h"
JWT_REFRESH_EXPIRES="14d"
APP_BASE_URL="http://localhost:5173"
PORT=3000
NODE_ENV="development"

IS_OTAPI_ACTIVE="true"
TMAPI_API_16688_TOKEN=""
TMAPI_BASE_URL="https://api.tmapi.top"
OTAPI_BASE_URL=""

TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_WHATSAPP_FROM=""
TWILIO_WEBHOOK_VALIDATE="true"

R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET=""
R2_PUBLIC_BASE_URL=""
R2_ENDPOINT=""
```

### 3. Reset and sync the database

This repo is now designed for a clean ecommerce reset.

```bash
pnpm --filter @bridgechina/api db:migrate
pnpm --filter @bridgechina/api db:seed
```

The reset command runs `prisma db push --force-reset` against `apps/api/prisma/schema.ecommerce.prisma`.

### 4. Start development

```bash
pnpm dev
```

## Seeded Accounts

After seeding, these accounts are available:

- Admin: `admin@chinabuybd.com` / `admin123`
- Seller: `seller@chinabuybd.com` / `seller123`
- Customer: `customer@chinabuybd.com` / `customer123`

## Useful Commands

### API

```bash
pnpm --filter @bridgechina/api build
pnpm --filter @bridgechina/api db:generate
pnpm --filter @bridgechina/api db:studio
pnpm --filter @bridgechina/api db:seed
pnpm --filter @bridgechina/api db:seed:roles
```

### Web

```bash
pnpm --filter @bridgechina/web build
pnpm --filter @bridgechina/web dev
```

## Railway Deployment

This repo should run as separate Railway services from the same GitHub repository:

- API service: uses the root `railway.toml` and deploys `@bridgechina/api`.
- Web service: uses `apps/web/railway.toml` and deploys `@bridgechina/web`.
- PostgreSQL service: provides the API `DATABASE_URL`.

### Frontend Service on Railway

To move the frontend from Vercel to Railway, create a new Railway service in the same Railway project as the API and connect it to this GitHub repo.

Use these service settings:

```text
Service name: bridgechina-web
Source: GitHub repo for this monorepo
Branch: main, or the production branch you already use
Root Directory: /
Config File Path: /apps/web/railway.toml
```

Keep the root directory at `/`. The web app imports workspace packages from `packages/ui` and `packages/shared`, so building only from `apps/web` will not have the full workspace context. Railway config files also do not follow the root directory automatically, so the frontend service must point directly to `/apps/web/railway.toml`.

The frontend Railway config builds and starts the app with:

```bash
pnpm install --frozen-lockfile && pnpm --filter @bridgechina/web build
bash apps/web/start.sh
```

Set this frontend service variable before deploying:

```text
VITE_API_URL=https://your-api-domain
```

Use the public API origin only, with no trailing `/api`. For example:

```text
VITE_API_URL=https://api.chinabuybd.com
```

Then update the API Railway service variables so cookies, redirects, CORS, and generated links know about the new frontend:

```text
APP_BASE_URL=https://www.chinabuybd.com
WEB_APP_URL=https://www.chinabuybd.com
FRONTEND_URL=https://www.chinabuybd.com
ALLOWED_ORIGINS=https://www.chinabuybd.com,https://chinabuybd.com
API_BASE_URL=https://api.chinabuybd.com
```

If you keep the Railway-generated API domain instead of a custom API domain, use that URL for `VITE_API_URL` and `API_BASE_URL`.

### Domain Setup

Recommended production mapping:

```text
www.chinabuybd.com -> Railway frontend service
chinabuybd.com     -> Railway frontend service, or redirect to www
api.chinabuybd.com -> Railway API service
```

In Railway, open each service and go to `Settings -> Networking -> Public Networking`.

For the frontend service:

1. Generate a Railway domain first and verify the site loads.
2. Add the custom domain `www.chinabuybd.com`.
3. Add the DNS records Railway shows at your DNS provider. Railway normally provides a `CNAME` record and a `TXT` verification record; both are required.
4. Add `chinabuybd.com` too if the apex/root domain should load the frontend.

For the API service:

1. Add the custom domain `api.chinabuybd.com`.
2. Add the Railway-provided `CNAME` and `TXT` records at your DNS provider.
3. After the domain verifies, update frontend `VITE_API_URL` and API `API_BASE_URL` to `https://api.chinabuybd.com`.

For an apex/root domain such as `chinabuybd.com`, use a DNS provider that supports CNAME flattening, ALIAS, or ANAME records. Do not use an `A` record unless Railway explicitly gives you one; Railway domains are dynamic and are normally configured with CNAME-style records plus TXT verification.

After DNS verifies and both services redeploy, test:

```text
https://www.chinabuybd.com
https://api.chinabuybd.com/health
```

If login, cart, or admin requests fail in the browser, check the API service logs for CORS errors and make sure `ALLOWED_ORIGINS`, `APP_BASE_URL`, and `WEB_APP_URL` exactly match the final frontend domain, including `https://`.

## Public API Surface

- `POST /api/public/shopping/upload-image`
- `GET /api/public/image-proxy`
- `GET /api/public/shopping/search`
- `GET /api/public/shopping/item/:externalId`
- `GET /api/public/shopping/hot`
- `GET /api/public/shopping/offers`
- `GET /api/public/shopping/recent-searches`
- `GET /api/public/shopping/categories`

## App Flow

1. Customer searches or browses products.
2. Customer adds products to cart and checks out.
3. Customer uploads a payment slip to the order.
4. Seller approves or rejects the payment proof.
5. Admin marks the order through fulfillment states such as `purchased`, `in_warehouse`, `shipped`, and `received`.
6. Customer and seller can both view order progress.

## Notes

- Product search cache remains in the system for shopping results.
- Manual product creation is supported from the admin panel.
- Blog and homepage banners/offers are included in the ecommerce schema.
- The category sidebar and top search experience are shared across public shopping pages.
- Advanced shopping provider, TMAPI, taxonomy, and search verification notes are in `ADVANCED_README.md`.
- Homepage visual menu tiles live in the new `homepage_visual_menu_items` table and can be edited from the admin panel.
- The starter homepage tile set now includes 4 tiles each for Mobile accessories, Jewellery, Bags, and Furniture, with two empty grid slots kept for layout balance.
- Menu-driven searches are cached in the database for 7 days so repeated clicks on the same sidebar submenu avoid hitting TMAPI or OTAPI when the data is still fresh.
- In production, set `VITE_API_URL` to the backend origin, for example `https://bridgechina-production.up.railway.app`, so proxied 1688 images resolve correctly outside local dev.
