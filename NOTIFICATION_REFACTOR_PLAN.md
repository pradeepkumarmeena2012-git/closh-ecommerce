# Notification De-Cluttering & Role-Targeting Plan

The current system has "noise" because multiple services are emitting overlapping events, and the content is not always tailored to the recipient's role.

## 1. Eliminate Redundant Socket Events
Currently, `createNotification()` already handles real-time delivery via `new_notification` socket event. We will remove manual `emitEvent` calls in controllers that duplicate this work.

### Affected Controllers
- **User Order Controller**: Remove manual `emitEvent` for `rider_assigned`, `rider_arrived`, `order_delivered`, etc., as they should be handled by the specialized `OrderNotificationService`.
- **Return Requests**: Consolidate the 4 manual emits into the `createNotification` flow.

## 2. Refactor `OrderNotificationService`
Update `backend/src/services/orderNotification.service.js` to create role-specific messages.

| Role | Status: `assigned` | Status: `shipped` | Status: `delivered` |
| :--- | :--- | :--- | :--- |
| **Customer** | "Rider [Name] is coming!" | "Your order is on the way." | "Delivered! Rate us now." |
| **Vendor** | "Partner assigned for your items." | "Rider has picked up your items." | "Customer received items. Payment processed." |
| **Delivery** | "New Mission Assigned." | "Mission status: En route." | "Mission Complete. Payout added." |

### Actions:
- **Tailor Messages**: Use a switch/map to generate different `message` strings based on `recipientType`.
- **Deduplication**: Implement a small delay or check to prevent the same status update from firing twice within 5 seconds.

## 3. Scope Isolation for Multi-Vendor Orders
If an order involves multiple vendors:
- Notifications about **Packing** or **Preparation** should only be sent to the **specific vendor** involved in that action.
- Statuses like `delivered` or `assigned` (global status) should still be sent to all involved vendors.

## 4. Implementation Steps

### Phase 1: Service Refactor (Backend)
1. Clean up `OrderNotificationService.js` to use role-based messaging strings.
2. Remove redundant `emitEvent` calls in `OrderNotificationService.js` (line 79, 86, 146).

### Phase 2: Controller Cleanup (Backend)
1. Audit `admin`, `vendor`, and `user` controllers.
2. Replace manual `emitEvent` + `createNotification` combos with a single, clean `OrderNotificationService` call.

### Phase 3: Frontend Alignment
1. Update `VendorHeader.jsx` to handle the standardized `new_notification` payload effectively.
2. Ensure the "Buzzer" sound only triggers for `type: 'order'` and status `pending`.

---

> [!IMPORTANT]
> This plan will reduce the notification volume for Vendors by roughly 50-70% while making the remaining alerts much more relevant.
