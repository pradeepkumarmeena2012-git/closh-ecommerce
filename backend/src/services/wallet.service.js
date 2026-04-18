import { Vendor } from '../models/Vendor.model.js';
import DeliveryBoy from '../models/DeliveryBoy.model.js';
import mongoose from 'mongoose';

/**
 * WalletService handles all financial balance updates for Vendors and Riders
 */
export const WalletService = {
    /**
     * Credit earnings to vendor and delivery boy after a successful delivery
     * @param {Object} order - Order document
     */
    async processOrderCompletion(order) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // 1. Credit Delivery Boy
            if (order.deliveryBoyId && order.deliveryEarnings > 0) {
                await DeliveryBoy.findByIdAndUpdate(
                    order.deliveryBoyId,
                    {
                        $inc: {
                            totalEarnings: order.deliveryEarnings,
                            availableBalance: order.deliveryEarnings,
                            // Track cash in hand if it was a COD order
                            cashCollected: (order.paymentMethod === 'cash' || order.paymentMethod === 'cod') ? order.total : 0
                        }
                    },
                    { session }
                );
                console.log(`[Wallet] Credited ₹${order.deliveryEarnings} to Rider ${order.deliveryBoyId} (Cash In Hand: ₹${(order.paymentMethod === 'cash' || order.paymentMethod === 'cod') ? order.total : 0})`);
            }

            // 2. Credit Each Vendor involved in the order
            const vendorItems = order.vendorItems || [];
            for (const group of vendorItems) {
                if (group.vendorId && group.vendorEarnings > 0) {
                    await Vendor.findByIdAndUpdate(
                        group.vendorId,
                        {
                            $inc: {
                                totalEarnings: group.vendorEarnings,
                                availableBalance: group.vendorEarnings,
                                totalSales: group.subtotal // track lifetime sales
                            }
                        },
                        { session }
                    );
                    console.log(`[Wallet] Credited ₹${group.vendorEarnings} to Vendor ${group.vendorId}`);
                }
            }

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            console.error('[Wallet Error] Failed to process order earnings:', error.message);
            throw error;
        } finally {
            session.endSession();
        }
    }
};
