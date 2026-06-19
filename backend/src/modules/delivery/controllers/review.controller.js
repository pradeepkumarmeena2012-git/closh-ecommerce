import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import Order from '../../../models/Order.model.js';
import DeliveryReview from '../../../models/DeliveryReview.model.js';

// POST /api/delivery/reviews/customer — Delivery boy rates customer
export const submitCustomerRating = asyncHandler(async (req, res) => {
    const { orderId, userId, rating, comment } = req.body;

    if (!orderId || !userId || !rating) {
        throw new ApiError(400, 'orderId, userId, and rating are required.');
    }

    // Verify order was assigned to this delivery boy and is delivered
    const order = await Order.findOne({
        _id: orderId,
        deliveryBoyId: req.user.id,
        status: { $in: ['delivered', 'try_buy_completed'] },
    });
    if (!order) throw new ApiError(403, 'You can only rate customers for your delivered orders.');

    // Verify userId matches order's userId
    if (String(order.userId) !== String(userId)) {
        throw new ApiError(400, 'This customer was not associated with this order.');
    }

    // Check for existing review
    const existing = await DeliveryReview.findOne({ orderId, reviewerType: 'delivery_boy', reviewerId: req.user.id });
    if (existing) throw new ApiError(409, 'You have already rated this customer.');

    const review = await DeliveryReview.create({
        orderId,
        reviewerType: 'delivery_boy',
        reviewerId: req.user.id,
        targetType: 'user',
        targetId: userId,
        rating: Math.min(5, Math.max(1, Number(rating))),
        comment: comment || '',
    });

    res.status(201).json(new ApiResponse(201, review, 'Customer rating submitted.'));
});

// GET /api/delivery/reviews/order/:orderId — Check if delivery boy already reviewed
export const getMyReviewForOrder = asyncHandler(async (req, res) => {
    const { orderId } = req.params;

    const review = await DeliveryReview.findOne({
        orderId,
        reviewerType: 'delivery_boy',
        reviewerId: req.user.id,
    });

    res.status(200).json(new ApiResponse(200, { review }, 'Review fetched.'));
});
