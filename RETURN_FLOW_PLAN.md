# Return Flow Implementation Analysis & Plan

This document outlines the proposed implementation for the **Return Flow** in Closh, based on the user requirements.

## 1. Return Eligibility Rules
Returns will only be permitted if the following conditions are met:
- **Order Type**: The order MUST be of type `check_and_buy`.
- **Order Status**: The order MUST be in `delivered` status.
- **Time Window**: The return must be requested within **24 hours** of the delivery time (`deliveredAt`).
- **Try & Buy Restriction**: Orders of type `try_and_buy` are **NOT** eligible for returns after the delivery boy leaves. For Try & Buy, the decision is made on the spot during delivery.

## 2. Technical Flow

### A. Customer Request (Frontend)
- **Button Visibility**: The "Return Items" button will be conditionally rendered in the `OrderDetail` page.
  - Logic: `order.status === 'delivered' && order.orderType === 'check_and_buy' && isWithin24Hours(order.deliveredAt)`
- **Modal**: A return modal will capture:
  - Reason for return.
  - Photos of the product (optional but recommended).
  - Selected vendor (for multi-vendor orders).

### B. Backend Request Handling
- **Endpoint**: `POST /api/user/orders/:id/returns`
- **Validation**:
  - Verify `orderType === 'check_and_buy'`.
  - Verify `deliveredAt` is within 24 hours.
  - Check if a return request already exists for this order/vendor.
- **Data Creation**:
  - Create a new entry in the `ReturnRequest` collection.
  - Update `Order` status to `return requested`.
- **Notifications**: Notify Admin and the respective Vendor.

### C. Vendor Approval
- Vendor reviews the return request.
- Status updates: `pending` -> `approved` or `rejected`.
- If `approved`, the return request becomes "Available" for delivery partners.

### D. Delivery Partner Flow (Reverse Logistics)
1.  **Discovery**: Delivery boys see available return pickups in their "Available Tasks" tab.
2.  **Acceptance**: A delivery boy accepts the return mission.
3.  **Pickup**:
    - Delivery boy arrives at the Customer's location.
    - Verifies items and takes a **Pickup Photo**.
    - Status updates to `picked_up`.
4.  **Drop-off**:
    - Delivery boy delivers the items back to the Vendor.
    - Takes a **Delivery Photo** at the vendor's shop.
    - Status updates to `completed`.

### E. Refund Processing
- **Trigger**: Once the return status is marked as `completed` by the delivery boy.
- **Action**:
  - Calculate the refund amount (item price + applicable taxes, minus any non-refundable fees if configured).
  - Credit the amount to the **User's Wallet** (or process via original gateway if integrated).
  - Update `ReturnRequest.refundStatus` to `processed`.

## 3. Implementation Checklist

### Backend Updates
- [ ] Update `createReturnRequest` in `order.controller.js` to strictly enforce `check_and_buy` order type.
- [ ] Ensure `deliveredAt` timestamp is accurately recorded during delivery completion.
- [ ] Implement automated wallet credit upon `ReturnRequest` completion.

### Frontend Updates (Customer App)
- [ ] Update `OrderDetail.jsx` to hide "Return" button for `try_and_buy`.
- [ ] Implement 24-hour countdown/logic for button visibility.
- [ ] Show current return status (e.g., "Return Pickup Assigned", "Return Completed").

### Frontend Updates (Delivery App)
- [ ] Ensure "Return Pickups" are clearly distinguished from "New Deliveries".
- [ ] Add flow for "Return Pickup" (Customer -> Vendor).

---
**Note**: For `try_and_buy` orders, only the **COD** (Cash on Delivery) or **Digital at Door** options will be available at checkout to simplify the on-the-spot decision process.
