import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import Notification from '../../../models/Notification.model.js';
import Admin from '../../../models/Admin.model.js';
import User from '../../../models/User.model.js';
import { createNotification, broadcastNotifications } from '../../../services/notification.service.js';

// GET /api/admin/notifications
export const getAdminNotifications = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, type } = req.query;
    const skip = (page - 1) * limit;

    // Filter for admin notifications
    // recipientType is 'admin' OR recipientId matches the admin's ID (if targeting specific admin)
    // For now, we'll assume a general 'admin' type or checks against the logged-in admin's ID if we had multiple admins.
    // Given the model, we can look for recipientType: 'admin' OR specific admin ID.

    const filter = {
        $or: [
            { recipientType: 'admin' },
            { recipientId: req.user._id, recipientType: 'admin' }
        ]
    };

    if (type) {
        filter.type = type;
    }

    const notifications = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

    const total = await Notification.countDocuments(filter);

    // Count unread
    const unreadCount = await Notification.countDocuments({ ...filter, isRead: false });

    res.status(200).json(new ApiResponse(200, {
        notifications,
        total,
        unreadCount,
        page: Number(page),
        pages: Math.ceil(total / limit)
    }, 'Notifications fetched.'));
});

// PUT /api/admin/notifications/:id/read
export const markAsRead = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const notification = await Notification.findByIdAndUpdate(
        id,
        { isRead: true },
        { new: true }
    );

    if (!notification) {
        throw new ApiError(404, 'Notification not found.');
    }

    res.status(200).json(new ApiResponse(200, notification, 'Notification marked as read.'));
});

// PUT /api/admin/notifications/read-all
export const markAllAsRead = asyncHandler(async (req, res) => {
    // Mark all 'admin' type notifications as read, or tailored to this user
    const filter = {
        $or: [
            { recipientType: 'admin' },
            { recipientId: req.user._id, recipientType: 'admin' }
        ],
        isRead: false
    };

    await Notification.updateMany(filter, { isRead: true });

    res.status(200).json(new ApiResponse(200, null, 'All notifications marked as read.'));
});
// POST /api/admin/notifications/fcm-token
export const registerAdminFcmToken = asyncHandler(async (req, res) => {
    const { token, platform = 'web' } = req.body;
    if (!token) throw new ApiError(400, 'FCM token is required.');

    const adminUser = await Admin.findById(req.user.id);
    if (!adminUser) throw new ApiError(404, 'Admin not found');

    // Remove duplicates or update existing
    const existingTokenIndex = adminUser.fcmTokens.findIndex(t => t.token === token);
    
    if (existingTokenIndex > -1) {
        adminUser.fcmTokens[existingTokenIndex].platform = platform;
        adminUser.fcmTokens[existingTokenIndex].lastUsed = new Date();
    } else {
        adminUser.fcmTokens.push({ token, platform, lastUsed: new Date() });
        // Keep only last 10 devices
        if (adminUser.fcmTokens.length > 10) {
            adminUser.fcmTokens.sort((a, b) => b.lastUsed - a.lastUsed);
            adminUser.fcmTokens = adminUser.fcmTokens.slice(0, 10);
        }
    }
    
    await adminUser.save();
    res.status(200).json(new ApiResponse(200, null, 'FCM token registered.'));
});

// DELETE /api/admin/notifications/fcm-token
export const removeAdminFcmToken = asyncHandler(async (req, res) => {
    const { token } = req.body;
    if (!token) throw new ApiError(400, 'FCM token is required.');

    await Admin.findByIdAndUpdate(req.user.id, {
        $pull: { fcmTokens: { token } }
    });

    res.status(200).json(new ApiResponse(200, null, 'FCM token removed.'));
});

// POST /api/admin/notifications/push-to-user
export const pushToUser = asyncHandler(async (req, res) => {
    console.log('PushToUser Payload:', req.body);
    const { userId, title, message } = req.body;
    if (!userId || !title || !message) {
        console.warn('❌ PushToUser Validation failed:', { userId, title, message });
        throw new ApiError(400, 'User ID, Title, and Message are required.');
    }

    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    const notification = await createNotification({
        recipientId: userId,
        recipientType: 'user',
        title,
        message,
        type: 'broadcast',
        data: { sender: 'Admin' }
    });

    res.status(200).json(new ApiResponse(200, notification, 'Notification pushed to user.'));
});

// POST /api/admin/notifications/broadcast
export const globalBroadcast = asyncHandler(async (req, res) => {
    const { target, title, message } = req.body;
    if (!target || !title || !message) {
        throw new ApiError(400, 'Target, Title, and Message are required.');
    }

    let roles = [];
    if (target === 'all') roles = ['user', 'vendor', 'delivery'];
    else if (target === 'customers') roles = ['user'];
    else if (target === 'vendor') roles = ['vendor'];
    else if (target === 'delivery-boy') roles = ['delivery'];
    else roles = [target]; // specific role if passed

    const result = await broadcastNotifications({
        roles,
        title,
        message,
        type: 'broadcast',
        data: { sender: 'Admin Dashboard' }
    });

    res.status(200).json(new ApiResponse(200, result, 'Broadcast initiated successfully.'));
});
