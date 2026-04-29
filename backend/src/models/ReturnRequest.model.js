import mongoose from 'mongoose';

const returnRequestSchema = new mongoose.Schema(
    {
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
        returnId: { type: String, required: true, unique: true, index: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
        vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', index: true },
        items: [
            {
                productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
                name: String,
                quantity: Number,
                reason: String,
            },
        ],
        reason: { type: String, required: true },
        status: {
            type: String,
            enum: ['pending', 'approved', 'processing', 'rejected', 'completed'],
            default: 'pending',
            index: true,
        },
        refundAmount: Number,
        refundStatus: { type: String, enum: ['pending', 'processed', 'failed'] },
        refundId: String,
        refundNotes: String,
        adminNote: String,
        rejectionReason: String,
        images: [String],
        deliveryBoyId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryBoy', index: true },
        pickupLocation: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number], default: [0, 0] },
        },
        dropoffLocation: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number], default: [0, 0] },
        },
        pickupPhoto: String,
        deliveryPhoto: String,
        upiId: String,
        isUpiRequested: { type: Boolean, default: false },
        pickupOtpHash: { type: String },
        pickupOtpDebug: { type: String },
        pickupOtpExpiry: { type: Date },
        deliveryOtpHash: { type: String },
        deliveryOtpDebug: { type: String },
        deliveryOtpExpiry: { type: Date },
        deliveryDistance: { type: Number, default: 0 },
        deliveryEarnings: { type: Number, default: 0 },
    },
    { timestamps: true }
);

const ReturnRequest = mongoose.model('ReturnRequest', returnRequestSchema);
export { ReturnRequest };
export default ReturnRequest;
