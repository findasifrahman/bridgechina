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
