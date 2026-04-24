import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', index: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', index: true },
    name: String,
    image: String,
    price: Number,
    quantity: Number,
    vendorPrice: { type: Number, default: 0 }, // Snapshot of product.vendorPrice
    commissionRate: { type: Number, default: 0 }, // Snapshot of vendor.commissionRate or category commission
    commissionAmount: { type: Number, default: 0 }, // (Price - VendorPrice) * commissionRate (if applicable) OR standard commission
    marginAmount: { type: Number, default: 0 }, // (Price - VendorPrice) - this is the markup margin
    variant: { type: mongoose.Schema.Types.Mixed, default: {} },
    variantKey: String,
});

const vendorItemGroupSchema = new mongoose.Schema({
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    vendorName: String,
    items: [orderItemSchema],
    subtotal: Number,
    basePrice: Number,
    shipping: Number,
    tax: Number,
    discount: Number,
    platformFee: { type: Number, default: 0 },
    commissionRate: { type: Number, default: 0 },
    commissionAmount: { type: Number, default: 0 },
    vendorEarnings: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'ready_for_pickup', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled', 'return requested'],
        default: 'pending',
    },
});

// ──────────── Delivery Flow (Antigravity Engine) ────────────
const deliveryFlowItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId },
    name: String,
    image: String,
    price: Number,
    quantity: Number,
    variant: mongoose.Schema.Types.Mixed,
    decision: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
}, { _id: false });

const deliveryFlowSchema = new mongoose.Schema({
    phase: {
        type: String,
        enum: ['assigned', 'picked_up', 'out_for_delivery', 'arrived', 'try_and_buy', 'payment_pending', 'delivered'],
        default: 'assigned',
    },
    // Pickup
    pickupPhoto: String,
    pickupCompletedAt: Date,
    // Start / En-route
    startedAt: Date,
    // Arrived
    arrivedAt: Date,
    // Try & Buy
    tryAndBuyItems: [deliveryFlowItemSchema],
    tryAndBuyCompletedAt: Date,
    // Payment
    paymentMethod: { type: String, enum: ['cash', 'qr', 'online'] },
    paymentCollected: { type: Boolean, default: false },
    originalAmount: Number,
    finalAmount: Number,
    paymentCollectedAt: Date,
    // Proofs
    openBoxPhoto: String,
    deliveryProofPhoto: String,
    // OTP (managed inside flow)
    otpHash: String,
    otpDebug: String,
    otpExpiry: Date,
    otpSentAt: Date,
    otpAttempts: { type: Number, default: 0 },
    otpVerified: { type: Boolean, default: false },
    otpVerifiedAt: Date,
    // Live location snapshot
    lastLocation: {
        type: { type: String, enum: ['Point'] },
        coordinates: [Number],
    },
}, { _id: false });

const orderSchema = new mongoose.Schema(
    {
        orderId: { type: String, required: true, unique: true, index: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, default: null },
        guestInfo: { name: String, email: String, phone: String },
        items: [orderItemSchema],
        vendorItems: [vendorItemGroupSchema],
        shippingAddress: {
            name: String,
            email: String,
            phone: String,
            address: String,
            city: String,
            state: String,
            zipCode: String,
            country: String,
        },
        paymentMethod: { type: String, enum: ['card', 'cash', 'bank', 'wallet', 'upi', 'cod'] },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'refunded'],
            default: 'pending',
        },
        status: {
            type: String,
            enum: [
                'pending',           // Initial placement
                'accepted',          // Vendor accepted
                'ready_for_pickup',  // Vendor marked ready + uploaded photo
                'searching',         // System searching for riders
                'assigned',          // Rider claimed order
                'picked_up',         // Rider picked up + OTP generated
                'out_for_delivery',  // Rider out for delivery
                'delivered',         // Order completed + user verified
                'cancelled',         // Cancelled by any party or timeout
                'return requested'   // Customer requested return
            ],
            default: 'pending',
            index: true,
        },
        orderType: {
            type: String,
            enum: ['check_and_buy', 'try_and_buy'],
            required: true,
        },
        deliveryType: {
            type: String,
            enum: ['online'],
            default: 'online',
        },
        readyAt: Date,
        readyPhoto: String,    // Proof of being ready from vendor
        pickupPhoto: String,   // Proof of pickups from vendor by rider
        deliveryPhoto: String, // Full package photo from rider
        openBoxPhoto: String,  // Proof of internal item state from rider
        customerReceiptPhoto: String, // Optional user-side receipt verification
        pickupLocation: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number], default: [0, 0] },
        },
        dropoffLocation: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number], default: [0, 0] },
        },
        subtotal: { type: Number, default: 0 },
        shipping: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        platformFee: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        couponCode: { type: String },
        couponDiscount: { type: Number, default: 0 },
        idempotencyKey: { type: String, sparse: true },
        idempotencyScope: { type: String, sparse: true },
        trackingNumber: { type: String, unique: true, sparse: true },
        razorpayOrderId: { type: String, sparse: true },
        razorpayPaymentId: { type: String, sparse: true },
        razorpaySignature: { type: String, sparse: true, select: false },
        deliveryBoyId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryBoy', index: true },
        deliveryEarnings: { type: Number, default: 0 },
        deliveryDistance: { type: Number, default: 0 },
        deliveryTracking: {
            startLocation: {
                type: { type: String, enum: ['Point'], default: 'Point' },
                coordinates: { type: [Number], default: [0, 0] }
            },
            path: [[Number]], // Array of [lng, lat] coordinates
            totalDistance: { type: Number, default: 0 }, // in kilometers
            lastUpdate: Date
        },
        deliveryOtpHash: { type: String, select: false },
        deliveryOtpExpiry: { type: Date, select: false },
        deliveryOtpSentAt: { type: Date, select: false },
        deliveryOtpDebug: { type: String, select: false },
        deliveryOtpVerifiedAt: Date,
        deliveryOtpAttempts: { type: Number, default: 0, select: false },
        estimatedDelivery: Date,
        vendorAcceptedAt: Date,
        readyAt: Date,
        searchStartedAt: Date,
        assignedAt: Date,
        pickedUpAt: Date,
        deliveredAt: Date,
        isCashSettled: { type: Boolean, default: false },
        settledAt: Date,
        cancelledAt: Date,
        cancellationReason: String,
        isDeleted: { type: Boolean, default: false, index: true },
        deletedAt: Date,
        deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
        deviceToken: { type: String }, // Store guest/user device token for status updates if not logged in
        codCollectionMethod: { type: String, enum: ['cash', 'qr'] },
        codCollectedAt: Date,
        deliveryFlow: deliveryFlowSchema,
    },
    { timestamps: true }
);


// Index for spatial queries
orderSchema.index({ pickupLocation: '2dsphere' });
orderSchema.index({ status: 1, pickupLocation: '2dsphere' }); // Optimization for available orders
orderSchema.index({ dropoffLocation: '2dsphere' });

// Compound Index for Delivery Dashboard & active task tracking
orderSchema.index({ deliveryBoyId: 1, isDeleted: 1, status: 1, updatedAt: -1 });

// Prevent duplicate order creation for the same retry key per actor (user/guest).
orderSchema.index(
    { idempotencyScope: 1, idempotencyKey: 1 },
    {
        unique: true,
        sparse: true,
        partialFilterExpression: {
            idempotencyScope: { $exists: true, $type: 'string' },
            idempotencyKey: { $exists: true, $type: 'string' },
        },
    }
);

orderSchema.methods.generateDeliveryOtp = function () {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.deliveryOtpHash = otp;
    this.deliveryOtpDebug = otp;
    this.deliveryOtpSentAt = new Date();
    this.deliveryOtpExpiry = new Date(Date.now() + 6 * 60 * 60 * 1000); 
    return otp;
};

orderSchema.methods.compareDeliveryOtp = function (otp) {
    if (!this.deliveryOtpHash) return false;
    return String(this.deliveryOtpHash) === String(otp) || String(this.deliveryOtpDebug) === String(otp);
};

const Order = mongoose.model('Order', orderSchema);
export { Order };
export default Order;
