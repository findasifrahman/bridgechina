import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/MarketingLayout.vue'),
      meta: { requiresAuth: false }, // Explicitly mark as public
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/pages/HomePage.vue'),
          meta: { requiresAuth: false },
        },
        {
          path: 'services',
          name: 'services',
          component: () => import('@/pages/ServicesPage.vue'),
        },
        {
          path: 'services/:slug',
          name: 'service-detail',
          component: () => import('@/pages/ServiceDetailPage.vue'),
        },
        {
          path: 'cities',
          name: 'cities',
          component: () => import('@/pages/CitiesPage.vue'),
        },
        {
          path: 'cities/:slug',
          name: 'city-detail',
          component: () => import('@/pages/CityDetailPage.vue'),
        },
        {
          path: 'blog',
          name: 'blog',
          component: () => import('@/pages/BlogPage.vue'),
        },
        {
          path: 'blog/:slug',
          name: 'blog-post',
          component: () => import('@/pages/BlogPostPage.vue'),
        },
        {
          path: 'help',
          name: 'help',
          component: () => import('@/pages/HelpPage.vue'),
        },
        {
          path: 'shopping',
          name: 'shopping',
          component: () => import('@/pages/ShoppingPage.vue'),
        },
        {
          path: 'shopping/:id',
          name: 'product-detail',
          component: () => import('@/pages/ProductDetailPage.vue'),
        },
        {
          path: 'shopping/tmapi/:externalId',
          name: 'tmapi-product-detail',
          component: () => import('@/pages/TmapiProductDetailPage.vue'),
        },
        {
          path: 'login',
          name: 'login',
          component: () => import('@/pages/LoginPage.vue'),
        },
        {
          path: 'register',
          name: 'register',
          component: () => import('@/pages/RegisterPage.vue'),
        },
        {
          path: 'forgot-password',
          name: 'forgot-password',
          component: () => import('@/pages/ForgotPasswordPage.vue'),
        },
        {
          path: 'request',
          name: 'request',
          component: () => import('@/pages/RequestServicePage.vue'),
        },
        {
          path: 'contact',
          name: 'contact',
          component: () => import('@/pages/ContactPage.vue'),
        },
        {
          path: 'gallery',
          name: 'gallery',
          component: () => import('@/pages/GalleryPage.vue'),
        },
        {
          path: 'places',
          name: 'cityplaces',
          component: () => import('@/pages/CityPlacesPage.vue'),
        },
        {
          path: 'places/:id',
          name: 'cityplace-detail',
          component: () => import('@/pages/CityPlaceDetailPage.vue'),
        },
        {
          path: 'services/guide/:id',
          name: 'guide-detail',
          component: () => import('@/pages/GuideDetailPage.vue'),
        },
        {
          path: 'services/hotel/:id',
          name: 'hotel-detail',
          component: () => import('@/pages/HotelDetailPage.vue'),
        },
        {
          path: 'services/tours/:id',
          name: 'tour-detail',
          component: () => import('@/pages/TourDetailPage.vue'),
        },
        {
          path: 'services/halal-food/restaurant/:id',
          name: 'restaurant-detail',
          component: () => import('@/pages/RestaurantDetailPage.vue'),
        },
        {
          path: 'services/halal-food/item/:id',
          name: 'food-item-detail',
          component: () => import('@/pages/FoodItemDetailPage.vue'),
        },
        {
          path: 'services/esim/:id',
          name: 'esim-detail',
          component: () => import('@/pages/EsimDetailPage.vue'),
        },
        {
          path: 'services/restaurants',
          name: 'restaurants-list',
          component: () => import('@/pages/RestaurantsListPage.vue'),
        },
        {
          path: 'services/transport',
          name: 'transport-list',
          component: () => import('@/pages/TransportListPage.vue'),
        },
        {
          path: 'services/transport/:id',
          name: 'transport-detail',
          component: () => import('@/pages/TransportDetailPage.vue'),
        },
        {
          path: 'services/medical',
          name: 'medical-list',
          component: () => import('@/pages/MedicalListPage.vue'),
        },
        {
          path: 'services/medical/:id',
          name: 'medical-detail',
          component: () => import('@/pages/MedicalDetailPage.vue'),
        },
      ],
    },
    {
      path: '/user',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'user-dashboard',
          component: () => import('@/pages/app/DashboardPage.vue'),
        },
        {
          path: 'profile',
          name: 'user-profile',
          component: () => import('@/pages/app/ProfilePage.vue'),
        },
        {
          path: 'requests',
          name: 'user-requests',
          component: () => import('@/pages/app/RequestsPage.vue'),
        },
        {
          path: 'requests/:id',
          name: 'user-request-detail',
          component: () => import('@/pages/app/RequestDetailPage.vue'),
        },
        {
          path: 'orders',
          name: 'user-orders',
          component: () => import('@/pages/app/OrdersPage.vue'),
        },
      ],
    },
    // Backward compatibility: redirect /app to /user
    {
      path: '/app',
      redirect: '/user',
    },
    {
      path: '/app/:pathMatch(.*)*',
      redirect: (to) => `/user/${to.params.pathMatch}`,
    },
    {
      path: '/admin',
      component: () => import('@/layouts/AdminLayout.vue'),
      meta: { requiresAuth: true, requiresRole: ['ADMIN', 'OPS', 'EDITOR'] },
      children: [
        {
          path: '',
          name: 'admin-dashboard',
          component: () => import('@/pages/admin/DashboardPage.vue'),
        },
        {
          path: 'leads',
          name: 'admin-leads',
          component: () => import('@/pages/admin/LeadsPage.vue'),
        },
        {
          path: 'leads/:id',
          name: 'admin-lead-detail',
          component: () => import('@/pages/admin/LeadDetailPage.vue'),
        },
        {
          path: 'requests',
          name: 'admin-requests',
          component: () => import('@/pages/admin/RequestsPage.vue'),
        },
        {
          path: 'requests/:id',
          name: 'admin-request-detail',
          component: () => import('@/pages/admin/RequestDetailPage.vue'),
        },
        {
          path: 'payments',
          name: 'admin-payments',
          component: () => import('@/pages/admin/PaymentsPage.vue'),
        },
        {
          path: 'catalog',
          name: 'admin-catalog',
          component: () => import('@/pages/admin/CatalogPage.vue'),
        },
        {
          path: 'shopping',
          name: 'admin-shopping',
          component: () => import('@/pages/admin/ShoppingPage.vue'),
        },
        {
          path: 'media',
          name: 'admin-media',
          component: () => import('@/pages/admin/MediaPage.vue'),
        },
        {
          path: 'homepage',
          name: 'admin-homepage',
          component: () => import('@/pages/admin/HomepagePage.vue'),
        },
        {
          path: 'featured-items',
          name: 'admin-featured-items',
          component: () => import('@/pages/admin/FeaturedItemsPage.vue'),
        },
        {
          path: 'service-offers',
          name: 'admin-service-offers',
          component: () => import('@/pages/admin/ServiceOffersPage.vue'),
        },
        {
          path: 'homepage-banners',
          name: 'admin-homepage-banners',
          component: () => import('@/pages/admin/HomepageBannersPage.vue'),
        },
        {
          path: 'blog',
          name: 'admin-blog',
          component: () => import('@/pages/admin/BlogPage.vue'),
        },
        {
          path: 'users',
          name: 'admin-users',
          component: () => import('@/pages/admin/UsersPage.vue'),
        },
        {
          path: 'service-providers',
          name: 'admin-service-providers',
          component: () => import('@/pages/admin/ServiceProvidersPage.vue'),
        },
        {
          path: 'audit',
          name: 'admin-audit',
          component: () => import('@/pages/admin/AuditPage.vue'),
        },
      ],
    },
    {
      path: '/seller',
      component: () => import('@/layouts/SellerLayout.vue'),
      meta: { requiresAuth: true, requiresRole: ['SELLER'] },
      children: [
        {
          path: '',
          name: 'seller-dashboard',
          component: () => import('@/pages/seller/DashboardPage.vue'),
        },
        {
          path: 'products',
          name: 'seller-products',
          component: () => import('@/pages/seller/ProductsPage.vue'),
        },
        {
          path: 'orders',
          name: 'seller-orders',
          component: () => import('@/pages/seller/OrdersPage.vue'),
        },
      ],
    },
    {
      path: '/ops',
      component: () => import('@/layouts/OpsLayout.vue'),
      meta: { requiresAuth: true, requiresRole: ['ADMIN', 'OPS', 'SELLER', 'PARTNER'] },
      children: [
        {
          path: 'inbox',
          name: 'ops-inbox',
          component: () => import('@/pages/ops/InboxPage.vue'),
        },
        {
          path: 'inbox/:id',
          name: 'ops-inbox-detail',
          component: () => import('@/pages/ops/InboxPage.vue'),
        },
        {
          path: 'offers',
          name: 'ops-offers',
          component: () => import('@/pages/ops/OffersPage.vue'),
        },
        {
          path: 'requests',
          name: 'ops-requests',
          component: () => import('@/pages/ops/RequestsPage.vue'),
        },
        {
          path: 'requests/:id',
          name: 'ops-request-detail',
          component: () => import('@/pages/ops/RequestDetailPage.vue'),
        },
      ],
    },
    {
      path: '/provider',
      component: () => import('@/layouts/ProviderLayout.vue'),
      meta: { requiresAuth: true, requiresRole: ['SERVICE_PROVIDER', 'ADMIN', 'OPS'] },
      children: [
        {
          path: '',
          name: 'provider-dashboard',
          component: () => import('@/pages/provider/DashboardPage.vue'),
        },
        {
          path: 'inbox',
          name: 'provider-inbox',
          component: () => import('@/pages/provider/InboxPage.vue'),
        },
        {
          path: 'inbox/:id',
          name: 'provider-inbox-detail',
          component: () => import('@/pages/provider/InboxPage.vue'),
        },
        {
          path: 'requests',
          name: 'provider-requests',
          component: () => import('@/pages/provider/RequestsPage.vue'),
        },
        {
          path: 'requests/:id',
          name: 'provider-request-detail',
          component: () => import('@/pages/provider/RequestDetailPage.vue'),
        },
        {
          path: 'profile',
          name: 'provider-profile',
          component: () => import('@/pages/provider/ProfilePage.vue'),
        },
        {
          path: 'profile/service/:categoryKey?',
          name: 'provider-service-profile',
          component: () => import('@/pages/provider/ServiceProfilePage.vue'),
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/pages/NotFoundPage.vue'),
    },
  ],
});

console.log('[Router] Router created, routes:', router.getRoutes().length);

router.beforeEach(async (to, from, next) => {
  console.log('[Router] Navigating to:', to.path, 'from:', from.path);
  console.log('[Router] Route meta:', to.meta);
  const authStore = useAuthStore();
  
  // Check if this is a public route - check both the route and matched routes
  const isPublicRoute = to.meta.requiresAuth === false || 
    to.matched.some(record => record.meta.requiresAuth === false) ||
    to.name === 'home' ||
    to.path === '/' ||
    ['login', 'register', 'forgot-password', 'services', 'service-detail', 'cities', 'city-detail', 
     'blog', 'blog-post', 'help', 'shopping', 'product-detail', 'request', 'contact', 'gallery', 'cityplaces'].includes(to.name as string);
  
  if (isPublicRoute) {
    console.log('[Router] Public route, allowing navigation');
    next();
    return;
  }
  
  // Only fetch user if route requires auth - don't block public routes
  if (to.meta.requiresAuth || to.meta.requiresRole) {
    if (authStore.accessToken && !authStore.user) {
      console.log('[Router] Fetching user...');
      try {
        await authStore.fetchUser();
      } catch (error) {
        console.log('[Router] Failed to fetch user, clearing auth');
        // Don't block navigation, just clear invalid token
        authStore.accessToken = null;
        authStore.user = null;
      }
    }
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    console.log('[Router] Auth required, redirecting to login');
    next({ name: 'login', query: { redirect: to.fullPath } });
    return;
  }

  if (to.meta.requiresRole) {
    const requiredRoles = to.meta.requiresRole as string[];
    const userRoles = authStore.user?.roles || [];
    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      console.log('[Router] Role required, redirecting to home');
      next({ name: 'home' });
      return;
    }
  }

  console.log('[Router] Allowing navigation');
  next();
});

export default router;

