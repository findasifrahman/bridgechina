# BridgeChina Implementation Plan - Multi-Phase Enhancement

## PHASE 0 - Reconnaissance Complete ✅

### Key Findings

**Routes & Navigation:**
- `/app` routes exist in `apps/web/src/router/index.ts` (lines 166-195)
- Login redirect logic in `apps/web/src/pages/LoginPage.vue` (line 88: USER → `/app`)
- AppLayout used by `/app` routes: `apps/web/src/layouts/AppLayout.vue`
- No `/user` routes exist yet

**User Profile:**
- GET/PATCH `/api/user/profile` exists in `apps/api/src/routes/user.ts` (lines 406-485)
- CustomerProfile model exists but minimal fields (nationality, passport_name, preferred_language)
- User routes file: `apps/api/src/routes/user.ts`

**Service Categories:**
- ServiceCategory.key values from schema: hotel, transport, halal_food, medical, translation_help, shopping_service, tours, guide, esim
- Intent mapping in `assignment.service.ts`: TRANSPORT→transport, TOUR→tours, HOTEL→hotel, SHOPPING→shopping, HALAL_FOOD→halal_food, MEDICAL→medical, ESIM→esim
- Need to normalize to 9 services: Transport, Tour, Restaurant, Hotel, Guide, Medical, Shopping, Sourcing, eSIM

**Bundle Requests:**
- `bundle_key` field exists in ServiceRequest schema (line 453)
- No helper functions or UI grouping found yet

**OPS Endpoints:**
- `/api/ops/conversations` - list conversations
- `/api/ops/conversations/:id` - conversation detail
- `/api/ops/requests/:id` - service request detail (line 585 in ops.ts)
- `/api/ops/offers` - list/provider offers
- No status update endpoint with timeline yet

**WebChat:**
- FloatingChatWidget exists: `packages/ui/src/components/FloatingChatWidget.vue`
- Currently calls `/api/public/ai-search` directly (line 240)
- Does NOT create Conversation/Message records (needs integration)
- No backend webchat endpoints exist yet

**Provider Routes:**
- `/api/provider/dispatches` - list dispatches
- `/api/provider/requests/:id` - request detail
- `/api/provider/conversations` - list assigned conversations
- No `/api/provider/profile` endpoint yet (only admin can manage profiles)

**Public Service Request:**
- Schema exists: `createServiceRequestSchema` in `packages/shared/src/schemas/service-requests.ts`
- No POST `/api/public/service-request` endpoint found
- Need to search more or create new endpoint

**Assignment Service:**
- `assignConversationToProvider()` in `apps/api/src/modules/whatsapp/assignment.service.ts`
- Maps intents to category keys
- Uses confidence thresholds

**WhatsApp Flow:**
- `handleAIReply()` in `apps/api/src/modules/whatsapp/whatsapp.service.ts`
- Creates Conversation with external_thread_key
- Calls Twilio sendText() for outbound messages
- Must NOT be used for webchat

---

## Implementation Plan

### Files to Modify/Create

**Database (Prisma):**
- `apps/api/prisma/schema.prisma` - Add fields to CustomerProfile, ServiceProviderProfile, GuideProfile, new models

**Backend API:**
- `apps/api/src/routes/user.ts` - Enhance profile endpoints, add requests creation
- `apps/api/src/routes/ops.ts` - Add status update endpoint
- `apps/api/src/routes/provider.ts` - Add profile endpoints
- `apps/api/src/routes/public.ts` - Add webchat endpoints, service request creation (if not exists)
- `apps/api/src/modules/webchat/` - NEW: webchat service module
- `apps/api/src/modules/providers/service.request.ts` - Bundle helper functions

**Frontend Routes:**
- `apps/web/src/router/index.ts` - Add `/user` routes, redirect `/app` to `/user`

**Frontend Pages:**
- `apps/web/src/pages/user/` - NEW: copy from `pages/app/`, update links
- `apps/web/src/pages/app/*.vue` - Keep for backward compatibility (redirect)
- `apps/web/src/pages/provider/ProfilePage.vue` - NEW: provider profile page
- `apps/web/src/pages/ops/RequestDetailPage.vue` - Add status update form + timeline
- `apps/web/src/pages/app/RequestDetailPage.vue` - Add status timeline view

**Frontend Components:**
- `packages/ui/src/components/FloatingChatWidget.vue` - Integrate with webchat backend

**Shared Types/Schemas:**
- `packages/shared/src/schemas/service-requests.ts` - Update category keys enum
- `packages/shared/src/types/index.ts` - Update ServiceCategoryKey type

**Other:**
- `apps/web/src/pages/LoginPage.vue` - Update redirect to `/user`
- `apps/web/src/layouts/AppLayout.vue` - Update nav links to `/user`
- `README.md` - Document all changes

---

## Detailed Phase Breakdown

### PHASE 1: /app → /user rename
**Files:**
- `apps/web/src/router/index.ts` - Add `/user` routes, redirect `/app` → `/user`
- `apps/web/src/pages/LoginPage.vue` - Change USER redirect from `/app` to `/user`
- `apps/web/src/layouts/AppLayout.vue` - Update nav links (if any hardcoded)
- Check all components using `/app/*` links

**Changes:**
- Create new route group `/user` with same children as `/app`
- Add redirect route: `/app` → `/user`, `/app/*` → `/user/*`
- Update LoginPage redirect logic (line 88)
- Keep `/app` routes for backward compatibility (redirect only)

---

### PHASE 2: Strengthen Customer Profile
**Prisma Migration:**
- Add fields to CustomerProfile (OPTIONAL fields):
  - full_name, gender, birth_year, country_of_residence, city_of_residence
  - preferred_currency, preferred_contact_channel, wechat_id
  - dietary_preferences (Json), travel_interests (Json), budget_preferences (Json)
  - marketing_consent, avatar_asset_id (relation)

**Files:**
- `apps/api/prisma/schema.prisma` - Add fields
- `apps/api/src/routes/user.ts` - Update GET/PATCH `/profile` endpoints
- `apps/web/src/pages/user/ProfilePage.vue` - Update form (copy from app/ProfilePage.vue)

---

### PHASE 3: 9 Services Consistently
**Files:**
- `packages/shared/src/schemas/service-requests.ts` - Update enum to include all 9
- `packages/shared/src/types/index.ts` - Update ServiceCategoryKey type
- Create helper: `normalizeCategoryForDB(uiKey: string): string`
- Ensure ServiceCategory seeds include all 9 services
- Update assignment.service.ts mapping if needed

**Service Mapping:**
- UI Key → DB Key: transport→transport, tour→tours, restaurant→halal_food, hotel→hotel, guide→guide, medical→medical, shopping→shopping, sourcing→sourcing (NEW), esim→esim

---

### PHASE 4: Provider Onboarding
**Prisma Migrations:**
- Extend ServiceProviderProfile: provider_type, display_name, company_name, contact_name, whatsapp, wechat, email, website, description, languages, service_area, address_text, verified, rating, review_count, cover_asset_id, gallery_asset_ids, onboarding_completed_at
- Extend GuideProfile: wechat, whatsapp, is_living_inside_china, current_occupation, years_of_experience, identity_verified, additional_photos_asset_ids
- NEW: ServiceProviderServiceProfile model (per-service profile data)

**Files:**
- `apps/api/prisma/schema.prisma` - Add fields/models
- `apps/api/src/routes/provider.ts` - Add GET/PATCH `/profile` endpoints
- `apps/web/src/pages/provider/ProfilePage.vue` - NEW: profile form with tabs

---

### PHASE 5: WebChat Channel
**Prisma:**
- No schema changes needed (Conversation.channel='webchat', external_channel='web_chat')

**Files:**
- `apps/api/src/routes/public.ts` - Add `/api/webchat/*` endpoints
- `apps/api/src/modules/webchat/webchat.service.ts` - NEW: webchat service
- `packages/ui/src/components/FloatingChatWidget.vue` - Integrate with backend
- `apps/api/src/routes/ops.ts` - Update reply logic to check channel (no Twilio for webchat)

**Endpoints:**
- POST `/api/webchat/session` - create/find Conversation
- GET `/api/webchat/:conversationId/messages` - get messages
- POST `/api/webchat/:conversationId/send` - send message, trigger AI if mode=AI

---

### PHASE 6: Website Service Request
**Files:**
- `apps/api/src/routes/user.ts` - Add POST `/requests` endpoint (if not exists)
- OR `apps/api/src/routes/public.ts` - Add POST `/service-request` endpoint
- `apps/web/src/pages/services/*/DetailPage.vue` - Update "Request this service" button

**Logic:**
- Logged-in user: create ServiceRequest with user_id
- Guest: create Lead or redirect to login
- Status='new', no AI/auto-dispatch (OPS manual)

---

### PHASE 7: Bundle Requests
**Files:**
- `apps/api/src/modules/providers/service.request.ts` - Add bundle helper (generate bundle_key)
- `apps/api/src/routes/user.ts` - Support bundle in POST `/requests`
- `apps/web/src/pages/ops/RequestDetailPage.vue` - Show sibling requests if bundle_key exists
- `apps/web/src/pages/user/RequestDetailPage.vue` - Show sibling requests

---

### PHASE 8: OPS Status Update + Timeline (MOST IMPORTANT)
**Prisma Migration:**
- NEW: ServiceRequestStatusEvent model

**Files:**
- `apps/api/prisma/schema.prisma` - Add ServiceRequestStatusEvent model
- `apps/api/src/routes/ops.ts` - Add POST `/requests/:id/status` endpoint
- `apps/web/src/pages/ops/RequestDetailPage.vue` - Add status update panel + timeline section

**Logic:**
- Update ServiceRequest.status
- Create ServiceRequestStatusEvent
- If notify_user=true and conversation exists:
  - WhatsApp → Twilio send + store Message
  - WebChat → store Message only (no Twilio)

---

### PHASE 9: User Dashboard Status Visibility
**Files:**
- `apps/web/src/pages/user/RequestDetailPage.vue` - Add status timeline (ServiceRequestStatusEvent)
- `apps/web/src/pages/user/RequestsPage.vue` - Show status, last update, source badge
- Update GET `/api/user/requests/:id` to include status events

---

### PHASE 10: Responsiveness
**Files:**
- All `/user/*` pages - Ensure mobile-friendly (cards on mobile, no overflow)
- All `/provider/*` pages - Ensure mobile-friendly
- Use existing UI patterns (CompactCard, etc.)

---

## Migration Names (Provisional)

1. `add_customer_profile_fields` - Phase 2
2. `add_service_provider_profile_fields` - Phase 4
3. `add_guide_profile_fields` - Phase 4
4. `add_service_provider_service_profile` - Phase 4
5. `add_service_request_status_events` - Phase 8

---

## Backward Compatibility Notes

- `/app` routes will redirect to `/user` (no breaking changes)
- Existing ServiceCategory keys remain unchanged
- WhatsApp flow unchanged (no modifications to whatsapp.routes.ts or whatsapp.service.ts)
- Existing OPS/provider workflows unchanged (additive only)

---

## Testing Checklist

- [ ] Type check passes (`pnpm type-check`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Prisma generate + migrate works
- [ ] Login redirects: USER → /user; /app redirects to /user
- [ ] WhatsApp flow unchanged (Twilio sendText only for WhatsApp)
- [ ] WebChat never triggers Twilio
- [ ] Web form service request creates ServiceRequest visible in OPS
- [ ] OPS status update creates ServiceRequestStatusEvent and updates ServiceRequest.status
- [ ] User sees request status timeline in /user
- [ ] Bundle requests group correctly in /ops and /user
- [ ] All pages responsive (mobile-friendly)





