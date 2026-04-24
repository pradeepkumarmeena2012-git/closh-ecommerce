import { Vendor } from '../models/Vendor.model.js';
import DeliveryBoy from '../models/DeliveryBoy.model.js';
import Commission from '../models/Commission.model.js';
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
            // 0. Idempotency Check: Don't process if already done
            const existing = await Commission.findOne({ orderId: order._id }).session(session);
            if (existing) {
                await session.abortTransaction();
                return true;
            }

            const flow = order.deliveryFlow || {};
            const finalAmount = flow.finalAmount || order.total;
            const ratio = order.total > 0 ? (finalAmount / order.total) : 1;
            const isCod = order.paymentMethod === 'cash' || order.paymentMethod === 'cod';

            // 1. Credit Delivery Boy
            if (order.deliveryBoyId) {
                const riderEarnings = Number(order.deliveryEarnings || 0);
                // For COD, the rider collects the FINAL amount, not the original total
                const cashToTrack = isCod ? finalAmount : 0;

                await DeliveryBoy.findByIdAndUpdate(
                    order.deliveryBoyId,
                    {
                        $inc: {
                            totalDeliveries: 1,
                            totalEarnings: riderEarnings,
                            availableBalance: riderEarnings,
                            cashCollected: cashToTrack,
                            cashInHand: cashToTrack
                        }
                    },
                    { session }
                );
                console.log(`[Wallet] Credited ₹${riderEarnings} to Rider ${order.deliveryBoyId} (Cash In Hand: ₹${cashToTrack})`);
            }

            // 2. Credit Each Vendor involved in the order
            const vendorItems = order.vendorItems || [];
            for (const group of vendorItems) {
                if (group.vendorId) {
                    const originalEarnings = Number(group.vendorEarnings || 0);
                    // Adjust vendor earnings by the same ratio (Try & Buy / Rejections)
                    const adjustedEarnings = Math.round(originalEarnings * ratio);

                    if (adjustedEarnings > 0) {
                        // Update Vendor balance
                        await Vendor.findByIdAndUpdate(
                            group.vendorId,
                            {
                                $inc: {
                                    totalEarnings: adjustedEarnings,
                                    availableBalance: adjustedEarnings,
                                    totalSales: Math.round((group.subtotal || 0) * ratio)
                                }
                            },
                            { session }
                        );

                        // Create a Commission record as a ledger entry
                        await Commission.create([{
                            orderId: order._id,
                            vendorId: group.vendorId,
                            vendorName: group.vendorName,
                            subtotal: group.subtotal,
                            basePrice: group.basePrice || 0,
                            commissionRate: group.commissionRate || 0,
                            commission: Math.round((group.commissionAmount || 0) * ratio),
                            vendorEarnings: adjustedEarnings,
                            status: 'pending'
                        }], { session });

                        console.log(`[Wallet] Credited ₹${adjustedEarnings} to Vendor ${group.vendorId} and created commission record.`);
                    }
                }
            }

            await session.commitTransaction();
            return true;
        } catch (error) {
            await session.abortTransaction();
            console.error('[Wallet Error] Failed to process order earnings:', error.message);
            throw error;
        } finally {
            session.endSession();
        }
    }
};
