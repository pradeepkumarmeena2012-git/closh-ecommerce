import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuthStore } from '../store/adminStore';
import adminMenu from '../config/adminMenu.json';

/**
 * Maps route path prefixes to the permission required to access them.
 * Order matters — more specific prefixes should come first.
 * Superadmins bypass all checks.
 */
const ROUTE_PERMISSION_MAP = [
  // Staff
  { prefix: '/admin/staff', permission: 'staff_manage' },
  // Orders
  { prefix: '/admin/orders', permission: 'orders_manage' },
  { prefix: '/admin/return-requests', permission: 'orders_manage' },
  // Products
  { prefix: '/admin/products', permission: 'products_manage' },
  // Categories
  { prefix: '/admin/categories', permission: 'categories_manage' },
  // Brands
  { prefix: '/admin/brands', permission: 'brands_manage' },
  // Customers
  { prefix: '/admin/customers', permission: 'customers_manage' },
  // Delivery
  { prefix: '/admin/delivery', permission: 'delivery_manage' },
  // Vendors
  { prefix: '/admin/vendors', permission: 'vendors_manage' },
  // Attributes
  { prefix: '/admin/attributes', permission: 'attributes_manage' },
  // Marketing
  { prefix: '/admin/offers', permission: 'marketing_manage' },
  { prefix: '/admin/banners', permission: 'marketing_manage' },
  { prefix: '/admin/promocodes', permission: 'marketing_manage' },
  { prefix: '/admin/campaigns', permission: 'marketing_manage' },
  // Notifications
  { prefix: '/admin/notifications', permission: ['notifications_manage', 'support_manage'] },
  // Support
  { prefix: '/admin/support', permission: 'support_manage' },
  { prefix: '/admin/chat-support', permission: 'support_manage' },
  { prefix: '/admin/customer-support', permission: 'support_manage' },
  { prefix: '/admin/vendor-support', permission: 'support_manage' },
  // Reports
  { prefix: '/admin/reports', permission: 'reports_view' },
  // Finance
  { prefix: '/admin/finance', permission: 'finance_view' },
  // Analytics
  { prefix: '/admin/analytics', permission: 'finance_view' },
  // Settings
  { prefix: '/admin/settings', permission: 'settings_manage' },
  // Policies
  { prefix: '/admin/policies', permission: 'settings_manage' },
  // Firebase
  { prefix: '/admin/firebase', permission: 'settings_manage' },
  // Reviews
  { prefix: '/admin/reviews', permission: 'products_manage' },
  // Content
  { prefix: '/admin/content', permission: 'settings_manage' },
  // Dashboard
  { prefix: '/admin/dashboard', permission: 'dashboard_view' },
  // More page — accessible to all authenticated admins
  { prefix: '/admin/more', permission: null },
];

const normalizePath = (pathname) => {
  if (pathname.startsWith('/staff/')) {
    // Replace /staff/[role]/ with /admin/
    const parts = pathname.split('/');
    if (parts.length >= 3) {
      return '/admin/' + parts.slice(3).join('/');
    }
    return '/admin/dashboard';
  }
  return pathname;
};

const getBasePrefix = (admin) => {
  if (!admin) return '/admin';
  const isPrivileged = admin.role === 'superadmin' || admin.role === 'admin';
  if (isPrivileged) return '/admin';
  const roleSlug = admin.role.toLowerCase().trim().replace(/\s+/g, '-');
  return `/staff/${roleSlug}`;
};

/**
 * Find the required permission for a given pathname.
 * Returns the permission string, null (meaning no specific permission needed),
 * or undefined (no mapping found — allow by default).
 */
const getRequiredPermission = (pathname) => {
  const normalizedPath = normalizePath(pathname);
  const match = ROUTE_PERMISSION_MAP.find((entry) =>
    normalizedPath.startsWith(entry.prefix)
  );
  return match ? match.permission : undefined;
};

/**
 * Get the first accessible route for the current admin based on their permissions.
 * Returns the most specific path possible to avoid intermediate redirects.
 */
const getFirstAccessibleRoute = (admin) => {
  if (!admin) return '/admin/dashboard';
  const basePrefix = getBasePrefix(admin);
  const isPrivileged = admin.role === 'superadmin' || admin.role === 'admin';
  if (isPrivileged) return '/admin/dashboard';

  for (const item of adminMenu) {
    if (!item.permission || admin.permissions?.includes(item.permission)) {
      const route = item.route.replace('/admin', basePrefix);
      return route;
    }
  }
  return `${basePrefix}/more`; // Fallback to 'more' page if nothing else is accessible
};

/**
 * AdminPermissionGuard
 * Wraps admin page content and blocks access if the logged-in employee
 * does not have the permission required for the current route.
 */
const AdminPermissionGuard = ({ children }) => {
  const { admin, isLoading } = useAdminAuthStore();
  const location = useLocation();

  // If we're still loading the admin profile, don't redirect yet
  // This prevents flickering during rehydration
  if (isLoading || !admin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Superadmins and Admins bypass all permission checks
  const isPrivileged = admin?.role === 'superadmin' || admin?.role === 'admin';
  if (isPrivileged) {
    return children;
  }

  const requiredPermission = getRequiredPermission(location.pathname);

  // No specific permission mapped → allow access
  if (requiredPermission === undefined || requiredPermission === null) {
    return children;
  }

  // Check if the admin has the required permission
  let hasPermission = false;
  if (Array.isArray(requiredPermission)) {
    hasPermission = requiredPermission.some(p => admin?.permissions?.includes(p));
  } else {
    hasPermission = admin?.permissions?.includes(requiredPermission);
  }

  if (!hasPermission) {
    console.warn(`Access denied for ${location.pathname}. Required: ${requiredPermission}. Redirecting...`);
    // Redirect to first accessible route
    const fallbackRoute = getFirstAccessibleRoute(admin);
    
    // If we're already at the fallback route, don't redirect (avoids infinite loops)
    if (location.pathname === fallbackRoute) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600">You do not have permission to view this page.</p>
        </div>
      );
    }
    
    return <Navigate to={fallbackRoute} replace />;
  }

  return children;
};

export default AdminPermissionGuard;
