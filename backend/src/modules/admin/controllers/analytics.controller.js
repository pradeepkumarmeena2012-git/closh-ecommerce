import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import Order from '../../../models/Order.model.js';
import User from '../../../models/User.model.js';
import Vendor from '../../../models/Vendor.model.js';
import Product from '../../../models/Product.model.js';

import ReturnRequest from '../../../models/ReturnRequest.model.js';

// GET /api/admin/analytics/dashboard
export const getDashboardStats = asyncHandler(async (req, res) => {
    const activeOrderFilter = { isDeleted: { $ne: true } };
    const [totalOrders, totalUsers, totalVendors, totalProducts, revenueAgg, pendingOrders, pendingReturns] = await Promise.all([
        Order.countDocuments(activeOrderFilter),
        User.countDocuments({ role: 'customer' }),
        Vendor.countDocuments({ status: 'approved' }),
        Product.countDocuments({ isActive: true }),
        Order.aggregate([{ $match: { ...activeOrderFilter, status: { $ne: 'cancelled' } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
        Order.countDocuments({ ...activeOrderFilter, status: 'pending' }),
        ReturnRequest.countDocuments({ status: 'pending' }),
    ]);

    res.status(200).json(new ApiResponse(200, {
        totalOrders,
        totalUsers,
        totalVendors,
        totalProducts,
        totalRevenue: revenueAgg[0]?.total || 0,
        pendingOrders,
        pendingReturns,
    }, 'Dashboard stats fetched.'));
});

// GET /api/admin/analytics/revenue
export const getRevenueData = asyncHandler(async (req, res) => {
    const { period = 'monthly', startDate, endDate } = req.query;
    const groupFormat = period === 'daily' ? '%Y-%m-%d' : period === 'weekly' ? '%Y-%U' : '%Y-%m';
    const match = { isDeleted: { $ne: true }, status: { $ne: 'cancelled' } };
    if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate) match.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    const pipeline = [
        { $match: match },
        { $group: { _id: { $dateToString: { format: groupFormat, date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
    ];
    if (!startDate && !endDate) {
        pipeline.push({ $sort: { _id: -1 } }, { $limit: 12 });
    }
    pipeline.push({ $sort: { _id: 1 } });

    const revenue = await Order.aggregate(pipeline);

    res.status(200).json(new ApiResponse(200, revenue, 'Revenue data fetched.'));
});

// GET /api/admin/analytics/order-status
export const getOrderStatusBreakdown = asyncHandler(async (req, res) => {
    const breakdown = await Order.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
    ]);

    const result = breakdown.map(item => ({ status: item._id, count: item.count }));
    res.status(200).json(new ApiResponse(200, result, 'Order status breakdown fetched.'));
});

// GET /api/admin/analytics/top-products
export const getTopProducts = asyncHandler(async (req, res) => {
    const topProducts = await Order.aggregate([
        { $match: { isDeleted: { $ne: true }, status: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.productId', totalSold: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
        { $sort: { totalSold: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                name: { $ifNull: ['$product.name', 'Unknown Product'] },
                image: {
                    $ifNull: [{ $arrayElemAt: ['$product.images', 0] }, '$product.image']
                },
                totalSold: 1,
                revenue: 1
            }
        },
    ]);

    res.status(200).json(new ApiResponse(200, topProducts, 'Top products fetched.'));
});

// GET /api/admin/analytics/customer-growth
export const getCustomerGrowth = asyncHandler(async (req, res) => {
    const { period = 'monthly' } = req.query;
    const groupFormat = period === 'daily' ? '%Y-%m-%d' : period === 'weekly' ? '%Y-%U' : '%Y-%m';

    const growth = await User.aggregate([
        { $match: { role: 'customer' } },
        { $group: { _id: { $dateToString: { format: groupFormat, date: '$createdAt' } }, newUsers: { $sum: 1 } } },
        { $sort: { _id: -1 } },
        { $limit: 12 },
        { $sort: { _id: 1 } },
    ]);

    res.status(200).json(new ApiResponse(200, growth, 'Customer growth fetched.'));
});

// GET /api/admin/analytics/recent-orders
export const getRecentOrders = asyncHandler(async (req, res) => {
    const orders = await Order.find({ isDeleted: { $ne: true } })
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

    res.status(200).json(new ApiResponse(200, orders, 'Recent orders fetched.'));
});

// GET /api/admin/analytics/sales
export const getSalesData = asyncHandler(async (req, res) => {
    const { period = 'monthly', startDate, endDate } = req.query;
    const groupFormat = period === 'daily' ? '%Y-%m-%d' : period === 'weekly' ? '%Y-%U' : '%Y-%m';
    const match = { isDeleted: { $ne: true }, status: { $ne: 'cancelled' } };
    if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate) match.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    const pipeline = [
        { $match: match },
        { $group: { _id: { $dateToString: { format: groupFormat, date: '$createdAt' } }, sales: { $sum: '$total' }, orders: { $sum: 1 } } },
    ];
    if (!startDate && !endDate) {
        pipeline.push({ $sort: { _id: -1 } }, { $limit: 12 });
    }
    pipeline.push({ $sort: { _id: 1 } });

    const sales = await Order.aggregate(pipeline);

    res.status(200).json(new ApiResponse(200, sales, 'Sales data fetched.'));
});

// GET /api/admin/analytics/finance-summary
export const getFinancialSummary = asyncHandler(async (req, res) => {
    const { period = 'monthly', startDate, endDate } = req.query;
    const groupFormat = period === 'daily' ? '%Y-%m-%d' : period === 'weekly' ? '%Y-%U' : '%Y-%m';
    const match = { isDeleted: { $ne: true }, status: { $ne: 'cancelled' } };
    if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate) match.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    const pipeline = [
        { $match: match },
        {
            $group: {
                _id: { $dateToString: { format: groupFormat, date: '$createdAt' } },
                revenue: { $sum: '$total' },
                subtotal: { $sum: '$subtotal' },
                tax: { $sum: '$tax' },
                delivery: { $sum: '$shipping' },
                discount: { $sum: '$discount' },
                orders: { $sum: 1 }
            }
        },
    ];
    if (!startDate && !endDate) {
        pipeline.push({ $sort: { _id: -1 } }, { $limit: 12 });
    }
    pipeline.push({ $sort: { _id: 1 } });

    const summary = await Order.aggregate(pipeline);

    res.status(200).json(new ApiResponse(200, summary, 'Financial summary fetched.'));
});

// GET /api/admin/analytics/inventory-stats
export const getInventoryStats = asyncHandler(async (req, res) => {
    const [totalProducts, outOfStock, lowStock] = await Promise.all([
        Product.countDocuments(),
        Product.countDocuments({ stock: 'out_of_stock' }),
        Product.countDocuments({ stock: 'low_stock' })
    ]);

    res.status(200).json(new ApiResponse(200, {
        totalProducts,
        outOfStock,
        lowStock,
        activeProducts: await Product.countDocuments({ isActive: true })
    }, 'Inventory stats fetched.'));
});

// GET /api/admin/analytics/earnings-summary
export const getAdminEarningsSummary = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const match = { isDeleted: { $ne: true }, status: 'delivered' };

    if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate) match.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    // Fetch orders with population for fallback calculations
    const orders = await Order.find(match)
        .select('total shipping vendorItems items')
        .populate('vendorItems.vendorId', 'commissionRate')
        .populate('items.productId', 'vendorPrice')
        .lean();

    let totalRevenue = 0;
    let totalCommission = 0;
    let totalMargin = 0;
    let totalVendorCost = 0;
    let totalDeliveryPayout = 0;
    let orderCount = orders.length;

    orders.forEach(order => {
        totalRevenue += (order.total || 0);
        totalDeliveryPayout += (order.shipping || 0);

        // Calculate Commission with fallback
        const commission = order.vendorItems?.reduce((sum, v) => {
            if (v.commissionAmount && v.commissionAmount > 0) return sum + v.commissionAmount;
            // Fallback: use current vendor rate if snapshot is missing
            const rate = v.commissionRate || v.vendorId?.commissionRate || 10;
            return sum + ((v.subtotal || 0) * rate / 100);
        }, 0) || 0;
        totalCommission += commission;

        // Calculate Margin with robust fallback
        const margin = order.items?.reduce((sum, i) => {
            const vPrice = i.vendorPrice || i.productId?.vendorPrice || 0;
            totalVendorCost += (vPrice * i.quantity);
            return sum + ((i.price - vPrice) * i.quantity);
        }, 0) || 0;
        totalMargin += margin;
    });

    res.status(200).json(new ApiResponse(200, {
        totalRevenue,
        totalCommission,
        totalMargin,
        totalVendorCost,
        totalDeliveryPayout,
        adminNetProfit: (totalCommission + totalMargin) - totalDeliveryPayout,
        orderCount
    }, 'Admin earnings summary fetched.'));
});

// GET /api/admin/analytics/earnings-report
export const getDetailedEarningsReport = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    const numericPage = Number(page) || 1;
    const numericLimit = Number(limit) || 20;
    const skip = (numericPage - 1) * numericLimit;

    const filter = { isDeleted: { $ne: true }, status: 'delivered' };
    if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    const [orders, total] = await Promise.all([
        Order.find(filter)
            .select('orderId total shipping subtotal vendorItems items createdAt')
            .populate('vendorItems.vendorId', 'commissionRate')
            .populate('items.productId', 'vendorPrice')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(numericLimit)
            .lean(),
        Order.countDocuments(filter)
    ]);

    const report = orders.map(order => {
        let orderVendorCost = 0;

        const commission = order.vendorItems?.reduce((sum, v) => {
            if (v.commissionAmount && v.commissionAmount > 0) return sum + v.commissionAmount;
            const rate = v.commissionRate || v.vendorId?.commissionRate || 10;
            return sum + ((v.subtotal || 0) * rate / 100);
        }, 0) || 0;

        const margin = order.items?.reduce((sum, i) => {
            const vPrice = i.vendorPrice || i.productId?.vendorPrice || 0;
            orderVendorCost += (vPrice * i.quantity);
            return sum + ((i.price - vPrice) * i.quantity);
        }, 0) || 0;

        const delivery = order.shipping || 0;

        return {
            orderId: order.orderId,
            date: order.createdAt,
            revenue: order.total,
            vendorCost: orderVendorCost, // Correct: Sum of all item.vendorPrice
            commission,
            margin,
            deliveryPayout: delivery,
            adminNetProfit: (commission + margin) - delivery
        };
    });

    res.status(200).json(new ApiResponse(200, {
        report,
        pagination: {
            total,
            page: numericPage,
            limit: numericLimit,
            pages: Math.ceil(total / numericLimit)
        }
    }, 'Detailed earnings report fetched.'));
});
