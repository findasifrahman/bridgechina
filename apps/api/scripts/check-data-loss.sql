-- Check if main data tables still have data
SELECT 'hotels' as table_name, COUNT(*) as row_count FROM hotels
UNION ALL
SELECT 'restaurants', COUNT(*) FROM restaurants
UNION ALL
SELECT 'medical_centers', COUNT(*) FROM medical_centers
UNION ALL
SELECT 'tours', COUNT(*) FROM tours
UNION ALL
SELECT 'transport_products', COUNT(*) FROM transport_products
UNION ALL
SELECT 'cities', COUNT(*) FROM cities
UNION ALL
SELECT 'city_places', COUNT(*) FROM city_places
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'service_requests', COUNT(*) FROM service_requests
UNION ALL
SELECT 'hotel_bookings', COUNT(*) FROM hotel_bookings;

-- Check if image junction tables still exist (they should be dropped)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'city_images',
    'city_place_images',
    'esim_images',
    'hotel_images',
    'medical_images',
    'product_images',
    'restaurant_images',
    'tour_images',
    'transport_images'
  );





