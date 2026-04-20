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

    // If we should refresh, do it and retry
    if (shouldAttemptRefresh(error, scope)) {
      try {
        const nextAccessToken = await runRefresh(scope);
        originalRequest._retry = true;
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        return Promise.reject(error);
      }
    }

    // Otherwise, handle error normally (toast and redirect)
    const getUnderstandableMessage = (err) => {
      const status = err.response?.status;
      const data = err.response?.data;
      const url = err.config?.url || '';
      const scope = getScopeFromUrl(url);

      if (isExcludedAuthRequest(scope, url)) {
        return data?.message || data?.error || 'Authentication failed.';
      }

      if (status === 401) {
        const token = localStorage.getItem(AUTH_SCOPES[scope].accessKey);
        if (!token) return 'Access restricted. Please log in.';
        return 'Your session has expired. Please log in again.';
      }

      if (status === 403) return data?.message || 'Access denied.';
      if (status === 404) return data?.message || 'Not found.';
      if (status === 429) return 'Too many attempts. Please wait.';
      if (status >= 500) return 'Server busy. Please try again later.';

      return data?.message || err.message || 'Something went wrong.';
    };

    const status = error.response?.status;
    const understandableMessage = getUnderstandableMessage(error);
    const token = localStorage.getItem(AUTH_SCOPES[scope].accessKey);

    const isPublicPage = ['/', '/home', '/shop'].includes(currentPath) || 
                        currentPath.startsWith('/products') || 
                        currentPath.startsWith('/product/') ||
                        currentPath.startsWith('/legal/');

    const isSilent = originalRequest.silent || originalRequest.headers?.silent;
    const isRefreshing = !!refreshInFlight[scope];
    const isCrossScope = scope !== pathScope;

    // Suppress toasts for background/silent/refreshing/guest-public requests
    const shouldSuppressToast = isSilent || isRefreshing || isCrossScope || (status === 401 && isPublicPage && !token) || status === 429;

    if (!shouldSuppressToast) {
       toast.error(understandableMessage, {
         duration: 4000,
         position: 'top-center'
       });
    }

    // 401/403 Handling (Logout & Redirect)
    if (status === 401) {
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        const canRefresh = shouldAttemptRefresh(error, scope);
        if (!canRefresh && !isRefreshing) {
          clearScopeAuth(scope);
          dispatchAuthFailure(scope);
          if (scope === pathScope && !isPublicPage) {
            redirectTo(AUTH_SCOPES[scope].loginPath);
          }
        }
      }
    }

    if (status === 403 && (scope === 'vendor' || scope === 'delivery')) {
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
