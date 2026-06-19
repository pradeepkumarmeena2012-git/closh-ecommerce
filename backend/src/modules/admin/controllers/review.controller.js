import Review from '../../../models/Review.model.js';
import User from '../../../models/User.model.js';
import Product from '../../../models/Product.model.js';
import DeliveryReview from '../../../models/DeliveryReview.model.js';
import DeliveryBoy from '../../../models/DeliveryBoy.model.js';
import { ApiError } from '../../../utils/ApiError.js';
import { ApiResponse } from '../../../utils/ApiResponse.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { syncProductAndVendorReviewStats } from '../../../services/reviewAggregate.service.js';

/**
 * @desc    Get all reviews with filtering and pagination
 * @route   GET /api/admin/reviews
 * @access  Private (Admin)
 */
export const getAllReviews = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search = '', status } = req.query;
    const numericPage = Number(page) || 1;
    const numericLimit = Number(limit) || 10;

    const filter = {};

    if (status === 'approved') filter.isApproved = true;
    if (status === 'pending') filter.isApproved = false;

    if (search) {
        const regex = new RegExp(search, 'i');
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(String(search || ''));

        const [matchedUsers, matchedProducts] = await Promise.all([
            User.find({
                $or: [{ name: regex }, { email: regex }],
            }).select('_id').limit(200).lean(),
            Product.find({
                $or: [{ name: regex }, { description: regex }],
            }).select('_id').limit(200).lean(),
        ]);

        const matchedUserIds = matchedUsers.map((u) => u._id);
        const matchedProductIds = matchedProducts.map((p) => p._id);
        const orFilters = [
            { comment: regex },
            ...(matchedUserIds.length > 0 ? [{ userId: { $in: matchedUserIds } }] : []),
            ...(matchedProductIds.length > 0 ? [{ productId: { $in: matchedProductIds } }] : []),
        ];

        if (isObjectId) {
            orFilters.push({ _id: search }, { productId: search }, { userId: search });
        }

        if (orFilters.length > 0) {
            filter.$or = orFilters;
        }
    }

    const reviews = await Review.find(filter)
        .populate('userId', 'name email')
        .populate('productId', 'name')
        .sort({ createdAt: -1 })
        .skip((numericPage - 1) * numericLimit)
        .limit(numericLimit);

    const total = await Review.countDocuments(filter);

    // Normalize for frontend
    const normalizedReviews = reviews.map(review => ({
        ...review._doc,
        id: review._id,
        customerName: review.userId ? review.userId.name : 'Unknown',
        customerEmail: review.userId ? review.userId.email : 'N/A',
        productName: review.productId ? review.productId.name : 'Unknown Product',
        productId: review.productId?._id ? String(review.productId._id) : '',
        review: review.comment || '',
        status: review.isApproved ? 'approved' : 'pending'
    }));

    res.status(200).json(
        new ApiResponse(200, {
            reviews: normalizedReviews,
            pagination: {
                total,
                page: numericPage,
                limit: numericLimit,
                pages: Math.ceil(total / numericLimit)
            }
        }, 'Reviews fetched successfully')
    );
});

/**
 * @desc    Update review status (approve/reject)
 * @route   PATCH /api/admin/reviews/:id/status
 * @access  Private (Admin)
 */
export const updateReviewStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) {
        throw new ApiError(404, 'Review not found');
    }

    if (status === 'approved') {
        review.isApproved = true;
    } else if (status === 'rejected' || status === 'pending') {
        review.isApproved = false;
    }

    await review.save();
    await syncProductAndVendorReviewStats(review.productId);

    res.status(200).json(
        new ApiResponse(200, review, 'Review status updated successfully')
    );
});

/**
 * @desc    Delete a review
 * @route   DELETE /api/admin/reviews/:id
 * @access  Private (Admin)
 */
export const deleteReview = asyncHandler(async (req, res) => {
    const review = await Review.findByIdAndDelete(req.params.id);

    if (!review) {
        throw new ApiError(404, 'Review not found');
    }
    await syncProductAndVendorReviewStats(review.productId);

    res.status(200).json(
        new ApiResponse(200, {}, 'Review deleted successfully')
    );
});

/**
 * @desc    Get all delivery reviews with filtering and pagination
 * @route   GET /api/admin/delivery-reviews
 * @access  Private (Admin)
 */
export const getDeliveryReviews = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, reviewerType, search } = req.query;
    const numericPage = Number(page) || 1;
    const numericLimit = Number(limit) || 10;

    const filter = {};
    if (reviewerType) filter.reviewerType = reviewerType;

    if (search) {
        const regex = new RegExp(search, 'i');
        filter.comment = regex;
    }

    const reviews = await DeliveryReview.find(filter)
        .populate('reviewerId', 'name email phone')
        .populate('targetId', 'name email phone')
        .populate('orderId', 'orderId status')
        .sort({ createdAt: -1 })
        .skip((numericPage - 1) * numericLimit)
        .limit(numericLimit);

    const total = await DeliveryReview.countDocuments(filter);

    const normalizedReviews = reviews.map(review => ({
        ...review._doc,
        id: review._id,
        reviewerName: review.reviewerId?.name || 'Unknown',
        targetName: review.targetId?.name || 'Unknown',
        orderDisplayId: review.orderId?.orderId || String(review.orderId?._id || ''),
        orderStatus: review.orderId?.status || 'unknown',
    }));

    res.status(200).json(
        new ApiResponse(200, {
            reviews: normalizedReviews,
            pagination: {
                total,
                page: numericPage,
                limit: numericLimit,
                pages: Math.ceil(total / numericLimit)
            }
        }, 'Delivery reviews fetched successfully')
    );
});

/**
 * @desc    Get review analytics — aggregate stats
 * @route   GET /api/admin/reviews/analytics
 * @access  Private (Admin)
 */
export const getReviewAnalytics = asyncHandler(async (req, res) => {
    const [productStats] = await Review.aggregate([
        { $group: { _id: null, total: { $sum: 1 }, avgRating: { $avg: '$rating' }, approved: { $sum: { $cond: ['$isApproved', 1, 0] } }, pending: { $sum: { $cond: ['$isApproved', 0, 1] } } } }
    ]);

    const [deliveryStats] = await DeliveryReview.aggregate([
        { $match: { reviewerType: 'user' } },
        { $group: { _id: null, total: { $sum: 1 }, avgRating: { $avg: '$rating' } } }
    ]);

    const [customerStats] = await DeliveryReview.aggregate([
        { $match: { reviewerType: 'delivery_boy' } },
        { $group: { _id: null, total: { $sum: 1 }, avgRating: { $avg: '$rating' } } }
    ]);

    // Rating distribution for product reviews
    const ratingDistribution = await Review.aggregate([
        { $match: { isApproved: true } },
        { $group: { _id: '$rating', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
    ]);

    res.status(200).json(
        new ApiResponse(200, {
            productReviews: {
                total: productStats?.total || 0,
                avgRating: Number((productStats?.avgRating || 0).toFixed(2)),
                approved: productStats?.approved || 0,
                pending: productStats?.pending || 0,
            },
            deliveryReviews: {
                total: deliveryStats?.total || 0,
                avgRating: Number((deliveryStats?.avgRating || 0).toFixed(2)),
            },
            customerRatings: {
                total: customerStats?.total || 0,
                avgRating: Number((customerStats?.avgRating || 0).toFixed(2)),
            },
            ratingDistribution: ratingDistribution.map(r => ({ rating: r._id, count: r.count })),
        }, 'Review analytics fetched successfully')
    );
});

