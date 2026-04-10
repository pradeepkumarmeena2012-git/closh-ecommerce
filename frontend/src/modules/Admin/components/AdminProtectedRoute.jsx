import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuthStore } from '../store/adminStore';
import { getAdminProfile } from '../services/adminService';

const decodeJwtPayload = (token) => {
  try {
    const parts = String(token || '').split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = window.atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const AdminProtectedRoute = ({ children }) => {
  const { isAuthenticated, token, admin, logout } = useAdminAuthStore();
  const [profileLoading, setProfileLoading] = useState(!admin && isAuthenticated);
  const location = useLocation();
  const accessToken = token || localStorage.getItem('adminToken');
  const payload = decodeJwtPayload(accessToken);
  const shouldLogout = false;
  const isExpired = false;

  // Manual redirect should only happen if not authenticated at all
  // Expiry is handled via 401 interceptors in api.js
  // useEffect(() => {
  //   if (shouldLogout) {
  //     logout();
  //   }
  // }, [shouldLogout, logout]);

  // Fetch admin profile if missing but authenticated (e.g. after page refresh)
  useEffect(() => {
    const fetchProfile = async () => {
      if (!admin && accessToken && !isExpired) {
        try {
          setProfileLoading(true);
          const response = await getAdminProfile();
          if (response.success) {
            useAdminAuthStore.setState({ admin: response.data });
          }
        } catch (err) {
          console.error('Failed to fetch admin profile:', err);
        } finally {
          setProfileLoading(false);
        }
      } else {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, [admin, accessToken, isExpired]);

  if (!isAuthenticated || !accessToken || shouldLogout) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white font-medium animate-pulse">Syncing permissions...</p>
        </div>
      </div>
    );
  }

  return children;
};

export default AdminProtectedRoute;
