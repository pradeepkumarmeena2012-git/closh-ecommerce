# Session Stability & Logout Fix Plan

The "logout problem" typically occurs due to aggressive session clearing in the API interceptor or mismatched token expiration settings. This plan outlines the steps to stabilize authentication across the platform.

## 1. Backend Token Life Optimization
Currently, the access token and refresh token have the same lifespan (7 days), which defeats the purpose of the refresh mechanism and can lead to unexpected logouts when both expire simultaneously.

### Actions:
- **Configure Proper Durations**:
  - `JWT_EXPIRES_IN`: Change from `7d` to `4h` (short-lived access).
  - `JWT_REFRESH_EXPIRES_IN`: Change from `7d` to `30d` (long-lived persistence).
- **Update `.env`**:
  ```env
  JWT_EXPIRES_IN=4h
  JWT_REFRESH_EXPIRES_IN=30d
  ```
- **Update `backend/src/config/jwt.js`**: Ensure defaults are sensible.

## 2. Frontend Interceptor Resilience
The interceptor in `frontend/src/shared/utils/api.js` needs to be more "forgiving" to prevent accidental logouts during minor network hiccups or backend delays.

### Actions:
- **Refine `shouldAttemptRefresh`**:
  - Ensure it doesn't return `false` just because a retry is in progress.
- **Fail-Safe for `runRefresh`**:
  - If the refresh request itself fails with a non-401 error (e.g., 500 or network timeout), do **NOT** log the user out immediately. Retrying the original request might still work later.
- **Debounced Logout**:
  - Add a check to prevent multiple simultaneous logouts across tabs.

## 3. Scope Protection
Verify that authentication failures in one role (e.g., Vendor) do not impact the active session of another role (e.g., User/Customer).

### Actions:
- **Validate `getScopeFromUrl`**: Ensure it correctly maps API paths to the respective authentication keys.
- **Isolate State Clearing**: Verify that `clearScopeAuth(scope)` only touches keys specific to that scope.

## 4. Implementation Steps

### Phase 1: Backend Configuration
1. Modify `backend/.env` with new JWT durations.
2. Restart backend to apply changes.

### Phase 3: Interceptor Refactoring
1. Update `frontend/src/shared/utils/api.js` to handle refresh failures more gracefully.
2. Prevent immediate `clearScopeAuth` if the error status isn't explicitly 401 or 403.

### Phase 4: Testing
1. Manually expire an access token and verify that the refresh mechanism extends the session without a logout.
2. Simulate a backend 500 error on the refresh endpoint and ensure the user *stays* logged in (to retry later) instead of being kicked out immediately.

---

> [!IMPORTANT]
> The primary goal is to ensure that a 401 error **always** attempts a refresh first, and a logout **only** happens if the refresh token is definitively invalid or expired.
