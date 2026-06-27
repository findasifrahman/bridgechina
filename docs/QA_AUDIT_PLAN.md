# ChinaBuyBD / BridgeChina — QA Audit Plan

**Generated:** 2026-06-27  
**Project:** `C:\Users\asif\Desktop\bridgechina`  
**Live Site:** https://www.chinabuybd.com/  
**Stack:** Fastify (Node/TypeScript) API · Vue 3 SPA · PostgreSQL + Prisma · pnpm monorepo  
**Auditor role:** Senior ecommerce QA + security tester  

---

## 1. Discovered Roles

| Role | Auth Check | Scope |
|------|-----------|-------|
| `USER` (default) | JWT authenticated | Own orders, cart, profile |
| `SELLER` | JWT + role `SELLER` or `ADMIN` | Dashboard, seller's own orders, leads |
| `ADMIN` | JWT + role `ADMIN` | Full system access |
| Anonymous | None | Public shopping, search |

**Risk flags:**
- Seller middleware accepts `SELLER OR ADMIN` — admin can masquerade as seller
- No sub-admin or limited-admin role
- Role check on backend is a string includes; no enum guard visible

---

## 2. Discovered Routes & Pages

### 2.1 Public / Anonymous

| Path | Component | Notes |
|------|-----------|-------|
| `/` | `ShoppingPage.vue` | Homepage banners, featured items |
| `/shopping` | `ShoppingPage.vue` | Browse all products |
| `/shopping/browse` | — | Category browsing |
| `/shopping/shop/:vendorId` | — | Per-vendor shop page |
| `/shopping/item/:externalId` | `TmapiProductDetailPage.vue` | Product detail (external ID) |
| `/shopping/cart` | `ShoppingCartPage.vue` | Cart + checkout combined |
| `/login` | `LoginPage.vue` | Email / phone / Google login |
| `/register` | `RegisterPage.vue` | New user signup |
| `/forgot-password` | — | Password reset |
| `/auth/google/callback` | — | OAuth callback |
| `/contact` | — | Contact page |
| `/blog` | — | Blog listing |
| `/terms` | — | T&C page |

### 2.2 Authenticated (requiresAuth)

| Path | Component | Notes |
|------|-----------|-------|
| `/user/` | `UserLayout.vue` | User dashboard |
| `/user/profile` | — | Profile & address management |
| `/user/orders` | — | Order history + detail |

### 2.3 Seller (requiresRole: SELLER)

| Path | Component |
|------|-----------|
| `/seller/` | `DashboardPage.vue` |
| `/seller/products` | `ProductsPage.vue` |
| `/seller/orders` | `OrdersPage.vue` |
| `/seller/potential-leads` | `PotentialLeadsPage.vue` |

### 2.4 Admin (requiresRole: ADMIN)

| Path | Component |
|------|-----------|
| `/admin/` | `DashboardPage.vue` |
| `/admin/shopping` | `ShoppingPage.vue` — product/category CRUD |
| `/admin/pricing` | `PricingSettingsPage.vue` — markup, shipping rates |
| `/admin/orders` | `OrdersPage.vue` |
| `/admin/payment-proofs` | `PaymentsPage.vue` |
| `/admin/potential-leads` | `PotentialLeadsPage.vue` |
| `/admin/media` | `MediaPage.vue` |
| `/admin/homepage` | `HomepageBannersPage.vue` |
| `/admin/homepage-offers` | `HomepageOffersPage.vue` |
| `/admin/homepage-visual-menu` | `HomepageVisualMenuPage.vue` |
| `/admin/blog` | `BlogPage.vue` |
| `/admin/users` | `UsersPage.vue` |
| `/admin/sellers` | `SellersPage.vue` |

---

## 3. Discovered APIs

### 3.1 Auth (`/api/auth/*`) — Public

| Method | Endpoint | Purpose |
|--------|---------|---------|
| POST | `/api/auth/email/request-code` | Send email OTP |
| POST | `/api/auth/email/verify-code` | Verify email OTP → JWT |
| POST | `/api/auth/phone/request-otp` | Send SMS OTP |
| POST | `/api/auth/phone/verify-otp` | Verify phone OTP → JWT |
| POST | `/api/auth/login` | Email + password login |
| POST | `/api/auth/register` | New user registration |
| POST | `/api/auth/forgot-password` | Password reset request |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/google` | Initiate Google OAuth |
| GET | `/api/auth/google/callback` | Google OAuth callback |

### 3.2 Public Shopping (`/api/public/*`)

| Method | Endpoint | Purpose |
|--------|---------|---------|
| GET | `/api/public/products` | Product list / search |
| GET | `/api/public/products/:id` | Product detail |
| GET | `/api/public/categories` | Category tree |
| POST | `/api/public/turnstile` | CAPTCHA verification |
| GET | `/api/public/homepage` | Banner / block data |
| GET | `/api/public/blog` | Blog posts |

### 3.3 User (`/api/user/*`) — requiresAuth

| Method | Endpoint | Purpose |
|--------|---------|---------|
| GET | `/api/user/profile` | Get profile |
| PATCH | `/api/user/profile` | Update profile |
| GET | `/api/user/addresses` | List addresses |
| POST | `/api/user/addresses` | Add address |
| PUT | `/api/user/addresses/:id` | Update address |
| DELETE | `/api/user/addresses/:id` | Delete address |
| GET | `/api/user/cart` | Get cart |
| POST | `/api/user/cart/items` | Add to cart |
| POST | `/api/user/cart/sync` | Sync cart (external items) |
| PATCH | `/api/user/cart/items/:id` | Update item qty |
| DELETE | `/api/user/cart/items/:id` | Remove item |
| DELETE | `/api/user/cart` | Clear cart |
| POST | `/api/user/coupons/validate` | Validate coupon |
| POST | `/api/user/orders/checkout` | Create order |
| GET | `/api/user/orders` | Order history |
| GET | `/api/user/orders/:id` | Order detail |
| PATCH | `/api/user/orders/:id/cancel` | Cancel order |
| POST | `/api/user/orders/:id/payment-proof` | Upload payment proof |
| GET | `/api/user/orders/:id/payment-proof` | Get payment proof |
| POST | `/api/user/media/upload` | Upload file |

### 3.4 Seller (`/api/seller/*`) — requiresRole SELLER|ADMIN

| Method | Endpoint | Purpose |
|--------|---------|---------|
| GET | `/api/seller/dashboard` | Sales stats |
| GET | `/api/seller/orders` | Seller's orders |
| GET | `/api/seller/potential-leads` | Abandoned carts |
| GET/POST/PUT/DELETE | `/api/seller/products` | Product management |

### 3.5 Admin (`/api/admin/*`) — requiresRole ADMIN

| Method | Endpoint | Purpose |
|--------|---------|---------|
| GET | `/api/admin/dashboard` | Platform metrics |
| GET | `/api/admin/orders` | All orders |
| PATCH | `/api/admin/orders/:id/status` | Update order status |
| GET | `/api/admin/payment-proofs` | List payment proofs |
| PATCH | `/api/admin/payment-proofs/:id/approve` | Approve payment |
| PATCH | `/api/admin/payment-proofs/:id/reject` | Reject payment |
| GET | `/api/admin/coupons` | List coupons |
| POST | `/api/admin/coupons` | Create coupon |
| PUT | `/api/admin/coupons/:id` | Update coupon |
| DELETE | `/api/admin/coupons/:id` | Delete coupon |
| GET/POST/PATCH/DELETE | `/api/admin/users` | User management |
| GET/POST/PATCH/DELETE | `/api/admin/sellers` | Seller management |
| GET/POST/PATCH/DELETE | `/api/admin/products` | Product catalog |
| GET/PATCH | `/api/admin/pricing` | Markup & shipping rates |
| GET/POST/DELETE | `/api/admin/media` | Media assets |
| GET/POST/PATCH/DELETE | `/api/admin/homepage` | Homepage content |
| GET/POST/PATCH/DELETE | `/api/admin/blog` | Blog management |
| GET | `/api/admin/potential-leads` | All abandoned carts |

---

## 4. Database Schema Summary

**Key models (Prisma + raw SQL):**

```
User              ← UserRole → Role (ADMIN, SELLER, USER)
CustomerProfile   ← User
SellerProfile     ← User
RefreshToken      ← User
OAuthAccount      ← User
Address           ← User
Cart → CartItem → Product
Order → OrderItem → Product
OrderStatusEvent  ← Order
PaymentProof      ← Order
Coupon (raw SQL)
CouponRedemption  (raw SQL)
ShippingRateSetting
MoqShoppingOtapiRule
MediaAsset
HomepageBanner / HomepageBlock
Blog / BlogPost
ActivityLog
ExternalHotel / ExternalHotelSearchCache
ExternalCatalogItem / ExternalHotItem / ExternalSearchCache
ProductTitleTranslation  (translation cache)
Conversation / Message   (chat)
TwilioWebhookEvent / TwilioMessageStatus
```

---

## 5. Critical Business Flows

### Flow A — Customer Purchase
```
Register/Login → Browse/Search → Product Detail → Add to Cart
→ Enter Shipping Address → Apply Coupon → Checkout
→ Order Created (pending_payment) → Upload Payment Proof
→ Admin Reviews Proof → approved/rejected
→ Order progresses: pending_review → pending_purchase → purchased
→ in_warehouse → shipped → received
```

### Flow B — Price Calculation
```
unit_price = resolveCheckoutUnitPrice(item)
  = SKU display price OR source price OR priceMin OR priceMax
subtotal = SUM(unit_price × qty)
coupon_discount = calculateDiscount(coupon, subtotal)
  = percent: round(subtotal × rate/100), capped at max_discount_amount
  = fixed: coupon.discount_value
  clamped to [0, subtotal]
shipping_fee = calculateServerShippingFee(method, items)
  = totalWeight(kg) × rate.min_rate_per_kg
  rate fetched from ShippingRateSetting (method, currency=BDT, is_active)
total = MAX(0, subtotal − discount) + shipping_fee
```

### Flow C — Coupon Lifecycle
```
Admin creates coupon (POST /api/admin/coupons)
→ User validates before checkout (POST /api/user/coupons/validate)
→ User submits checkout with coupon code
→ Checkout handler re-validates inside DB transaction
→ CouponRedemption record created, usage_count incremented
→ Coupon linked to order
```

### Flow D — Auth
```
Email/Phone → OTP/Code sent → Verify → JWT issued (12h access + 14d refresh)
Google OAuth → callback → JWT issued
Refresh token → new access token
```

---

## 6. High-Risk Logic Areas

### 6.1 Price Injection (P0)
- **File:** `apps/api/src/routes/user.ts` — checkout handler, `resolveCheckoutUnitPrice()`
- Cart items store `price_snapshot` at add-to-cart time
- Checkout also accepts items directly from request body (no server-side price cap)
- **Risk:** Attacker can POST to `/api/user/orders/checkout` with manipulated prices
- **Test:** Send checkout request with `price: 0.01` for expensive items

### 6.2 Coupon Abuse & Race Condition (P0)
- **File:** `apps/api/src/routes/user.ts` — `evaluateCoupon()`, checkout handler
- Two coupon validations: before transaction and inside transaction
- Window between first check and transaction commit allows double-use
- No rate limiting on `/api/user/coupons/validate`
- **Risk:** Parallel checkout requests from same user exceed `per_user_limit`
- **Test:** Fire 10 simultaneous checkout requests with same coupon

### 6.3 IDOR — Cross-User Order Access (P0)
- **File:** `apps/api/src/routes/user.ts` — `GET /orders/:id`, `GET /orders/:id/payment-proof`
- Must verify `order.user_id === req.user.id` before returning data
- **Risk:** User A fetches `/api/user/orders/<B's order id>` and sees B's order
- **Test:** Create two accounts, try to read each other's orders/payment proofs

### 6.4 Seller Cross-Contamination (P0)
- **File:** `apps/api/src/routes/seller.ts` — order list, product management
- Must verify products/orders belong to authenticated seller's shop
- **Risk:** Seller A reads/modifies Seller B's products or orders by ID guessing
- **Test:** Create two seller accounts, attempt cross-access by ID

### 6.5 Role Escalation — Admin/Seller API Access by Regular User (P0)
- **File:** `apps/api/src/middleware/auth.ts`
- Frontend guards `requiresRole` but backend must independently verify
- **Risk:** Regular JWT holder calls `/api/admin/*` or `/api/seller/*` directly
- **Test:** Use a USER JWT to call admin/seller endpoints directly

### 6.6 Stock Not Reserved (P1)
- Products have `stock_qty` but no reservation/decrement at checkout
- **Risk:** Oversell — 100 users simultaneously order last 1 unit
- **Test:** Concurrent checkout of same limited-stock item

### 6.7 Shipping Fee Bypass (P1)
- **File:** `apps/api/src/routes/user.ts` — `calculateServerShippingFee()`
- Weight derived from `estimated_weight_kg` field in CartItem (user-supplied at sync)
- **Risk:** User sets weight to 0 in cart sync to eliminate shipping fee
- **Test:** POST `/api/user/cart/sync` with `estimated_weight_kg: 0`

### 6.8 Duplicate Order Submission (P1)
- No idempotency key on checkout endpoint
- **Risk:** Double-click or network retry creates two identical orders
- **Test:** Fire two simultaneous POST requests to `/api/user/orders/checkout`

### 6.9 Coupon Brute Force (P1)
- `/api/user/coupons/validate` has no rate limit
- Coupon codes may be short/predictable
- **Risk:** Automated enumeration of valid codes
- **Test:** 1000 rapid validation calls, measure response time and block behavior

### 6.10 JWT Secret Weakness (P1)
- Both access and refresh tokens use same secret `chinabridgetoinfinity`
- A leaked refresh token could be used to forge access tokens
- **Risk:** Full account takeover if secret is discovered

### 6.11 Currency / Markup Bypass (P1)
- CNY→BDT rate hardcoded at 18 in `.env`
- No server-side enforcement of minimum price (price floor)
- **Risk:** Products priced incorrectly if rate changes; no audit trail

### 6.12 Cart Sync Arbitrary URLs (P2)
- `POST /api/user/cart/sync` accepts `source_url`, `product_url`, `shop_url` from client
- No URL validation or allowlist
- **Risk:** SSRF or stored XSS in admin/seller interfaces that render URLs

---

## 7. Third-Party Integrations

| Service | Purpose | Key File | Risk |
|---------|---------|---------|------|
| TMAPI (1688) | Product search | `modules/shopping/tmapi.client.ts` | Token expiry unhandled |
| OTAPI (RapidAPI) | Alt product search | `modules/shopping_otapi/otapi.client.ts` | No fallback visible |
| Cloudflare R2 | File storage | `utils/r2.ts` | Keys exposed in repo |
| Gmail SMTP | Transactional email | `utils/mailer.ts` | App password exposed |
| SMS BD | Phone OTP | `utils/sms-bd.ts` | API key exposed |
| Google Translate | Title translation | `modules/shopping/googleTranslate.ts` | API key exposed; no caching cap |
| Twilio WhatsApp | Chat | `modules/whatsapp/twilio.client.ts` | Credentials exposed |
| OpenAI GPT-4.1 | Chat agent | `modules/chat/chat.agent.ts` | Key exposed; no spend cap |
| Cloudflare Turnstile | CAPTCHA | auth routes | Secret exposed |
| Google OAuth | SSO login | auth routes | Client secret exposed |
| Tavily | Search | unknown | Key exposed |
| Booking.com | Hotel search | schema only | Integration depth unclear |

**All credentials above are stored in `.env` which appears to be committed to the repository — this is a P0 security incident requiring immediate rotation.**

---

## 8. Security Risk Summary

### P0 — Critical (Must fix before any production load)

| ID | Issue | Location |
|----|-------|---------|
| SEC-01 | `.env` file with all secrets committed to repo | `apps/api/.env` |
| SEC-02 | Price injection at checkout — client-supplied prices accepted | `user.ts` checkout handler |
| SEC-03 | IDOR — order ownership not verified | `GET /api/user/orders/:id` |
| SEC-04 | Privilege escalation — USER JWT accessing admin APIs | `middleware/auth.ts` |
| SEC-05 | Coupon race condition — parallel checkouts exceed usage limit | `user.ts` `evaluateCoupon()` |
| SEC-06 | Seller IDOR — cross-seller data access | `seller.ts` |
| SEC-07 | Same JWT secret for access and refresh tokens | `auth.ts` / `.env` |

### P1 — High

| ID | Issue | Location |
|----|-------|---------|
| SEC-08 | No rate limit on OTP, coupon validate, login endpoints | auth routes |
| SEC-09 | Short OTP — phone (4 digits), email (6 digits) | `auth.ts` |
| SEC-10 | Shipping weight supplied by client (0-weight bypass) | `cart/sync` |
| SEC-11 | No idempotency on checkout — double-order possible | `orders/checkout` |
| SEC-12 | Stock not reserved/decremented at checkout | order creation tx |
| SEC-13 | `NODE_TLS_REJECT_UNAUTHORIZED=0` in env | `.env` |
| SEC-14 | CNY conversion rate hardcoded — no price floor | `.env` / pricing |
| SEC-15 | No CSRF protection visible on state-mutating routes | all user routes |

### P2 — Medium

| ID | Issue | Location |
|----|-------|---------|
| SEC-16 | Cart sync accepts arbitrary URLs (SSRF / stored XSS risk) | `cart/sync` |
| SEC-17 | Coupon codes case-normalized client side but stored raw | coupon system |
| SEC-18 | Payment is manual slip — no cryptographic proof | payment flow |
| SEC-19 | Seller can view all customer abandoned carts / leads | seller leads API |
| SEC-20 | OpenAI chat agent — no spend cap / abuse limit | `chat.agent.ts` |
| SEC-21 | Google Translate called per-item, no caching limit | `googleTranslate.ts` |
| SEC-22 | Error messages may leak stack traces | Fastify error handler |

---

## 9. Required Test Categories

### T1 — Authentication & Authorization
- Login with valid/invalid credentials (email, phone, Google)
- OTP brute force (rate limit verification)
- JWT expiry and refresh
- Role enforcement on every admin/seller endpoint
- Accessing other users' resources (IDOR)
- Session fixation / token reuse after logout

### T2 — Business Logic
- Price calculation end-to-end (unit price × qty + shipping − coupon)
- Coupon: expired, inactive, wrong currency, below min order, over usage limit
- Coupon per-user limit enforcement under concurrency
- MOQ enforcement (below minimum qty)
- Checkout with 0-qty item
- Checkout with negative price / negative qty
- Checkout with empty cart
- Order status state machine (invalid transitions)
- Payment proof upload + approval/rejection flow

### T3 — Race Conditions & Concurrency
- Simultaneous checkout same coupon (10 parallel requests)
- Simultaneous checkout same low-stock item
- Duplicate checkout submission (double-click simulation)
- Parallel payment proof uploads for same order

### T4 — Input Validation
- SQL injection on search, coupon code, address fields
- XSS in product title, shop name, address fields
- Oversized payloads (images, descriptions)
- Missing required fields (null body, empty strings)
- Malformed JSON
- Extremely large numbers (qty, price)
- Unicode / Bangla text in all text fields
- Special characters in coupon code

### T5 — Third-Party API Failures
- TMAPI/OTAPI timeout → fallback behavior
- Google Translate failure → checkout still proceeds?
- SMS BD failure → OTP flow blocked?
- R2 upload failure → payment proof upload error handling
- Mailer SMTP failure → order still created?
- OpenAI timeout → chat graceful degradation

### T6 — UI/UX
- Mobile responsiveness (320px, 375px, 768px)
- Bangla text overflow in buttons and labels
- RTL / mixed script rendering
- Empty states: empty cart, no orders, no products in category
- Loading states: skeleton screens, spinners
- Error states: API failure, network offline
- Image load failure: broken product images
- Checkout clarity: price breakdown visible, coupon applied feedback
- Admin table pagination with large datasets

### T7 — Performance
- Product list page with 200+ items
- Search with broad queries
- Admin orders table with 1000+ records
- Concurrent users browsing same category
- Large file upload for payment proof (>5 MB)
- Third-party API latency simulation

---

## 10. Recommended Test Tools

| Category | Tool | Use |
|----------|------|-----|
| API testing | **Postman / Bruno** | Manual API exploration and collections |
| API automation | **Vitest + supertest** | Unit + integration tests for Fastify routes |
| E2E | **Playwright** | Full browser flows (checkout, login, admin) |
| Load / race condition | **k6** | Concurrent checkout, coupon race, stock depletion |
| Security scanning | **OWASP ZAP** | Automated vuln scan of API |
| Security manual | **Burp Suite Community** | Intercept, replay, modify requests |
| Database assertion | **psql / Prisma Studio** | Verify DB state after test scenarios |
| SMTP testing | **Mailpit (local)** | Intercept emails without sending |
| SMS mock | **Mock HTTP server** | Simulate SMS BD responses |
| Visual regression | **Playwright screenshots** | Catch UI regressions across breakpoints |

---

## 11. Priority Test Matrix

### P0 — Must pass before any release

| Test ID | Description | Tool | File/Function to Test |
|---------|-------------|------|----------------------|
| P0-01 | Price injection: POST checkout with `price: 1` | Burp/Postman | `user.ts` checkout handler |
| P0-02 | IDOR: User A fetches User B's order | Postman | `GET /api/user/orders/:id` |
| P0-03 | Role bypass: USER JWT hits `/api/admin/orders` | Postman | `middleware/auth.ts` |
| P0-04 | Role bypass: USER JWT hits `/api/seller/dashboard` | Postman | `middleware/auth.ts` |
| P0-05 | Coupon race: 10 parallel checkouts same coupon | k6 | `user.ts` `evaluateCoupon()` |
| P0-06 | Seller IDOR: Seller A fetches Seller B's orders | Postman | `seller.ts` |
| P0-07 | Shipping weight bypass: `estimated_weight_kg: 0` | Postman | `cart/sync`, `calculateServerShippingFee()` |
| P0-08 | Checkout duplicate: 2 simultaneous POSTs | k6 | `POST /api/user/orders/checkout` |
| P0-09 | JWT with wrong role, no role, expired | Postman | `middleware/auth.ts` |
| P0-10 | Access payment proof of another user's order | Postman | `GET /orders/:id/payment-proof` |

### P1 — Must pass before public launch

| Test ID | Description | Tool |
|---------|-------------|------|
| P1-01 | OTP rate limit: 50 rapid SMS OTP requests | k6 |
| P1-02 | Coupon brute force: 1000 validation calls | k6 |
| P1-03 | Coupon validation: expired, wrong currency, below min | Postman |
| P1-04 | MOQ validation: qty below minimum | Postman |
| P1-05 | Order with 0 qty item | Postman |
| P1-06 | Stock oversell: 50 users checkout 1 remaining item | k6 |
| P1-07 | Full checkout happy path E2E | Playwright |
| P1-08 | Google OAuth login flow | Playwright |
| P1-09 | Payment proof upload + admin approval | Playwright |
| P1-10 | Order cancel and status cannot regress | Postman |
| P1-11 | Cart sync with malformed URL in source_url | Postman |
| P1-12 | TMAPI timeout → graceful error to user | Mock server |
| P1-13 | Google Translate failure → order still completes | Mock server |
| P1-14 | Missing shipping address at checkout | Postman |
| P1-15 | Checkout with empty cart | Postman |

### P2 — Must pass before scaling

| Test ID | Description | Tool |
|---------|-------------|------|
| P2-01 | Bangla text in all product/order fields | Playwright |
| P2-02 | Mobile checkout flow (375px) | Playwright |
| P2-03 | Admin order table with 1000 records | k6 + Playwright |
| P2-04 | Product search with Bangla query | Playwright |
| P2-05 | XSS in product title field | Postman / ZAP |
| P2-06 | Very large payment proof image (>5 MB) | Postman |
| P2-07 | Concurrent admin status updates same order | k6 |
| P2-08 | Coupon with 0 usage limit | Postman |
| P2-09 | Blog post create / publish / delete (admin) | Playwright |
| P2-10 | Seller cannot see another seller's leads | Postman |

---

## 12. Exact Files & Functions Requiring Tests

```
apps/api/src/routes/user.ts
  ├── resolveCheckoutUnitPrice()         — price source precedence
  ├── evaluateCoupon()                   — coupon validation logic
  ├── calculateServerShippingFee()       — weight × rate calculation
  ├── POST /orders/checkout handler      — full checkout transaction
  ├── GET /orders/:id handler            — IDOR check
  ├── GET /orders/:id/payment-proof      — IDOR check
  ├── POST /cart/sync handler            — URL validation, weight input
  └── PATCH /cart/items/:id handler      — qty validation

apps/api/src/routes/auth.ts
  ├── OTP request handlers               — rate limiting
  ├── OTP verify handlers                — brute force protection
  └── refresh token handler             — token rotation

apps/api/src/routes/admin.ts
  ├── PATCH /orders/:id/status           — valid state transitions
  ├── PATCH /payment-proofs/:id/approve  — idempotency
  └── POST/PUT /coupons                  — input validation

apps/api/src/routes/seller.ts
  ├── GET /orders                        — seller_id filter
  └── GET /potential-leads               — data isolation

apps/api/src/middleware/auth.ts
  ├── authenticate()                     — JWT verify + user active check
  └── requireRole()                      — role string matching

apps/api/prisma/schema.prisma
  ├── Order model                        — status enum completeness
  └── ShippingRateSetting               — nullable/default values

apps/web/src/router/index.ts
  ├── requiresAuth guard                 — redirect on expired token
  └── requiresRole guard                 — client-side check (must not be only check)
```

---

## 13. Missing Validations & Suspicious Code Areas

| Area | Issue | Severity |
|------|-------|---------|
| Checkout body | `price` field accepted from client without server cap | P0 |
| Cart sync | `estimated_weight_kg` accepted from client (0 = free shipping) | P0 |
| Order IDOR | `GET /orders/:id` — ownership check must be verified | P0 |
| Auth middleware | Role check is string compare, no enum validation | P1 |
| Coupon | No rate limit on `/coupons/validate` | P1 |
| Coupon | Race window between pre-check and transaction | P1 |
| OTP | Phone OTP is 4 digits (10,000 combinations) | P1 |
| Checkout | No idempotency key prevents duplicate orders | P1 |
| Stock | `stock_qty` field exists but not decremented in checkout | P1 |
| Currency | CNY→BDT hardcoded; no price floor enforcement | P1 |
| Cart sync | `source_url`, `product_url` not validated | P2 |
| Payment proof | Amount on proof not matched against order total | P2 |
| Order status | No explicit guard against backward state transitions | P2 |
| Error handling | Fastify default error format may leak stack traces | P2 |
| Google Translate | Called per-item at checkout, no per-request cache hit | P2 |
| Admin SQL | Raw SQL queries used for coupons (verify parameterization) | P2 |

---

## 14. Recommended Test Data

### Users
```json
{ "role": "USER",   "email": "qa_user_a@test.com",   "password": "Test@1234" }
{ "role": "USER",   "email": "qa_user_b@test.com",   "password": "Test@1234" }
{ "role": "SELLER", "email": "qa_seller_a@test.com", "password": "Test@1234" }
{ "role": "SELLER", "email": "qa_seller_b@test.com", "password": "Test@1234" }
{ "role": "ADMIN",  "email": "qa_admin@test.com",    "password": "Test@1234" }
```

### Coupons
```json
{ "code": "TEST10PCT",   "type": "percent", "value": 10, "usage_limit": 5,  "per_user_limit": 1 }
{ "code": "TESTFLAT100", "type": "fixed",   "value": 100, "usage_limit": 1, "per_user_limit": 1 }
{ "code": "EXPIRED",     "type": "percent", "value": 20, "ends_at": "2020-01-01" }
{ "code": "INACTIVE",    "type": "percent", "value": 20, "is_active": false }
{ "code": "MINORDER",    "type": "percent", "value": 15, "min_order_amount": 10000 }
{ "code": "MAXUSED",     "type": "percent", "value": 10, "usage_limit": 0, "usage_count": 0 }
```

### Products
```json
{ "title": "Test Product CNY", "price_cny": 100, "stock_qty": 2,  "minimum_order_qty": 1 }
{ "title": "Zero Stock Item",  "price_cny": 50,  "stock_qty": 0,  "minimum_order_qty": 1 }
{ "title": "MOQ=5 Item",       "price_cny": 30,  "stock_qty": 100,"minimum_order_qty": 5 }
```

### Shipping Rates
```json
{ "method": "standard", "currency": "BDT", "min_rate_per_kg": 800, "is_active": true }
{ "method": "express",  "currency": "BDT", "min_rate_per_kg": 1500,"is_active": true }
```

### Attack Payloads
```
Malicious price:       { "price": 0.01 }
Zero weight:           { "estimated_weight_kg": 0 }
Negative qty:          { "qty": -1 }
SQL injection:         { "coupon_code": "'; DROP TABLE coupons;--" }
XSS:                   { "title": "<script>alert(1)</script>" }
Oversized payload:     description of 100,000 characters
IDOR order ID:         /api/user/orders/1  (when logged in as different user)
```

---

## 15. Execution Plan

### Phase 1 — Static Analysis (Day 1–2)
- [ ] Read all route files end-to-end (`user.ts`, `auth.ts`, `admin.ts`, `seller.ts`)
- [ ] Verify every `GET /orders/:id` performs `WHERE id=? AND user_id=?`
- [ ] Verify every seller endpoint filters by `seller_id`
- [ ] Verify role middleware applied to every admin and seller router
- [ ] Trace `resolveCheckoutUnitPrice()` — confirm price cannot come entirely from client
- [ ] Trace `calculateServerShippingFee()` — confirm weight source
- [ ] Read coupon raw SQL queries — verify parameterization
- [ ] Check Fastify error handler for stack trace leakage
- [ ] Document any TODO / FIXME in route files

### Phase 2 — Environment Setup (Day 2)
- [ ] Stand up local Postgres with test data
- [ ] Create test user accounts for all roles
- [ ] Seed coupons, products, shipping rates
- [ ] Configure Postman collection / Bruno with env variables
- [ ] Set up Mailpit for email capture
- [ ] Mock SMS BD API with WireMock or similar

### Phase 3 — P0 Security Tests (Day 3–4)
- [ ] Execute all P0 test cases from Section 11
- [ ] Document exact request/response for each finding
- [ ] Verify IDOR on orders and payment proofs
- [ ] Verify role bypass on admin/seller endpoints
- [ ] Verify price injection at checkout
- [ ] Run coupon race condition with k6

### Phase 4 — P1 Functional Tests (Day 5–6)
- [ ] Full checkout E2E happy path with Playwright
- [ ] Coupon validation edge cases
- [ ] MOQ enforcement
- [ ] Stock depletion under concurrent load
- [ ] OTP brute force (rate limit verification)
- [ ] Third-party API failure handling

### Phase 5 — P2 UI & Performance (Day 7–8)
- [ ] Mobile responsiveness at 320px, 375px, 768px
- [ ] Bangla text rendering throughout
- [ ] Admin table performance with synthetic data
- [ ] Image loading and empty states
- [ ] Playwright visual regression screenshots

### Phase 6 — Reporting (Day 9)
- [ ] Consolidate all findings with severity, reproduction steps, evidence
- [ ] Map each finding to exact file + line number
- [ ] Prioritized remediation recommendations
- [ ] Re-test any quick fixes applied during audit

---

## 16. Immediate Pre-Test Recommendations

Before writing a single test, the following **must be addressed** because they affect test environment safety and reliability:

1. **Rotate all API keys** that appear in `.env` — OpenAI, Google, Twilio, R2, SMS BD, TMAPI, OTAPI, Turnstile. The `.env` file must be removed from the repository and added to `.gitignore`. Use Railway's secret management or a `.env.local` that is never committed.

2. **Separate test credentials** from production credentials. Tests must never hit production third-party APIs (SMS, email, OpenAI).

3. **Add `.env` to `.gitignore`** immediately and audit git history for secret exposure (`git log --all -- .env`).

4. **Use separate JWT secrets** for access and refresh tokens.

5. **Document the intended IDOR guard** for orders and payment proofs so tests can verify the correct implementation.

---

*This document was produced from static analysis of the codebase. No application behavior was modified. Test execution against a production environment must not be performed without explicit written authorization.*
