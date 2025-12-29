# BridgeChina Monorepo

A premium, modern, responsive web platform for international travelers in China. BridgeChina provides hotel booking assistance, airport pickup/transport, halal food discovery, medical assistance, car rental/driver booking, translation/local help, tour booking, eSIM services, and a shopping marketplace.

## Tech Stack

- **Monorepo**: pnpm workspaces
- **Frontend**: Vue 3 + Vite + TypeScript + TailwindCSS + Pinia + Vue Router
- **Backend**: Fastify + TypeScript + Prisma ORM
- **Database**: PostgreSQL
- **Storage**: Cloudflare R2 (S3 compatible)
- **Auth**: JWT with refresh tokens (httpOnly cookies) + RBAC

## Project Structure

```
bridgechina/
├── apps/
│   ├── api/          # Fastify API server
│   └── web/           # Vue 3 frontend
├── packages/
│   ├── shared/        # Shared types and Zod schemas
│   └── ui/            # Shared Vue UI components
└── package.json       # Root workspace config
```

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- PostgreSQL (local or Railway)

## Local Development Setup

### 1. Install PostgreSQL

**Windows:**
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Install with default settings
3. Remember the postgres user password you set during installation
4. PostgreSQL will run on `localhost:5432` by default

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE bridgechina;

# Exit psql
\q
```

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Configure Environment Variables

Create `.env` files in `apps/api/`:

```bash
# apps/api/.env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/bridgechina?schema=public"
JWT_ACCESS_SECRET="your-secure-random-string-here"
JWT_REFRESH_SECRET="your-secure-random-string-here"
JWT_ACCESS_EXPIRES="15m"
JWT_REFRESH_EXPIRES="14d"
APP_BASE_URL="http://localhost:5173"
PORT=3000
NODE_ENV="development"

# Optional: Cloudflare R2 (S3-compatible)
# Get these from Cloudflare Dashboard > R2 > Manage R2 API Tokens
# Create an "S3 API Token" to get ACCESS_KEY_ID and SECRET_ACCESS_KEY
R2_ACCOUNT_ID=""              # Your Cloudflare account ID
R2_ACCESS_KEY_ID=""           # From S3 API Token (not API token)
R2_SECRET_ACCESS_KEY=""       # From S3 API Token (not API token)
R2_BUCKET=""                  # Your R2 bucket name
R2_PUBLIC_BASE_URL=""         # Public URL (custom domain or public bucket URL)
R2_ENDPOINT=""                # Usually: https://<account-id>.r2.cloudflarestorage.com
                              # Or use your custom domain endpoint

# Optional: Redis
REDIS_URL=""                  # Leave empty if not using Redis
```

### 5. Generate Prisma Client & Run Migrations

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed database (optional)
pnpm db:seed
```

**Default Admin Credentials** (from seed):
- Email: `admin@bridgechina.com`
- Password: `admin123` (change in production!)

**Default Seller Credentials**:
- Email: `seller@bridgechina.com`
- Password: `seller123` (change in production!)

### 6. Start Development Servers

```bash
# Start both API and Web servers
pnpm dev
```

- API: http://localhost:3000
- Web: http://localhost:5173

## Current Status

### ✅ Completed Features

#### Authentication & Authorization
- ✅ JWT-based authentication with refresh tokens (httpOnly cookies)
- ✅ Role-Based Access Control (RBAC): ADMIN, OPS, EDITOR, SELLER, PARTNER, USER
- ✅ Frontend route guards for protected routes
- ✅ API middleware for role-based access
- ✅ User registration and login
- ✅ Role-based redirects after login (admin → /admin, seller → /seller, user → /app)

#### Database Schema
- ✅ Complete Prisma schema with 40+ tables
- ✅ Image tables for all services (HotelImage, RestaurantImage, MedicalImage, TourImage, TransportImage, CityImage, ProductImage, EsimImage)
- ✅ Trip.com-style service fields:
  - Hotels: ratings, reviews, star ratings, amenities, facilities, check-in/out times
  - Restaurants: ratings, cuisine types, price ranges, opening hours, specialties
  - Medical Centers: ratings, specialties, services, emergency availability
  - Tours: ratings, highlights, inclusions/exclusions, cancellation policies, group sizes
  - Transport: vehicle types, capacity, features, per-km pricing
- ✅ Enhanced eSIM plans with:
  - Package codes, supported operators, data speeds
  - SMS enabled/disabled, number availability
  - Country, region, package type (single/multi-country)
  - Data amount (GB) and period (daily/total)
- ✅ Enhanced products with:
  - Ratings, reviews, SKU, brand, tags
  - Original price (for discounts), weight, dimensions
  - Specifications (key-value pairs)

#### Admin Panel
- ✅ Dashboard with KPIs (leads, requests, orders)
- ✅ Catalog Management (Full CRUD):
  - Cities, Hotels, Restaurants, Medical Centers, Tours, Transport Products
  - Searchable tables with filters
  - Create/Edit modals with all fields
  - Delete confirmation dialogs
  - Tour linking for City Places
- ✅ Shopping Management (Full CRUD):
  - Product Categories (hierarchical)
  - Products with full ecommerce fields
  - Order management
- ✅ Service Requests Management:
  - List with filters (status, category, city)
  - Detailed view with service-specific fields
  - Status updates and assignment
- ✅ Leads Management:
  - CRUD operations
  - Convert to service request
  - Assignment to ops users
- ✅ Media Library:
  - R2 presigned URL upload
  - Media grid with search
  - Media picker modal for use in forms
- ✅ Blog Management:
  - Create/edit/publish blog posts
- ✅ Homepage Management:
  - Configure offer strips
  - Manage promo cards
  - Set featured listings
- ✅ User Management:
  - List users
  - Assign roles
- ✅ Payments:
  - Record cash payments
  - Link to requests/orders
- ✅ Activity Logs:
  - Audit trail for admin actions

#### Seller Dashboard
- ✅ Product management (create/edit with images)
- ✅ Order management (view seller's orders)
- ✅ Dashboard with KPIs

#### Public Website
- ✅ Homepage (Trip.com-inspired):
  - Compact, information-dense layout
  - Left service sidebar (desktop)
  - AI search bar
  - Offer strip
  - Promo cards
  - Featured carousel
  - Popular in city section
- ✅ Services pages:
  - Services overview
  - Individual service detail pages (hotel, transport, halal_food, medical, translation_help, shopping, tours, esim)
- ✅ Shopping interface (ecommerce):
  - Product grid with filters
  - Category navigation
  - Search functionality
  - Product detail pages
  - Add to cart (stub)
- ✅ Cities pages:
  - City listing
  - City detail pages
- ✅ Blog:
  - Blog listing
  - Blog post detail pages
- ✅ Contact page
- ✅ Gallery (location-based images)
- ✅ Help page

#### Service Request Flow
- ✅ 3-step wizard:
  1. City + Category selection
  2. Category-specific fields
  3. Contact details + submit
- ✅ Guest submission support (creates lead)
- ✅ Creates service_request + service-specific records

#### Design System
- ✅ BridgeChina brand identity (Teal + Amber)
- ✅ Shared UI component library (`packages/ui`)
- ✅ Consistent layouts (MarketingLayout, AppLayout, AdminLayout, SellerLayout)
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Icon system (lucide-vue-next)
- ✅ Toast notifications
- ✅ Loading states and skeletons

### 🚧 In Progress / Planned

#### Shopping Cart & Checkout
- ⏳ Full cart functionality
- ⏳ Checkout flow
- ⏳ Payment integration
- ⏳ Order tracking

#### eSIM Service
- ⏳ eSIM purchase flow
- ⏳ QR code generation
- ⏳ Activation instructions

#### Advanced Features
- ⏳ Redis caching (hooks ready, needs REDIS_URL)
- ⏳ WhatsApp integration (webhook endpoints stubbed)
- ⏳ AI search enhancement (currently mocked)
- ⏳ Email notifications
- ⏳ SMS notifications

#### Testing
- ⏳ Unit tests
- ⏳ Integration tests
- ⏳ E2E tests

## API Endpoints

### Public Endpoints
- `GET /api/public/cities` - List active cities
- `GET /api/public/catalog/*` - Catalog listings (hotels, restaurants, medical, tours, transport)
- `GET /api/public/shopping/categories` - Product categories
- `GET /api/public/shopping/products` - Products (with search/filters)
- `GET /api/public/shopping/products/:id` - Product detail
- `GET /api/public/blog` - Blog posts
- `GET /api/public/blog/:slug` - Blog post detail
- `GET /api/public/search` - Unified search
- `POST /api/public/ai-search` - AI search (mocked)
- `POST /api/public/service-request` - Submit service request
- `POST /api/public/lead` - Submit lead
- `GET /api/public/geo` - City detection
- `GET /api/public/catalog/esim` - eSIM plans

### Auth Endpoints
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Get current user

### Admin Endpoints
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/leads` - List leads
- `GET /api/admin/leads/:id` - Lead detail
- `POST /api/admin/leads` - Create lead
- `PUT /api/admin/leads/:id` - Update lead
- `GET /api/admin/requests` - List service requests
- `GET /api/admin/requests/:id` - Request detail
- `PUT /api/admin/requests/:id` - Update request
- `GET /api/admin/catalog/*` - Catalog CRUD
- `POST /api/admin/catalog/*` - Create catalog item
- `PUT /api/admin/catalog/*/:id` - Update catalog item
- `DELETE /api/admin/catalog/*/:id` - Delete catalog item
- `GET /api/admin/shopping/*` - Shopping CRUD
- `POST /api/admin/shopping/*` - Create shopping item
- `PUT /api/admin/shopping/*/:id` - Update shopping item
- `DELETE /api/admin/shopping/*/:id` - Delete shopping item
- `GET /api/admin/media` - Media library
- `POST /api/admin/media/presigned-url` - Get presigned upload URL
- `POST /api/admin/media` - Record uploaded asset
- `GET /api/admin/homepage/blocks` - Homepage blocks
- `POST /api/admin/homepage/blocks` - Create homepage block
- `PUT /api/admin/homepage/blocks/:id` - Update homepage block
- `GET /api/admin/users` - List users
- `PUT /api/admin/users/:id/roles` - Update user roles

### Seller Endpoints
- `GET /api/seller/dashboard` - Seller dashboard
- `GET /api/seller/products` - Seller's products
- `POST /api/seller/products` - Create product
- `PUT /api/seller/products/:id` - Update product
- `GET /api/seller/orders` - Seller's orders

## Database Schema Highlights

### Service Tables (with Image Relations)
- `hotels` - Hotels with ratings, amenities, facilities
- `restaurants` - Restaurants with cuisine types, price ranges
- `medical_centers` - Medical centers with specialties, services
- `tours` - Tours with highlights, inclusions/exclusions
- `transport_products` - Transport with vehicle types, capacity
- `cities` - Cities with descriptions, highlights

### Image Tables
- `hotel_images` - Multiple images per hotel
- `restaurant_images` - Multiple images per restaurant
- `medical_images` - Multiple images per medical center
- `tour_images` - Multiple images per tour
- `transport_images` - Multiple images per transport product
- `city_images` - Multiple images per city
- `product_images` - Multiple images per product
- `esim_images` - Multiple images per eSIM plan

### eSIM Plans
- `esim_plans` - eSIM packages with:
  - Package codes, providers, countries
  - Data amounts, validity, speeds
  - Supported operators
  - SMS and number availability flags

### Shopping
- `product_categories` - Hierarchical categories
- `products` - Products with ratings, reviews, SKU, specifications
- `carts` - Shopping carts
- `cart_items` - Cart items
- `orders` - Orders
- `order_items` - Order items
- `shipping_updates` - Shipping tracking

## Scripts

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed database
pnpm db:seed

# Start development servers
pnpm dev

# Build for production
pnpm build

# Type check
pnpm type-check

# Lint
pnpm lint
```

## Production Deployment

### Railway (Database)

1. Create account at https://railway.app
2. Create new PostgreSQL service
3. Copy the `DATABASE_URL` from Railway dashboard
4. Update `apps/api/.env` with Railway `DATABASE_URL`

### Cloudflare R2 (Storage)

1. Create R2 bucket in Cloudflare Dashboard
2. Create S3 API Token
3. Add R2 credentials to `apps/api/.env`
4. Configure public bucket URL or custom domain

### Environment Variables (Production)

Set all required environment variables in your hosting platform (Vercel, Railway, etc.)

## Brand Guidelines

BridgeChina uses a consistent Teal + Amber color scheme:

- **Primary (Teal)**: `teal-600`, `teal-700`, `teal-500`
- **Accent (Amber)**: `amber-400`, `amber-500`, `amber-600`
- **Neutrals**: `slate-50/100/200/600/800/900`
- **Background**: `slate-50` with subtle gradients

See `packages/ui/BrandGuidelines.md` for detailed component usage.

## Contributing

1. Create a feature branch
2. Make your changes
3. Ensure all tests pass
4. Submit a pull request

## License

Proprietary - BridgeChina

## Support

For issues or questions, contact the development team.
