import Notification from '../models/Notification.model.js';
import User from '../models/User.model.js';
import Vendor from '../models/Vendor.model.js';
import Admin from '../models/Admin.model.js';
import DeliveryBoy from '../models/DeliveryBoy.model.js';
import admin from '../config/firebase.js';
import { emitEvent } from './socket.service.js';

/**
 * Create a notification for a user/vendor/delivery/admin
 * @param {Object} options - { recipientId, recipientType, title, message, type, data }
 */
export const createNotification = async ({ recipientId, recipientType, title, message, type = 'system', data = {} }) => {
    // 1. Save to Database
    const notification = await Notification.create({ recipientId, recipientType, title, message, type, data });

    // 2. Real-time socket updates
    const room = recipientType === 'admin' ? 'admin' : `${recipientType}_${recipientId}`;
    emitEvent(room, 'new_notification', notification);

    // 3. Send Push Notification via FCM
    try {
        let recipient;
        if (recipientType === 'user') recipient = await User.findById(recipientId);
        else if (recipientType === 'vendor') recipient = await Vendor.findById(recipientId);
        else if (recipientType === 'admin') recipient = await Admin.findById(recipientId);
        else if (recipientType === 'delivery') recipient = await DeliveryBoy.findById(recipientId);

        if (recipient && recipient.fcmTokens && recipient.fcmTokens.length > 0) {
            // Determine sound based on action or data (for delivery boy sound logic)
            const sound = data.sound || 'default';
            
            const messagePayload = {
                notification: {
                    title: title,
                    body: message,
                },
                data: {
                    ...data,
                    click_action: 'FLUTTER_NOTIFICATION_CLICK',
                },
                tokens: [...new Set(recipient.fcmTokens)], // Dedupe tokens to avoid multiple pushes for the same device
                android: {
                    notification: {
                        sound: sound,
                    },
                },
                apns: {
                    payload: {
                        aps: {
                            sound: sound,
                        },
                    },
                },
            };

            const response = await admin.messaging().sendEachForMulticast(messagePayload);
            console.log(`✅ FCM: Sent ${response.successCount} messages; Failed ${response.failureCount}`);
            
            // Optional: Cleanup invalid tokens
            if (response.failureCount > 0) {
                const invalidTokens = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const errorCode = resp.error.code;
                        if (errorCode === 'messaging/registration-token-not-registered' || 
                            errorCode === 'messaging/invalid-registration-token') {
                            invalidTokens.push(recipient.fcmTokens[idx]);
                        }
                    }
                });
                
                if (invalidTokens.length > 0) {
                    recipient.fcmTokens = recipient.fcmTokens.filter(t => !invalidTokens.includes(t));
                    await recipient.save();
                    console.log(`🧹 Cleaned up ${invalidTokens.length} outdated FCM tokens`);
                }
            }
        }
    } catch (error) {
        console.error('❌ Error sending FCM notification:', error.message);
    }

    return notification;
};

/**
 * Get unread notifications for a recipient
 */
export const getUnreadNotifications = async (recipientId, recipientType) => {
    return Notification.find({ recipientId, recipientType, isRead: false }).sort({ createdAt: -1 }).limit(20);
};

/**
 * Mark all notifications as read for a recipient
 */
export const markAllAsRead = async (recipientId, recipientType) => {
    return Notification.updateMany({ recipientId, recipientType, isRead: false }, { isRead: true });
};

/**
 * Broadcast notifications to multiple roles (users, vendors, delivery)
 * @param {Object} options - { roles, title, message, type, data }
 */
export const broadcastNotifications = async ({ roles = [], title, message, type = 'broadcast', data = {} }) => {
    if (!roles.length) return { success: false, message: 'No roles specified' };

    const roleModels = {
        'customers': User,
        'user': User,
        'vendor': Vendor,
        'delivery': DeliveryBoy,
        'delivery-boy': DeliveryBoy,
        'admin': Admin
    };

    let allTokens = [];
    let recipientPairs = [];

    // 1. Gather all recipients and their tokens across requested roles
    for (const role of roles) {
        const Model = roleModels[role.toLowerCase()];
        if (!Model) continue;

        const recipients = await Model.find({ isActive: true }).select('_id fcmTokens role');
        
        for (const recipient of recipients) {
            if (recipient.fcmTokens && recipient.fcmTokens.length > 0) {
                allTokens.push(...recipient.fcmTokens);
            }
            recipientPairs.push({
                id: recipient._id,
                type: role === 'customers' ? 'user' : (role === 'delivery-boy' ? 'delivery' : role)
            });
        }
    }

    // 2. Create individual DB notifications for each recipient
    if (recipientPairs.length > 0) {
        // Chunk database inserts if huge (e.g., 500 at a time)
        const dbChunks = [];
        for (let i = 0; i < recipientPairs.length; i += 500) {
            const chunk = recipientPairs.slice(i, i + 500).map(pair => ({
                recipientId: pair.id,
                recipientType: pair.type,
                title,
                message,
                type,
                data
            }));
            dbChunks.push(Notification.insertMany(chunk));
        }
        await Promise.all(dbChunks);
        console.log(`📦 Created ${recipientPairs.length} DB notification records`);
    }

    // 3. Send Push Notifications in batches of 500 (FCM Multi-cast limit)
    if (allTokens.length > 0) {
        const uniqueTokens = [...new Set(allTokens)]; // dedupe
        console.log(`🚀 Broadcasting to ${uniqueTokens.length} unique FCM tokens...`);

        for (let i = 0; i < uniqueTokens.length; i += 500) {
            const batch = uniqueTokens.slice(i, i + 500);
            const messagePayload = {
                notification: { title, body: message },
                data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
                tokens: batch,
                android: { notification: { sound: 'default' } },
                apns: { payload: { aps: { sound: 'default' } } },
            };

            try {
                const response = await admin.messaging().sendEachForMulticast(messagePayload);
                console.log(`✅ Batch ${Math.floor(i/500) + 1} sent: ${response.successCount} success, ${response.failureCount} failed.`);
            } catch (err) {
                console.error(`❌ Batch send failed:`, err.message);
            }
        }
    }

    return { 
        success: true, 
        recipientsCount: recipientPairs.length, 
        tokensCount: allTokens.length 
    };
};
