# Booking.com Integration Implementation

## Overview
This document outlines the Booking.com (RapidAPI) hotel integration for BridgeChina. The implementation allows users to search and view hotels from both internal curated database and external Booking.com API.

## Implementation Status

### ✅ Completed

1. **Prisma Schema Updates**
   - Added `HotelSource` enum (INTERNAL, BOOKINGCOM)
   - Added `ExternalHotelProvider` table
   - Added `ExternalDestination` table (caches destination searches)
   - Added `ExternalHotel` table (stores normalized hotel data)
   - Added `ExternalHotelSearchCache` table
   - Extended `HotelBooking` with external hotel support

2. **Backend Service Module**
   - Created `apps/api/src/modules/hotels/bookingcom.service.ts`
   - Implemented all RapidAPI endpoints:
     - `searchDestination`
     - `searchHotels`
     - `getHotelDetails`
     - `getDescriptionAndInfo`
     - `getPaymentFeatures`
     - `getHotelReviewScores`
     - `getHotelReviewsFilterMetadata`
     - `getPopularAttractionNearBy`
   - Guangzhou restriction logic
   - Hotel normalization and caching

3. **Public API Endpoints**
   - `GET /api/public/hotels/search` - Combined search (internal + external)
   - `GET /api/public/hotels/external/:hotelId/details` - External hotel details
   - Updated `GET /api/public/catalog/hotels/:id` - Handles both internal and external hotels
   - Updated `POST /api/public/service-requests` - Supports external hotel bookings

4. **Frontend Updates**
   - **HotelsListPage**: 
     - Added search tabs (Guangzhou City / Hotel Name)
     - Date range picker
     - Guests/rooms selector
     - Combined results display (internal + external)
     - Client-side filters (price, star rating, free cancellation, breakfast)
     - Badge indicators (Verified / Booking.com)
   
   - **HotelDetailPage**:
     - Handles both internal and external hotels
     - Displays Booking.com rich data:
       - Image gallery from `gallery_photos`
       - Highlights strip
       - Facilities (most popular + all)
       - Payment methods
       - Review scores breakdown
       - Nearby attractions
     - "View on Booking.com" button for external hotels
     - Booking request flow with login check

### ⚠️ Required Steps Before Use

1. **Run Database Migration**
   ```bash
   cd apps/api
   pnpm prisma migrate dev --name add_external_hotels
   pnpm prisma generate
   ```

2. **Set Environment Variable**
   Add to your `.env` file:
   ```
   RAPID_API_KEY=your_rapidapi_key_here
   ```

3. **Initialize Provider (Optional)**
   You can manually insert the provider record:
   ```sql
   INSERT INTO external_hotel_providers (id, provider, host, is_active)
   VALUES (gen_random_uuid(), 'bookingcom', 'booking-com15.p.rapidapi.com', true);
   ```

### 🔄 Pending

1. **Admin Panel Enhancements**
   - Add "Hotels" tab for internal hotel management
   - Add "External Cache" read-only table
   - Add "Refresh" action for external hotel details

## API Endpoints

### Search Hotels
```
GET /api/public/hotels/search
Query Parameters:
  - mode: 'city' | 'name' (required)
  - q: search query (required)
  - checkin: YYYY-MM-DD (optional)
  - checkout: YYYY-MM-DD (optional)
  - adults: number (default: 1)
  - room_qty: number (default: 1)
  - children_age: string (optional, e.g., "0,17")
  - page_number: number (default: 1)

Response:
{
  internal: HotelCard[],
  external: HotelCard[],
  blockedExternal?: boolean,
  blockedReason?: string
}
```

### Get Hotel Details
```
GET /api/public/catalog/hotels/:id
- If id is UUID: returns internal hotel
- If id is not UUID: treats as external hotel_id and fetches details

GET /api/public/hotels/external/:hotelId/details
Query Parameters:
  - adults: number (default: 1)
  - room_qty: number (default: 1)
  - children_age: string (optional)
```

### Create Booking Request
```
POST /api/public/service-requests
Body:
{
  category_key: 'hotel',
  city_id: string,
  customer_name: string,
  phone: string,
  email?: string,
  request_payload: {
    checkin?: string,
    checkout?: string,
    adults?: number,
    room_qty?: number,
    children_age?: string,
    hotel_source?: 'INTERNAL' | 'BOOKINGCOM',
    external_hotel_id?: string,
    hotel_id?: string,
    ...
  }
}
```

## Features

### Guangzhou Restriction
- City search mode: Only Guangzhou is allowed
- Hotel name search: Allowed but shows warning if results are outside Guangzhou
- Automatic destination caching for Guangzhou

### Caching Strategy
- **Search Results**: Cached in `ExternalHotelSearchCache` (30 minutes)
- **Hotel Details**: Re-fetched if `last_synced_at` > 24 hours
- **Destinations**: Cached in `ExternalDestination` table

### Error Handling
- If RapidAPI fails, shows internal hotels + banner message
- Graceful degradation for missing data
- TypeScript type safety with `as any` for Prisma models (until migration runs)

## Testing Checklist

- [ ] Run Prisma migration
- [ ] Set RAPID_API_KEY
- [ ] Test Guangzhou city search
- [ ] Test hotel name search
- [ ] Test external hotel detail page
- [ ] Test booking request for external hotel
- [ ] Test filters (price, star rating, cancellation, breakfast)
- [ ] Verify image loading for external hotels
- [ ] Test "View on Booking.com" button
- [ ] Verify login redirect for booking requests

## Notes

- All RapidAPI calls are server-side only
- API key is never exposed to client
- External hotel data is normalized and cached in database
- Frontend displays both internal and external hotels seamlessly
- Booking requests support both hotel sources

