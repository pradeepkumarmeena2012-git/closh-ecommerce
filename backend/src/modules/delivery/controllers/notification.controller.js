import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import Notification from '../../../models/Notification.model.js';
import DeliveryBoy from '../../../models/DeliveryBoy.model.js';

// GET /api/delivery/notifications
export const getDeliveryNotifications = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, type, isRead } = req.query;
    const numericPage = Math.max(1, Number(page) || 1);
    const numericLimit = Math.min(50, Math.max(1, Number(limit) || 20));
    const skip = (numericPage - 1) * numericLimit;

    const filter = {
        recipientId: req.user.id,
        recipientType: 'delivery',
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
            recipientType: 'delivery',
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
            'Delivery notifications fetched.'
        )
    );
});

// PUT /api/delivery/notifications/:id/read
export const markDeliveryNotificationAsRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findOneAndUpdate(
        {
            _id: req.params.id,
            recipientId: req.user.id,
            recipientType: 'delivery',
        },
        { isRead: true },
        { new: true }
    );

    if (!notification) {
        throw new ApiError(404, 'Notification not found.');
    }

    res.status(200).json(
        new ApiResponse(200, notification, 'Delivery notification marked as read.')
    );
});

// PUT /api/delivery/notifications/read-all
export const markAllDeliveryNotificationsAsRead = asyncHandler(async (req, res) => {
    await Notification.updateMany(
        {
            recipientId: req.user.id,
            recipientType: 'delivery',
            isRead: false,
        },
        { isRead: true }
    );

    res.status(200).json(
        new ApiResponse(200, null, 'All delivery notifications marked as read.')
    );
});

// DELETE /api/delivery/notifications/:id
export const deleteDeliveryNotification = asyncHandler(async (req, res) => {
    const deleted = await Notification.findOneAndDelete({
        _id: req.params.id,
        recipientId: req.user.id,
        recipientType: 'delivery',
    });

    if (!deleted) {
        throw new ApiError(404, 'Notification not found.');
    }

    res.status(200).json(new ApiResponse(200, null, 'Delivery notification deleted.'));
});
// POST /api/delivery/notifications/fcm-token
export const registerDeliveryFcmToken = asyncHandler(async (req, res) => {
    const { token, platform = 'web' } = req.body;
    if (!token) throw new ApiError(400, 'FCM token is required.');

    const deliveryBoy = await DeliveryBoy.findById(req.user.id);
    if (!deliveryBoy) throw new ApiError(404, 'Delivery Boy not found');

    // Remove duplicates or update existing
    const existingTokenIndex = deliveryBoy.fcmTokens.findIndex(t => t.token === token);
    
    if (existingTokenIndex > -1) {
        deliveryBoy.fcmTokens[existingTokenIndex].platform = platform;
        deliveryBoy.fcmTokens[existingTokenIndex].lastUsed = new Date();
    } else {
        deliveryBoy.fcmTokens.push({ token, platform, lastUsed: new Date() });
        // Keep only last 10 devices
        if (deliveryBoy.fcmTokens.length > 10) {
            deliveryBoy.fcmTokens.sort((a, b) => b.lastUsed - a.lastUsed);
            deliveryBoy.fcmTokens = deliveryBoy.fcmTokens.slice(0, 10);
        }
    }
    
    await deliveryBoy.save();
    res.status(200).json(new ApiResponse(200, null, 'FCM token registered.'));
});

// DELETE /api/delivery/notifications/fcm-token
export const removeDeliveryFcmToken = asyncHandler(async (req, res) => {
    const { token } = req.body;
    if (!token) throw new ApiError(400, 'FCM token is required.');

    await DeliveryBoy.findByIdAndUpdate(req.user.id, {
        $pull: { fcmTokens: { token } }
    });

    res.status(200).json(new ApiResponse(200, null, 'FCM token removed.'));
});
