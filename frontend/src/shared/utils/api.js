import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from './constants';

const AUTH_SCOPES = {
  admin: {
    prefix: '/admin',
    accessKey: 'adminToken',
    refreshKey: 'adminRefreshToken',
    persistKey: 'admin-auth-storage',
    loginPath: '/admin/login',
    areaPrefix: '/admin',
  },
  vendor: {
    prefix: '/vendor',
    accessKey: 'vendor-token',
    refreshKey: 'vendor-refresh-token',
    persistKey: 'vendor-auth-storage',
    loginPath: '/vendor/login',
    areaPrefix: '/vendor',
  },
  delivery: {
    prefix: '/delivery',
    accessKey: 'delivery-token',
    refreshKey: 'delivery-refresh-token',
    persistKey: 'delivery-auth-storage',
    loginPath: '/delivery/login',
    areaPrefix: '/delivery',
  },
  user: {
    prefix: '/user',
    accessKey: 'token',
    refreshKey: 'refresh-token',
    persistKey: 'auth-storage',
    loginPath: '/login',
    areaPrefix: '/',
  },
};

const EXCLUDED_AUTH_SUFFIXES = [
  '/auth/send-otp',
  '/auth/send-registration-otp',
  '/auth/verify-registration-otp',
  '/auth/login',
  '/auth/register',
  '/auth/verify-otp',
  '/auth/resend-otp',
  '/auth/forgot-password',
  '/auth/verify-reset-otp',
  '/auth/reset-password',
  '/auth/refresh',
  '/auth/logout',
];

const refreshInFlight = {
  admin: null,
  vendor: null,
  delivery: null,
  user: null,
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const AUTH_REDIRECT_LOCK_KEY = 'auth-redirect-lock';
const AUTH_REDIRECT_LOCK_MS = 1500;

const redirectTo = (path) => {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  const currentPath = window.location.pathname;
  const lockUntil = Number(sessionStorage.getItem(AUTH_REDIRECT_LOCK_KEY) || 0);

  if (currentPath === path) return;
  if (now < lockUntil) return;

  sessionStorage.setItem(AUTH_REDIRECT_LOCK_KEY, String(now + AUTH_REDIRECT_LOCK_MS));
  window.location.href = path;
};

const getScopeFromUrl = (url = '') => {
  const normalizedUrl = url.toLowerCase();
  if (normalizedUrl.includes('/admin')) return 'admin';
  if (normalizedUrl.includes('/vendor')) return 'vendor';
  if (normalizedUrl.includes('/delivery')) return 'delivery';
  return 'user';
};

const getScopeFromPath = (path = window.location.pathname) => {
  if (path.startsWith('/admin')) return 'admin';
  if (path.startsWith('/vendor')) return 'vendor';
  if (path.startsWith('/delivery')) return 'delivery';
  return 'user';
};

const isExcludedAuthRequest = (scope, url = '') => {
  const { prefix } = AUTH_SCOPES[scope];
  return EXCLUDED_AUTH_SUFFIXES.some((suffix) => url.startsWith(`${prefix}${suffix}`));
};

const dispatchAuthFailure = (scope) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('global-auth-failure', { detail: { scope } }));
};

const clearScopeAuth = (scope) => {
  const config = AUTH_SCOPES[scope];
  localStorage.removeItem(config.accessKey);
  localStorage.removeItem(config.refreshKey);
  localStorage.removeItem(config.persistKey);
};

const shouldAttemptRefresh = (error, scope) => {
  if (error?.response?.status !== 401) return false;
  if (!scope || !AUTH_SCOPES[scope]) return false;

  const refreshToken = localStorage.getItem(AUTH_SCOPES[scope].refreshKey);
  if (!refreshToken) return false;

  const originalRequest = error.config || {};
  if (originalRequest._retry) return false;

  const url = originalRequest.url || '';
  if (isExcludedAuthRequest(scope, url)) return false;

  return true;
};

const runRefresh = async (scope) => {
  if (refreshInFlight[scope]) {
    return refreshInFlight[scope];
  }

  const config = AUTH_SCOPES[scope];
  const currentRefreshToken = localStorage.getItem(config.refreshKey);
  if (!currentRefreshToken) {
    throw new Error('No refresh token available.');
  }

  refreshInFlight[scope] = axios
    .post(`${API_BASE_URL}${config.prefix}/auth/refresh`, {
      refreshToken: currentRefreshToken,
    })
    .then((response) => {
      const payload = response?.data?.data || response?.data || {};
      const nextAccessToken = payload?.accessToken;
      const nextRefreshToken = payload?.refreshToken;
      if (!nextAccessToken || !nextRefreshToken) {
        throw new Error('Invalid refresh response from server.');
      }

      localStorage.setItem(config.accessKey, nextAccessToken);
      localStorage.setItem(config.refreshKey, nextRefreshToken);

      return nextAccessToken;
    })
    .catch((err) => {
       // If the refresh token itself is invalid (401/403), we must log out.
       // For other errors (500, network), we should NOT clear the session.
       const status = err.response?.status;
       if (status === 401 || status === 403) {
         clearScopeAuth(scope);
         dispatchAuthFailure(scope);
       }
       throw err;
    })
    .finally(() => {
      refreshInFlight[scope] = null;
    });

  return refreshInFlight[scope];
};

api.interceptors.request.use(
  (config) => {
    const scope = getScopeFromUrl(config.url || '');
    const token = localStorage.getItem(AUTH_SCOPES[scope].accessKey);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config || {};
    const scope = getScopeFromUrl(originalRequest.url || '');
    const currentPath = window.location.pathname;
    const pathScope = getScopeFromPath(currentPath);

    if (shouldAttemptRefresh(error, scope)) {
      try {
        const nextAccessToken = await runRefresh(scope);
        originalRequest._retry = true;
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh failed with 401/403, runRefresh already handled logout.
        // If it failed with something else, we preserve the original session.
        return Promise.reject(error);
      }
    }

    const getUnderstandableMessage = (err) => {
      const status = err.response?.status;
      const data = err.response?.data;
      const originalRequest = err.config || {};
      const url = originalRequest.url || '';
      const scope = getScopeFromUrl(url);

      // 1. If it's an auth request (login/register), always prefer server-provided message
      if (isExcludedAuthRequest(scope, url)) {
        return data?.message || data?.error || 'Authentication failed. Please try again.';
      }

      // 2. Specific status code handling
      if (status === 401) {
        const token = localStorage.getItem(AUTH_SCOPES[scope].accessKey);
        // Distinguish between actual expiration and just not being logged in
        if (!token) return 'Access restricted. Please log in to continue.';
        return 'Your session has expired. Please log in again.';
      }

      if (status === 403) return data?.message || 'You are not authorized to perform this action.';
      if (status === 404) return data?.message || 'The requested information was not found.';
      if (status === 429) return 'Taking too many actions? Please wait a few seconds.';
      if (status >= 500) return 'Our servers are currently busy. Please try again in a moment.';

      // 3. Specific business logic errors
      if (data?.message?.toLowerCase().includes('out of stock')) return 'Sorry, one or more items just went out of stock.';
      if (data?.message?.toLowerCase().includes('coupon')) return 'This coupon code is not valid or has expired.';

      return data?.message || err.message || 'Something went wrong. Please check your connection.';
    };

    const understandableMessage = getUnderstandableMessage(error);

    const isAuthPage =
      currentPath === '/login' ||
      currentPath === '/register' ||
      currentPath === '/verification' ||
      currentPath === '/forgot-password' ||
      currentPath === '/reset-password' ||
      currentPath.includes('/admin/login') ||
      currentPath.includes('/vendor/login') ||
      currentPath.includes('/delivery/login');

    const isPublicPage =
      currentPath === '/' ||
      currentPath === '/home' ||
      currentPath === '/shop' ||
      currentPath.startsWith('/products') ||
      currentPath.startsWith('/product/') ||
      currentPath === '/offers' ||
      currentPath === '/events';

    // Suppress toast for:
    // 1. Silent location updates (429)
    // 2. Cross-scope errors (e.g. user API failing while on admin page)
    // 3. 401s on public pages for guest users (unless they triggered a specific action)
    const token = localStorage.getItem(AUTH_SCOPES[scope].accessKey);
    const status = error.response?.status;
    const url = originalRequest.url || '';

    const is401_403 = status === 401 || status === 403;
    const is429 = status === 429;
    const isLocationUpdate = url.includes('/location');
    const isCrossScopeError = scope !== pathScope;

    const isGuestOnPublicPage = is401_403 && isPublicPage && !token;

    if (!is429 && !isLocationUpdate && !isCrossScopeError && !isGuestOnPublicPage) {
      toast.error(understandableMessage, {
        duration: 4000,
        position: 'top-center',
        style: {
          background: 'rgba(17, 17, 17, 0.9)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: '#fff',
          padding: '14px 24px',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
          maxWidth: '90%',
          textAlign: 'center',
        },
        iconTheme: {
          primary: '#ff4b4b',
          secondary: '#fff',
        },
      });
    }

    // 401 — session expired / token invalid
    if (error.response?.status === 401) {
      // Check if we should even handle this (is it a legitimate auth failure for the current scope?)
      const isAuthPage = currentPath.includes('/login') || currentPath.includes('/register');
      if (isAuthPage) return Promise.reject(error);

      // Only logout IF it's a 401 AND a refresh isn't possible (or failed)
      const canRefresh = shouldAttemptRefresh(error, scope);
      if (!canRefresh) {
        const activeScope = pathScope;
        clearScopeAuth(scope);
        dispatchAuthFailure(scope);

        if (scope === activeScope) {
           const routeConfig = AUTH_SCOPES[scope];
           if (scope === 'user') {
             if (!isPublicPage) redirectTo(routeConfig.loginPath);
           } else if (currentPath.startsWith(routeConfig.areaPrefix) && currentPath !== routeConfig.loginPath) {
             redirectTo(routeConfig.loginPath);
           }
        }
      }
    }

    // 403 for vendor/delivery — account suspended or deactivated after login
    if (error.response?.status === 403 && (scope === 'vendor' || scope === 'delivery')) {
      const routeConfig = AUTH_SCOPES[scope];
      if (currentPath.startsWith(routeConfig.areaPrefix) && currentPath !== routeConfig.loginPath) {
        clearScopeAuth(scope);
        dispatchAuthFailure(scope);
        redirectTo(routeConfig.loginPath);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
