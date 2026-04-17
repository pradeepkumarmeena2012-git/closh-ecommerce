import Wishlist from '../models/Wishlist.model.js';
import Product from '../models/Product.model.js';
import { createNotification } from './notification.service.js';

/**
 * Notifies all customers who have products from a specific vendor in their wishlist
 * @param {string} vendorId - The ID of the vendor who just went online
 * @param {string} storeName - The name of the store (for personalizing the message)
 */
export const notifyWishlistUsersWhenVendorOnline = async (vendorId, storeName) => {
    try {
        // 1. Find all products belonging to this vendor
        const vendorProducts = await Product.find({ vendorId }).select('_id name').lean();
        if (!vendorProducts.length) return;

        const productIds = vendorProducts.map(p => p._id);

        // 2. Find all wishlists that contain any of these products
        // We want unique user IDs
        const wishlists = await Wishlist.find({
            "items.productId": { $in: productIds }
        }).select('userId').lean();

        if (!wishlists.length) return;

        // Extract unique user IDs
        const uniqueUserIds = [...new Set(wishlists.map(w => String(w.userId)))];

        console.log(`🔔 Notifying ${uniqueUserIds.length} users about ${storeName} being online...`);

        // 3. Send notifications to each user
        // Note: For very large numbers of users, this should be handled by a queue (BullJob etc.)
        // But for this project's scale, we can do it with Promise.all in small batches if needed.
        // For now, we'll do it simple.
        
        const title = `Store is Live! 🛍️`;
        const message = `${storeName} is live now! Our products are back online, purchase your favorite items from your wishlist now.`;

        for (const userId of uniqueUserIds) {
            try {
                await createNotification({
                    recipientId: userId,
                    recipientType: 'user',
                    title,
                    message,
                    type: 'store_online',
                    data: { vendorId: String(vendorId), storeName }
                });
            } catch (err) {
                console.error(`Failed to notify user ${userId}:`, err.message);
            }
        }

    } catch (error) {
        console.error('❌ Error in notifyWishlistUsersWhenVendorOnline:', error.message);
    }
};
