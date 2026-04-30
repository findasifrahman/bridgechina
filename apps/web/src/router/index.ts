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
          component: () => import('@/pages/ShoppingPage.vue'),
          meta: { requiresAuth: false },
        },
        {
          path: 'shopping',
          name: 'shopping',
          component: () => import('@/pages/ShoppingPage.vue'),
        },
        {
          path: 'shopping/browse',
          name: 'shopping-browse',
          component: () => import('@/pages/ShoppingBrowsePage.vue'),
          meta: { requiresAuth: false },
        },
        {
          path: 'shopping/shop/:vendorId',
          name: 'shopping-shop',
          component: () => import('@/pages/ShoppingShopPage.vue'),
          meta: { requiresAuth: false },
        },
        {
          path: 'shopping/item/:externalId',
          name: 'product-detail',
          alias: '/shopping/tmapi/:externalId',
          component: () => import('@/pages/TmapiProductDetailPage.vue'),
        },
        {
          path: 'shopping/cart',
          name: 'shopping-cart',
          component: () => import('@/pages/ShoppingCartPage.vue'),
        },
        {
          path: 'shopping/checkout',
          name: 'shopping-checkout',
          component: () => import('@/pages/ShoppingCartPage.vue'),
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
          path: 'contact',
          name: 'contact',
          component: () => import('@/pages/ContactPage.vue'),
        },
        {
          path: 'blog',
          name: 'blog',
          component: () => import('@/pages/BlogPage.vue'),
        },
        {
          path: 'terms',
          name: 'terms',
          component: () => import('@/pages/TermsPage.vue'),
        },
      ],
    },
    {
      path: '/user',
      component: () => import('@/layouts/UserLayout.vue'),
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
          redirect: '/user/orders',
        },
        {
          path: 'requests/:id',
          name: 'user-request-detail',
          redirect: '/user/orders',
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
      meta: { requiresAuth: true, requiresRole: ['ADMIN'] },
      children: [
        {
          path: '',
          name: 'admin-dashboard',
          component: () => import('@/pages/admin/DashboardPage.vue'),
        },
        {
          path: 'shopping',
          name: 'admin-shopping',
          component: () => import('@/pages/admin/ShoppingPage.vue'),
        },
        {
          path: 'pricing',
          name: 'admin-pricing',
          component: () => import('@/pages/admin/PricingSettingsPage.vue'),
        },
        {
          path: 'shopping/products',
          redirect: '/admin/shopping',
        },
        {
          path: 'shopping/categories',
          redirect: '/admin/shopping',
        },
        {
          path: 'orders',
          name: 'admin-orders',
          component: () => import('@/pages/admin/OrdersPage.vue'),
        },
        {
          path: 'payment-proofs',
          name: 'admin-payment-proofs',
          component: () => import('@/pages/admin/PaymentsPage.vue'),
        },
        {
          path: 'products',
          redirect: '/admin/shopping',
        },
        {
          path: 'categories',
          redirect: '/admin/shopping',
        },
        {
          path: 'media',
          name: 'admin-media',
          component: () => import('@/pages/admin/MediaPage.vue'),
        },
        {
          path: 'homepage',
          name: 'admin-homepage',
          component: () => import('@/pages/admin/HomepageBannersPage.vue'),
        },
        {
          path: 'homepage-offers',
          name: 'admin-homepage-offers',
          component: () => import('@/pages/admin/HomepageOffersPage.vue'),
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
          path: 'sellers',
          name: 'admin-sellers',
          component: () => import('@/pages/admin/SellersPage.vue'),
        },
        { path: 'leads', redirect: '/admin/orders' },
        { path: 'leads/:id', redirect: '/admin/orders' },
        { path: 'requests', redirect: '/admin/orders' },
        { path: 'requests/:id', redirect: '/admin/orders' },
        { path: 'payments', redirect: '/admin/payment-proofs' },
        { path: 'catalog', redirect: '/admin/shopping' },
        { path: 'featured-items', redirect: '/admin/shopping' },
        { path: 'service-offers', redirect: '/admin/homepage-offers' },
        { path: 'homepage-offers', redirect: '/admin/homepage-offers' },
        { path: 'homepage-banners', redirect: '/admin/homepage' },
        { path: 'service-providers', redirect: '/admin/sellers' },
        { path: 'shipping-rates', redirect: '/admin/pricing' },
        { path: 'markup', redirect: '/admin/pricing' },
        { path: 'audit', redirect: '/admin/orders' },
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
      redirect: '/admin',
    },
    {
      path: '/ops/:pathMatch(.*)*',
      redirect: '/admin',
    },
    {
      path: '/provider',
      redirect: '/',
    },
    {
      path: '/provider/:pathMatch(.*)*',
      redirect: '/',
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
  const isPublicRoute =
    to.meta.requiresAuth === false ||
    to.matched.some((record) => record.meta.requiresAuth === false) ||
    to.name === 'home' ||
    to.path === '/' ||
    ['login', 'register', 'forgot-password', 'contact', 'blog', 'terms', 'shopping', 'shopping-browse', 'shopping-shop', 'product-detail', 'shopping-cart', 'shopping-checkout'].includes(to.name as string);
  
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

