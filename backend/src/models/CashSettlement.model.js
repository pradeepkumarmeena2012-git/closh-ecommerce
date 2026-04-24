import mongoose from 'mongoose';

const cashSettlementSchema = new mongoose.Schema(
    {
        deliveryBoyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'DeliveryBoy',
            required: true,
            index: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 1,
        },
        razorpayOrderId: {
            type: String,
            required: true,
            unique: true,
        },
        razorpayPaymentId: {
            type: String,
        },
        razorpaySignature: {
            type: String,
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed'],
            default: 'pending',
            index: true,
        },
        paymentDetails: {
            type: mongoose.Schema.Types.Mixed,
        },
        settledAt: {
            type: Date,
        },
    },
    { timestamps: true }
);

const CashSettlement = mongoose.model('CashSettlement', cashSettlementSchema);
export default CashSettlement;
