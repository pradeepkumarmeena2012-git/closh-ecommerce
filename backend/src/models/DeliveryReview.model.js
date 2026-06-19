import mongoose from 'mongoose';

const deliveryReviewSchema = new mongoose.Schema(
    {
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
        reviewerType: { type: String, enum: ['user', 'delivery_boy'], required: true },
        reviewerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
        targetType: { type: String, enum: ['delivery_boy', 'user'], required: true },
        targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, default: '' },
        isApproved: { type: Boolean, default: true }, // Auto-approved for delivery reviews
    },
    { timestamps: true }
);

// One review per reviewer per order
deliveryReviewSchema.index({ orderId: 1, reviewerType: 1, reviewerId: 1 }, { unique: true });

const DeliveryReview = mongoose.model('DeliveryReview', deliveryReviewSchema);
export { DeliveryReview };
export default DeliveryReview;
