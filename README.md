# BridgeChina Monorepo

A premium, modern, responsive web platform for international travelers in China. BridgeChina provides hotel booking assistance, airport pickup/transport, halal food discovery, medical assistance, car rental/driver booking, translation/local help, tour booking, eSIM services, and a shopping marketplace.

## Tech Stack

- **Monorepo**: pnpm workspaces
- **Frontend**: Vue 3 + Vite + TypeScript + TailwindCSS + Pinia + Vue Router
- **Backend**: Fastify + TypeScript + Prisma ORM
- **Database**: PostgreSQL
- **Storage**: Cloudflare R2 (S3 compatible)
- **Auth**: JWT with refresh tokens (httpOnly cookies) + RBAC
- **AI/ML**: OpenAI (GPT-4o-mini) for chat agent and intent detection
- **Web Search**: Tavily API for real-time information retrieval
- **External APIs**: 
  - Booking.com (RapidAPI) for hotel search and details
  - TMAPI (1688.com) for shopping product and factory search

## Project Structure

```
bridgechina/
├── apps/
│   ├── api/                    # Fastify API server
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── chat/        # AI Chat Agent (OpenAI + Tavily)
│   │   │   │   ├── hotels/      # Booking.com integration service
│   │   │   │   └── shopping/    # TMAPI 1688.com integration
│   │   │   └── routes/          # API route handlers
│   │   └── prisma/              # Database schema and migrations
│   └── web/                     # Vue 3 frontend
│       └── src/
│           ├── pages/           # Page components
│           │   ├── HotelsListPage.vue      # Hotel search and listing
│           │   ├── HotelDetailPage.vue     # Hotel details (internal + external)
│           │   └── ShoppingPage.vue        # Shopping with TMAPI integration
│           └── components/      # Reusable components
│               └── FloatingChatWidget.vue   # AI chat interface
├── packages/
│   ├── shared/                  # Shared types and Zod schemas
│   └── ui/                      # Shared Vue UI components
└── package.json                 # Root workspace config
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

# AI Chat Agent (OpenAI + Tavily)
OPENAI_API_KEY=""             # OpenAI API key for chat agent
OPENAI_MODEL="gpt-4o-mini"    # Main model for chat responses
OPENAI_ROUTER_MODEL="gpt-4o-mini"  # Model for intent detection/routing
OPENAI_DISTILL_MODEL="gpt-4o-mini" # Model for translation/distillation
TAVILY_API_KEY=""             # Tavily API key for web search

# External Hotel Provider (Booking.com via RapidAPI)
RAPID_API_KEY=""              # RapidAPI key for Booking.com integration

# Shopping Integration (TMAPI 1688.com)
TMAPI_API_16688_TOKEN=""      # TMAPI token for 1688.com product search
TMAPI_BASE_URL="https://api.tmapi.top"  # TMAPI base URL (default)

# WhatsApp Integration (Twilio)
TWILIO_ACCOUNT_SID=""         # Twilio Account SID
TWILIO_AUTH_TOKEN=""          # Twilio Auth Token
TWILIO_WHATSAPP_FROM=""       # WhatsApp sender number (e.g., whatsapp:+14155238886)
                              # For testing: Use Twilio sandbox number (whatsapp:+14155238886)
                              # For production: Use your verified WhatsApp Business number from Twilio
TWILIO_WEBHOOK_VALIDATE="true"  # Enable webhook signature validation (true/false)
                              # Set to false or leave unset for testing without signature validation

# WeCom Notifications (Optional)
WECOM_GROUP_BOT_WEBHOOK_URL=""  # WeCom group bot webhook URL for notifications
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
- ✅ Complete Prisma schema with 50+ tables
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
- ✅ **External Hotel Integration**:
  - `ExternalHotelProvider` - External hotel provider configuration
  - `ExternalDestination` - Cached destination lookups (cities, hotels)
  - `ExternalHotel` - External hotel data with full details (Booking.com)
  - `ExternalHotelSearchCache` - Search result caching (5-day TTL)
  - `HotelBooking` - Extended with `hotel_source` (INTERNAL/BOOKINGCOM) and external hotel ID
- ✅ **Shopping Integration**:
  - `ExternalSearchCache` - TMAPI search result caching
  - `ExternalCatalogItem` - Cached product data from TMAPI

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
  - AI search bar with floating chat widget
  - Offer strip
  - Promo cards
  - Featured carousel
  - Popular in city section
- ✅ Services pages:
  - Services overview
  - Individual service detail pages (hotel, transport, halal_food, medical, translation_help, shopping, tours, esim)
- ✅ **Hotel Booking**:
  - Combined internal and external hotel search
  - City search (Guangzhou only) and hotel name search
  - Date range picker with guest/room selection
  - Client-side filters (price, rating, cancellation, breakfast)
  - Hotel detail pages with rich information:
    - Image galleries (deduplicated)
    - Highlights, facilities, payment methods
    - Description, review scores, nearby attractions
    - Price display (per night and total)
    - Booking request flow for both internal and external hotels
- ✅ **Shopping interface** (ecommerce):
  - Product grid with filters
  - Category navigation
  - Search functionality (keyword and image search)
  - Product detail pages
  - TMAPI 1688.com integration:
    - Product search by keyword (with Chinese translation)
    - Factory/supplier search for sourcing
    - Image search for visual product discovery
    - Product details with images, prices, supplier info
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

#### Hotel Features (Future Enhancements)
- ⏳ Review scores display (API ready, UI commented out for future use)
- ⏳ Nearby attractions display (API ready, UI commented out for future use)
- ⏳ Advanced filtering and sorting
- ⏳ Price alerts and notifications

#### AI Chat Agent
- ✅ **Intelligent Chat Assistant**:
  - OpenAI-powered intent detection and routing
  - Session-based conversation memory (last 5 turns)
  - Multilingual input support (outputs English only)
  - Intent classification: HOTEL, TRANSPORT, TOUR, MEDICAL, HALAL_FOOD, SHOPPING, ESIM, CITY_INFO, MARKET_INFO, GENERAL_CHINA, OUT_OF_SCOPE
  - Service availability guard (Guangzhou/Hainan only for certain services)
  - Shopping intent routing:
    - RETAIL: Product search via TMAPI with price/supplier info
    - FACTORY: Supplier/factory search with Tavily enrichment
  - Tavily web search integration for:
    - Factory/supplier verification and enrichment
    - Market information
    - General China information
  - Greeting short-circuit (immediate friendly responses)
  - English output enforcement (auto-translation if needed)
  - Response formatting with inline images and structured cards
  - Price extraction and display from external APIs
  - Keyword translation to Chinese for TMAPI searches

#### Advanced Features
- ✅ **External Hotel Integration**:
  - Booking.com RapidAPI integration
  - Hotel search by city (Guangzhou) and by hotel name
  - Rich hotel details (images, facilities, reviews, pricing)
  - Search result caching (5-day TTL)
  - Fallback to cached data if API fails
  - Price extraction and display
  - Auto-add Guangzhou for hotel name searches
- ✅ **Shopping Integration**:
  - TMAPI 1688.com product search
  - Factory/supplier search for sourcing
  - Image search for visual discovery
  - Product caching and normalization
  - Chinese keyword translation for accurate results
- ⏳ Redis caching (hooks ready, needs REDIS_URL)
- ⏳ WhatsApp integration (webhook endpoints stubbed)
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
- `GET /api/public/hotels/search` - Combined hotel search (internal + external Booking.com)
  - Query params: `mode` (city/name), `q`, `checkin`, `checkout`, `adults`, `room_qty`, `page_number`
  - Returns: Combined internal and external hotels with prices
- `GET /api/public/hotels/external/:hotelId/details` - External hotel details (Booking.com)
  - Query params: `checkin`, `checkout`, `adults`, `room_qty`
  - Returns: Full hotel details with images, facilities, reviews, pricing
- `GET /api/public/catalog/hotels/:id` - Hotel details (handles both internal UUIDs and external IDs)
- `POST /api/hotel-bookings/request` - Create hotel booking request (authenticated)
- `GET /api/public/shopping/categories` - Product categories (TMAPI)
- `GET /api/public/shopping/products` - Products (with search/filters, TMAPI integration)
- `GET /api/public/shopping/products/:id` - Product detail (TMAPI)
- `POST /api/public/shopping/search/keyword` - Search products by keyword (TMAPI)
- `POST /api/public/shopping/search/image` - Search products by image (TMAPI)
- `GET /api/public/shopping/factories` - Search factories/suppliers (TMAPI)
- `GET /api/public/blog` - Blog posts
- `GET /api/public/blog/:slug` - Blog post detail
- `GET /api/public/search` - Unified search
- `POST /api/public/ai-search` - AI Chat Agent (OpenAI + Tavily)
  - Body: `{ query: string, sessionId?: string }`
  - Returns: `{ response: string, images: string[], sessionId: string, cards?: array }`
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

### Ops Endpoints (ADMIN, OPS, SELLER, PARTNER)
- `GET /api/ops/conversations` - List WhatsApp conversations
- `GET /api/ops/conversations/:id` - Get conversation detail
- `POST /api/ops/conversations/:id/takeover` - Take over conversation (HUMAN mode)
- `POST /api/ops/conversations/:id/release` - Release conversation to AI
- `POST /api/ops/conversations/:id/reply` - Send reply to conversation

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
- `external_search_cache` - TMAPI search result caching
- `external_catalog_items` - Cached product data from TMAPI
- `carts` - Shopping carts
- `cart_items` - Cart items
- `orders` - Orders
- `order_items` - Order items
- `shipping_updates` - Shipping tracking

### External Hotel Integration
- `external_hotel_providers` - External hotel provider configuration
- `external_destinations` - Cached destination lookups (cities, hotels, airports)
- `external_hotels` - External hotel data with full details:
  - Basic info (name, city, address, coordinates)
  - Ratings and reviews
  - Pricing (gross_price, strikethrough_price, currency)
  - Images (cover_photo_url, photo_urls, gallery_photos)
  - Facilities, highlights, payment methods
  - Description, review scores, attractions
  - Raw API responses for full data preservation
- `external_hotel_search_cache` - Search result caching (5-day TTL)
- `hotel_bookings` - Extended with `hotel_source` (INTERNAL/BOOKINGCOM) and `external_hotel_id`

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

### Twilio WhatsApp Configuration

1. Create a Twilio account and get a WhatsApp sender number
2. Test webhook endpoints are accessible:
   - **Health check**: `GET https://bridgechina-production.up.railway.app/api/webhooks/twilio/whatsapp/health`
   - This should return `{"status":"ok","service":"twilio-whatsapp-webhook",...}`
3. Set up webhooks in Twilio Console:
   - **Incoming message webhook**: `https://bridgechina-production.up.railway.app/api/webhooks/twilio/whatsapp/inbound`
   - **Status callback**: `https://bridgechina-production.up.railway.app/api/webhooks/twilio/whatsapp/status`
4. Add environment variables:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_WHATSAPP_FROM` (e.g., `whatsapp:+14155238886`)
   - `TWILIO_WEBHOOK_VALIDATE=true` (enable signature validation)
   - `WECOM_GROUP_BOT_WEBHOOK_URL` (optional, for WeCom notifications)

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
