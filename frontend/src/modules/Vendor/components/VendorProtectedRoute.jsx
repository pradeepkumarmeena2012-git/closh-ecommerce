import { Navigate, useLocation } from 'react-router-dom';
import { useVendorAuthStore } from '../store/vendorAuthStore';
import { decodeJwtPayload } from '../../../shared/utils/helpers';
import { useEffect } from 'react';

const VendorProtectedRoute = ({ children }) => {
  const { isAuthenticated, token, logout } = useVendorAuthStore();
  const location = useLocation();
  const accessToken = token || localStorage.getItem('vendor-token');
  const payload = decodeJwtPayload(accessToken);
  const role = String(payload?.role || '').toLowerCase();
  const isExpired = false;

  const hasHydrated = useVendorAuthStore(state => state._hasHydrated);

  // Manual redirect should only happen if not authenticated at all
  // Expiry is handled via 401 interceptors in api.js
  // useEffect(() => {
  //   if (isExpired && isAuthenticated && hasHydrated) {
  //     logout();
  //   }
  // }, [isExpired, isAuthenticated, logout, hasHydrated]);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated || !accessToken || isExpired || (role && role !== 'vendor')) {
    return <Navigate to="/vendor/login" state={{ from: location }} replace />;
  }

  return children;
};

export default VendorProtectedRoute;
