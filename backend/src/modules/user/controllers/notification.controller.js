import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import Notification from '../../../models/Notification.model.js';
import User from '../../../models/User.model.js';

// GET /api/user/notifications
export const getUserNotifications = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, type, isRead } = req.query;
    const numericPage = Math.max(1, Number(page) || 1);
    const numericLimit = Math.max(1, Number(limit) || 20);
    const skip = (numericPage - 1) * numericLimit;

    const filter = {
        recipientId: req.user.id,
        recipientType: 'user',
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
            recipientType: 'user',
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
            'User notifications fetched.'
        )
    );
});

// PUT /api/user/notifications/:id/read
export const markUserNotificationAsRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findOneAndUpdate(
        {
            _id: req.params.id,
            recipientId: req.user.id,
            recipientType: 'user',
        },
        { isRead: true },
        { new: true }
    );

    if (!notification) {
        throw new ApiError(404, 'Notification not found.');
    }

    res.status(200).json(
        new ApiResponse(200, notification, 'User notification marked as read.')
    );
});

// PUT /api/user/notifications/read-all
export const markAllUserNotificationsAsRead = asyncHandler(async (req, res) => {
    await Notification.updateMany(
        {
            recipientId: req.user.id,
            recipientType: 'user',
            isRead: false,
        },
        { isRead: true }
    );

    res.status(200).json(
        new ApiResponse(200, null, 'All user notifications marked as read.')
    );
});

// DELETE /api/user/notifications/:id
export const deleteUserNotification = asyncHandler(async (req, res) => {
    const deleted = await Notification.findOneAndDelete({
        _id: req.params.id,
        recipientId: req.user.id,
        recipientType: 'user',
    });

    if (!deleted) {
        throw new ApiError(404, 'Notification not found.');
    }

    res.status(200).json(new ApiResponse(200, null, 'User notification deleted.'));
});

// POST /api/user/notifications/fcm-token
export const registerUserFcmToken = asyncHandler(async (req, res) => {
    const { token, platform = 'web' } = req.body;
    if (!token) throw new ApiError(400, 'FCM token is required.');

    const user = await User.findById(req.user.id);
    if (!user) throw new ApiError(404, 'User not found');

    // Remove duplicates or update existing
    const existingTokenIndex = user.fcmTokens.findIndex(t => t.token === token);
    
    if (existingTokenIndex > -1) {
        user.fcmTokens[existingTokenIndex].platform = platform;
        user.fcmTokens[existingTokenIndex].lastUsed = new Date();
    } else {
        user.fcmTokens.push({ token, platform, lastUsed: new Date() });
        // Keep only last 10 devices
        if (user.fcmTokens.length > 10) {
            user.fcmTokens.sort((a, b) => b.lastUsed - a.lastUsed);
            user.fcmTokens = user.fcmTokens.slice(0, 10);
        }
    }
    
    await user.save();
    res.status(200).json(new ApiResponse(200, null, 'FCM token registered.'));
});

// DELETE /api/user/notifications/fcm-token
export const removeUserFcmToken = asyncHandler(async (req, res) => {
    const { token } = req.body;
    if (!token) throw new ApiError(400, 'FCM token is required.');

    await User.findByIdAndUpdate(req.user.id, {
        $pull: { fcmTokens: { token } }
    });

    res.status(200).json(new ApiResponse(200, null, 'FCM token removed.'));
});
