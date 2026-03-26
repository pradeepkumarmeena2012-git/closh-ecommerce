import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import Notification from '../../../models/Notification.model.js';
import Vendor from '../../../models/Vendor.model.js';

// GET /api/vendor/notifications
export const getVendorNotifications = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, type, isRead } = req.query;
    const numericPage = Math.max(1, Number(page) || 1);
    const numericLimit = Math.max(1, Number(limit) || 20);
    const skip = (numericPage - 1) * numericLimit;

    const filter = {
        recipientId: req.user.id,
        recipientType: 'vendor',
    };

    if (type && type !== 'all') {
        filter.type = type;
    }
    if (isRead === 'true') {
        filter.isRead = true;
    } else if (isRead === 'false') {
        filter.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
        Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(numericLimit),
        Notification.countDocuments(filter),
        Notification.countDocuments({
            recipientId: req.user.id,
            recipientType: 'vendor',
            isRead: false,
        }),
    ]);

    res.status(200).json(
        new ApiResponse(
            200,
            {
                notifications,
                total,
                unreadCount,
                page: numericPage,
                pages: Math.ceil(total / numericLimit),
            },
            'Vendor notifications fetched.'
        )
    );
});

// PUT /api/vendor/notifications/:id/read
export const markVendorNotificationAsRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findOneAndUpdate(
        {
            _id: req.params.id,
            recipientId: req.user.id,
            recipientType: 'vendor',
        },
        { isRead: true },
        { new: true }
    );

    if (!notification) {
        throw new ApiError(404, 'Notification not found.');
    }

    res.status(200).json(
        new ApiResponse(200, notification, 'Vendor notification marked as read.')
    );
});

// PUT /api/vendor/notifications/read-all
export const markAllVendorNotificationsAsRead = asyncHandler(async (req, res) => {
    await Notification.updateMany(
        {
            recipientId: req.user.id,
            recipientType: 'vendor',
            isRead: false,
        },
        { isRead: true }
    );

    res.status(200).json(
        new ApiResponse(200, null, 'All vendor notifications marked as read.')
    );
});

// DELETE /api/vendor/notifications/:id
export const deleteVendorNotification = asyncHandler(async (req, res) => {
    const deleted = await Notification.findOneAndDelete({
        _id: req.params.id,
        recipientId: req.user.id,
        recipientType: 'vendor',
    });

    if (!deleted) {
        throw new ApiError(404, 'Notification not found.');
    }

    res.status(200).json(new ApiResponse(200, null, 'Vendor notification deleted.'));
});

// POST /api/vendor/notifications/fcm-token
export const registerVendorFcmToken = asyncHandler(async (req, res) => {
    const { token, platform = 'web' } = req.body;
    if (!token) throw new ApiError(400, 'FCM token is required.');

    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) throw new ApiError(404, 'Vendor not found');

    // Remove duplicates or update existing
    const existingTokenIndex = vendor.fcmTokens.findIndex(t => t.token === token);
    
    if (existingTokenIndex > -1) {
        vendor.fcmTokens[existingTokenIndex].platform = platform;
        vendor.fcmTokens[existingTokenIndex].lastUsed = new Date();
    } else {
        vendor.fcmTokens.push({ token, platform, lastUsed: new Date() });
        // Keep only last 10 devices
        if (vendor.fcmTokens.length > 10) {
            vendor.fcmTokens.sort((a, b) => b.lastUsed - a.lastUsed);
            vendor.fcmTokens = vendor.fcmTokens.slice(0, 10);
        }
    }
    
    await vendor.save();
    res.status(200).json(new ApiResponse(200, null, 'FCM token registered.'));
});

// DELETE /api/vendor/notifications/fcm-token
export const removeVendorFcmToken = asyncHandler(async (req, res) => {
    const { token } = req.body;
    if (!token) throw new ApiError(400, 'FCM token is required.');

    await Vendor.findByIdAndUpdate(req.user.id, {
        $pull: { fcmTokens: { token } }
    });

    res.status(200).json(new ApiResponse(200, null, 'FCM token removed.'));
});
