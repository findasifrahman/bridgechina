# Implementation Progress

## Completed Phases

### ✅ Phase 1: /app → /user rename (backwards compatible)
**Status:** Complete
- Router updated with `/user` routes
- `/app` redirects to `/user` for backward compatibility
- All navigation links updated
- Login redirects updated to `/user`

**Files Modified:**
- `apps/web/src/router/index.ts`
- `apps/web/src/pages/LoginPage.vue`
- `packages/ui/src/layouts/AppLayout.vue`
- `apps/web/src/pages/RequestServicePage.vue`
- Multiple service detail pages (updated redirects)

---

### ✅ Phase 2: Strengthen Customer Profile
**Status:** Schema & API Complete (Migration pending DB connection)
- Schema updated with new optional fields
- API endpoints updated to handle new fields
- Frontend profile form enhanced

**Schema Changes:**
- Added fields: `full_name`, `gender`, `birth_year`, `country_of_residence`, `city_of_residence`, `preferred_currency`, `preferred_contact_channel`, `wechat_id`, `dietary_preferences`, `travel_interests`, `budget_preferences`, `marketing_consent`, `avatar_asset_id`
- Added relation to `MediaAsset` for avatar
- Added index on `marketing_consent`

**Migration Required:**
```sql
-- Run when DB is accessible:
-- cd apps/api
-- pnpm db:migrate --name add_customer_profile_fields
```

**Files Modified:**
- `apps/api/prisma/schema.prisma`
- `apps/api/src/routes/user.ts`
- `apps/web/src/pages/app/ProfilePage.vue`

---

### ✅ Phase 5: WebChat Backend Infrastructure
**Status:** Complete
- New webchat routes created (`/api/webchat`)
- Conversation storage using same tables as WhatsApp
- AI processing integrated
- OPS reply endpoint updated to handle webchat (no Twilio)

**New Endpoints:**
- `POST /api/webchat/session` - Create/find conversation
- `GET /api/webchat/:conversationId/messages` - Get messages
- `POST /api/webchat/:conversationId/send` - Send message (stores INBOUND, triggers AI)

**Key Features:**
- Uses `channel='webchat'`, `external_channel='web_chat'`
- `external_thread_key` format: `webchat:${sessionId}` or `webchat:user:${userId}`
- NO Twilio calls - messages stored only
- Visible in OPS dashboard (same Conversation/Message tables)
- OPS can reply to webchat (stores message, no Twilio)

**Files Created:**
- `apps/api/src/routes/webchat.ts`

**Files Modified:**
- `apps/api/src/index.ts` (registered webchat routes)
- `apps/api/src/routes/ops.ts` (updated reply to handle webchat)

**Frontend TODO:**
- Update `FloatingChatWidget` to use `/api/webchat` endpoints
- Implement polling for messages
- Store `sessionId` and `conversationId` in localStorage

---

## Pending Phases

### ✅ Phase 3: Fix core concept - 9 services consistently
**Status:** Complete
- Created centralized service category utilities (`apps/api/src/utils/service-category.ts`)
- Standardized category keys: changed "shopping_service" → "shopping" everywhere
- Added missing "guide" category to seed data
- Updated shared types and schemas to include all 9 services (guide, hotel, transport, halal_food, medical, translation_help, shopping, tours, esim)
- Created `normalizeCategoryKey()` helper function to handle variations
- Updated user routes to use normalization helper
- Updated provider service.request.ts to use normalization and added GUIDE intent mapping
- Updated assignment.service.ts to use normalization and added GUIDE intent mapping
- Updated seed.ts to include all 9 services with correct keys

**The 9 Core Services:**
1. guide - Guide Service
2. hotel - Hotel Booking
3. transport - Transport
4. halal_food - Halal Food
5. medical - Medical Assistance
6. translation_help - Translation & Help
7. shopping - Shopping Service (standardized from "shopping_service")
8. tours - Tours
9. esim - eSIM Plans

**Files Created:**
- `apps/api/src/utils/service-category.ts` - Centralized category utilities

**Files Modified:**
- `apps/api/prisma/seed.ts` - Added guide, changed shopping_service to shopping
- `packages/shared/src/types/index.ts` - Updated ServiceCategoryKey type
- `packages/shared/src/schemas/service-requests.ts` - Updated enum
- `apps/api/src/routes/user.ts` - Use normalization helper
- `apps/api/src/modules/providers/service.request.ts` - Use normalization, add GUIDE mapping
- `apps/api/src/modules/whatsapp/assignment.service.ts` - Use normalization, add GUIDE mapping

### ⚠️ Phase 4: Provider onboarding + per-service profiles
**Status:** Schema & API Complete, Migration & UI Pending
- ✅ Schema updated: Extended ServiceProviderProfile and GuideProfile, created ServiceProviderServiceProfile model
- ✅ API endpoints added: GET/PATCH `/api/provider/profile`, POST `/api/provider/profile/service`
- ⚠️ Database migration required: `cd apps/api; pnpm prisma migrate dev --name extend_provider_profiles`
- ⚠️ TypeScript errors will resolve after migration + `pnpm prisma generate`
- 📋 TODO: Create provider profile UI (`apps/web/src/pages/provider/ProfilePage.vue`)

### ✅ Phase 6: Website service detail request → OPS queue
**Status:** Complete
- Created `POST /api/user/requests` endpoint for logged-in users
- Endpoint auto-fills user profile data (name, phone, email, whatsapp)
- Adds source metadata (`source: 'web_form'`, `created_via: 'service_page'`)
- Creates ServiceRequest with `user_id` populated, status='new' (visible in OPS)
- Updated public endpoint to include source metadata
- Updated HotelDetailPage to use new endpoint when user is logged in

**New API Endpoint:**
- `POST /api/user/requests`
  - Body: `{ categoryKey, citySlug?, city_id?, payload? }`
  - Auto-fills contact info from user profile
  - Creates ServiceRequest with source metadata
  - Returns request ID

**Files Modified:**
- `apps/api/src/routes/user.ts` - Added POST /requests endpoint
- `apps/api/src/routes/public.ts` - Added source metadata to request_payload
- `apps/web/src/pages/HotelDetailPage.vue` - Updated to use new endpoint for logged-in users

**Frontend TODO:**
- Update other service detail pages (TourDetailPage, GuideDetailPage, etc.) to use new endpoint

### ✅ Phase 7: Bundle requests (multi-service)
**Status:** Complete
- Created bundle utility function (`generateBundleKey`)
- Added `POST /api/user/requests/bundle` endpoint to create multiple requests with same bundle_key
- Updated `GET /api/user/requests/:id` to include bundleRequests
- Updated `GET /api/ops/requests/:id` to include bundleRequests
- Updated `GET /api/user/requests` to filter by bundle_key query parameter
- Updated user and OPS request detail pages to show sibling bundle requests

**New API Endpoint:**
- `POST /api/user/requests/bundle`
  - Body: `{ requests: Array<{ categoryKey, city_id?, citySlug?, payload? }>, city_id? }`
  - Generates bundle_key UUID once for all requests
  - Creates multiple ServiceRequest rows with same bundle_key
  - Returns bundle_key and array of created request IDs

**Files Created:**
- `apps/api/src/utils/bundle.ts` - Bundle utility functions

**Files Modified:**
- `apps/api/src/routes/user.ts` - Added bundle endpoint, updated detail/list endpoints
- `apps/api/src/routes/ops.ts` - Updated request detail to include bundle requests
- `apps/web/src/pages/app/RequestDetailPage.vue` - Added bundle requests display
- `apps/web/src/pages/ops/RequestDetailPage.vue` - Added bundle requests display

---

### ✅ Phase 8: OPS status update form + timeline (MOST IMPORTANT)
**Status:** Backend API Complete (Frontend UI pending)

**Schema Changes:**
- Added `ServiceRequestStatusEvent` model with fields:
  - `request_id`, `status_from`, `status_to`, `note_internal`, `note_user`, `created_by`, `created_at`
  - Relations to `ServiceRequest` and `User`
  - Indexes on `request_id`, `status_to`, `created_at`

**New API Endpoint:**
- `POST /api/ops/requests/:id/status`
  - Body: `{ status_to, note_internal?, note_user?, notify_user?: boolean }`
  - Updates `ServiceRequest.status`
  - Creates `ServiceRequestStatusEvent`
  - Optionally notifies user via WhatsApp/WebChat if `notify_user=true`

**Updated Endpoint:**
- `GET /api/ops/requests/:id` - Now includes `statusEvents` array with creator info

**Migration Required:**
```sql
-- Run when DB is accessible:
-- cd apps/api
-- pnpm db:migrate --name add_service_request_status_events
```

**Files Modified:**
- `apps/api/prisma/schema.prisma` - Added ServiceRequestStatusEvent model
- `apps/api/src/routes/ops.ts` - Added status update endpoint, updated request detail

**Frontend Implementation:**
- ✅ Created `/pages/ops/RequestDetailPage.vue` with:
  - Status timeline display (shows all status events with timestamps, notes, creator)
  - Status update form (dropdown, internal note, user note, notify checkbox)
  - Integration with `POST /api/ops/requests/:id/status` endpoint
  - Request information display
  - Provider offers display
- ✅ Added routes to `/ops/requests` and `/ops/requests/:id`

**Frontend Implementation:**
- ✅ Created `/pages/ops/RequestDetailPage.vue` with status timeline and update form
- ✅ Updated `/pages/app/RequestDetailPage.vue` to show status timeline (user-facing only)
- ✅ Added source badge (WhatsApp/WebChat/Website) to user request detail
- ✅ Updated API endpoint to include statusEvents (filtered for user visibility)

**Files Modified:**
- `apps/api/src/routes/user.ts` - Added statusEvents to request detail endpoint
- `apps/web/src/pages/app/RequestDetailPage.vue` - Added status timeline display

### ✅ Phase 9: /user dashboard request status visibility (responsive)
**Status:** Complete
- Updated `GET /api/user/requests/:id` to include statusEvents (filtered for user visibility)
- Updated user request detail page to display status timeline
- Added source badge (WhatsApp/WebChat/Website) to request detail
- Status timeline shows user-facing notes and timestamps
- Responsive design for mobile and desktop

**Updated API Endpoint:**
- `GET /api/user/requests/:id` - Now includes:
  - `statusEvents` array (filtered for user visibility with `note_user`)
  - `conversation` object with channel info
  - `bundleRequests` array if bundle_key exists

**Files Modified:**
- `apps/api/src/routes/user.ts` - Added statusEvents, conversation, bundleRequests to request detail
- `apps/web/src/pages/app/RequestDetailPage.vue` - Added status timeline, source badge, bundle requests display

### ✅ Phase 10: Responsiveness for /user and /provider dashboards
**Status:** Complete
- ✅ User Dashboard: Added responsive padding, improved grid layouts (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3), better mobile request cards (flex-col on mobile, flex-row on desktop)
- ✅ User Requests Page: Added responsive padding
- ✅ Provider Dashboard: Already responsive (uses grid-cols-1 md:grid-cols-2/3 patterns, responsive padding)

---

## Next Steps

### Remaining Phases

1. **Phase 4**: Provider onboarding + per-service profiles
   - Extend ServiceProviderProfile
   - Add ServiceProviderServiceProfile model
   - Update provider API endpoints
   - Create provider profile UI

3. **Phase 10**: Responsiveness for /user and /provider dashboards
   - Ensure mobile-friendly layouts
   - Test on various screen sizes
   - Optimize touch interactions

### Pending Tasks

1. **Update FloatingChatWidget** to use new webchat endpoints
   - Implement polling for messages
   - Store sessionId and conversationId in localStorage

2. **Test bundle requests flow** end-to-end
   - Test creating bundles via API
   - Verify bundle requests appear correctly in UI
   - Test status updates on bundled requests

3. **Test WebChat integration** end-to-end
   - Test session creation
   - Test message sending/receiving
   - Verify OPS can reply to WebChat messages

