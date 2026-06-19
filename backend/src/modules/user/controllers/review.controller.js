import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import Review from '../../../models/Review.model.js';
import Product from '../../../models/Product.model.js';
import Order from '../../../models/Order.model.js';
import DeliveryReview from '../../../models/DeliveryReview.model.js';
import { syncDeliveryBoyRating } from '../../../services/reviewAggregate.service.js';

// GET /api/user/reviews/product/:productId
export const getProductReviews = asyncHandler(async (req, res) => {
    const { sort = 'newest', page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const sortMap = {
        newest: { createdAt: -1 },
        oldest: { createdAt: 1 },
        'highest-rating': { rating: -1 },
        'lowest-rating': { rating: 1 },
        'most-helpful': { helpfulCount: -1 },
    };

    const reviews = await Review.find({ productId: req.params.productId, isApproved: true })
        .populate('userId', 'name avatar')
        .sort(sortMap[sort] || { createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

    const total = await Review.countDocuments({ productId: req.params.productId, isApproved: true });
    res.status(200).json(new ApiResponse(200, { reviews, total, page: Number(page), pages: Math.ceil(total / limit) }, 'Reviews fetched.'));
});

// POST /api/user/reviews
export const addReview = asyncHandler(async (req, res) => {
    const { productId, orderId, rating, comment, images } = req.body;

    // Verify purchase
    const order = await Order.findOne({ _id: orderId, userId: req.user.id, 'items.productId': productId, status: 'delivered' });
    if (!order) throw new ApiError(403, 'You can only review products you have purchased and received.');

    const existing = await Review.findOne({ productId, userId: req.user.id });
    if (existing) throw new ApiError(409, 'You have already reviewed this product.');

    const review = await Review.create({ productId, userId: req.user.id, orderId, rating, comment, images, isVerifiedPurchase: true });
    res.status(201).json(new ApiResponse(201, review, 'Review submitted and pending approval.'));
});

// POST /api/user/reviews/:id/helpful
export const voteHelpful = asyncHandler(async (req, res) => {
    const review = await Review.findByIdAndUpdate(req.params.id, { $inc: { helpfulCount: 1 } }, { new: true });
    if (!review) throw new ApiError(404, 'Review not found.');
    res.status(200).json(new ApiResponse(200, review, 'Vote recorded.'));
});

// POST /api/user/reviews/delivery — User rates delivery boy
export const submitDeliveryReview = asyncHandler(async (req, res) => {
    const { orderId, deliveryBoyId, rating, comment } = req.body;

    if (!orderId || !deliveryBoyId || !rating) {
        throw new ApiError(400, 'orderId, deliveryBoyId, and rating are required.');
    }

    // Verify this order belongs to user and is delivered
    const order = await Order.findOne({
        _id: orderId,
        userId: req.user.id,
        status: { $in: ['delivered', 'try_buy_completed'] },
    });
    if (!order) throw new ApiError(403, 'You can only rate deliveries for your delivered orders.');

    // Verify delivery boy was assigned to this order
    if (String(order.deliveryBoyId) !== String(deliveryBoyId)) {
        throw new ApiError(400, 'This delivery boy was not assigned to your order.');
    }

    // Check for existing review
    const existing = await DeliveryReview.findOne({ orderId, reviewerType: 'user', reviewerId: req.user.id });
    if (existing) throw new ApiError(409, 'You have already rated this delivery.');

    const review = await DeliveryReview.create({
        orderId,
        reviewerType: 'user',
        reviewerId: req.user.id,
        targetType: 'delivery_boy',
        targetId: deliveryBoyId,
        rating: Math.min(5, Math.max(1, Number(rating))),
        comment: comment || '',
    });

    // Sync delivery boy rating
    await syncDeliveryBoyRating(deliveryBoyId);

    res.status(201).json(new ApiResponse(201, review, 'Delivery rating submitted.'));
});

// GET /api/user/reviews/order/:orderId — Check what user has reviewed for this order
export const getMyReviewsForOrder = asyncHandler(async (req, res) => {
    const { orderId } = req.params;

    // Verify order belongs to user
    const order = await Order.findOne({ _id: orderId, userId: req.user.id }).select('_id items');
    if (!order) throw new ApiError(404, 'Order not found.');

    // Get product reviews for this order
    const productReviews = await Review.find({ orderId, userId: req.user.id });

    // Get delivery review for this order
    const deliveryReview = await DeliveryReview.findOne({ orderId, reviewerType: 'user', reviewerId: req.user.id });

    res.status(200).json(new ApiResponse(200, {
        productReviews,
        deliveryReview,
    }, 'Order reviews fetched.'));
});

