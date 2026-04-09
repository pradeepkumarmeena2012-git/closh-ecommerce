# Role-Based Push Notification Implementation Plan

This plan outlines the architecture for a unified, role-based notification system using FCM (Firebase Cloud Messaging) and WebSockets.

## 1. Core Architecture (Backend)
We will utilize the existing `notification.service.js` but standardize the payload and triggering mechanisms.

### Notification Model Enhancements
- Standardize `type` constants:
  - `ORDER_UPDATE`: For Users/Vendors/Delivery.
  - `NEW_MISSION`: Specifically for Delivery.
  - `NEW_ORDER`: Specifically for Vendors (with Buzzer sound).
  - `KYC_STATUS`: For Vendors/Delivery.
  - `ADMIN_BROADCAST`: For all/selected roles.

### Notification Service Updates
- **Custom Sounds**: Ensure "High Importance" channels are created for Vendor/Delivery apps to support the "Buzzer" sound even when the app is in the background.

## 2. Role-Specific Business Logic

### Vendor Notifications
- **Trigger**: `post_order_create` hook.
- **Payload**: "New Order #1234 received! Please prepare for pickup."
- **Aesthetic**: Intense sound (buzzer) and high priority.
- **Implementation**: Add FCM token update to `vendor/auth/login`.

### Delivery Notifications
- **Trigger**: `delivery_assignment` logic.
- **Payload**: "New Mission Assigned! View details to accept."
- **Aesthetic**: Distinctive arrival sound.

### User/Customer Notifications
- **Trigger**: Order status changes (Accepted -> Shipped -> Out for Delivery -> Delivered).
- **Payload**: "Your order is out for delivery! Track your rider now."

### Admin Notifications
- **Trigger**: New Vendor/Delivery registration, support tickets, system alerts.

## 3. Frontend Integration (Web & App)

### FCM Token Management
Create a shared hook/utility to:
1. Request notification permissions.
2. Retrieve the FCM device token.
3. Sync the token with the backend on every login or token refresh.

### Notification Center UI
- **Unified Component**: A `NotificationList` component that renders different styles based on the notification `type`.
- **Real-time Sync**: Use WebSockets (`socket.service.js`) to update the "Unread" count in the header without a page refresh.

## 4. Implementation Steps

### Phase 1: Backend API Hardening
1. **Fix Vendor Auth**: Add `fcmToken` support to the Vendor login controller (currently missing).
2. **Unified Update Endpoint**: Add a PUT `/api/auth/fcm-token` across all modules for background token updates.

### Phase 2: Notification Triggers
1. Modify `order.controller.js` and `orderWorkflow.service.js` to call `createNotification()` at every lifecycle step.
2. Implement role checking to ensure the correct recipient gets the correct message.

### Phase 3: Frontend Setup
1. Configure Firebase Cloud Messaging in the frontend.
2. Add a `NotificationBell` to `UserHeader`, `VendorHeader`, and `DeliveryLayout`.

---

> [!TIP]
> **Custom Sounds**: For Android, we must define a "Notification Channel" with the custom sound file name (`buzzer.mp3`) for it to work in the background.
