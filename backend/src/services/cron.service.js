import mongoose from 'mongoose';
import Commission from '../models/Commission.model.js';
import Vendor from '../models/Vendor.model.js';
import Order from '../models/Order.model.js';

/**
 * Cron Service for automated background tasks
 */
export const CronService = {
    /**
     * Shifts pending commissions to 'ready' after 24 hours if no return is requested
     * Also moves funds from pendingBalance to availableBalance
     */
    async finalizeCommissions() {
        console.log(`[Cron] Running finalizedCommissions task at ${new Date().toISOString()}`);
        
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const TWENTY_FOUR_HOURS_AGO = new Date(Date.now() - 24 * 60 * 60 * 1000);

            // 1. Find all pending commissions older than 24 hours
            const pendingCommissions = await Commission.find({
                status: 'pending',
                createdAt: { $lt: TWENTY_FOUR_HOURS_AGO }
            }).populate('orderId').session(session);

            console.log(`[Cron] Found ${pendingCommissions.length} pending commissions to evaluate.`);

            for (const commission of pendingCommissions) {
                const order = commission.orderId;
                
                // If order was somehow not found or deleted, skip
                if (!order) continue;

                const orderStatus = String(order.status || '').toLowerCase();
                const isReturnRelated = orderStatus === 'return requested' || orderStatus === 'returned' || orderStatus === 'cancelled';

                if (isReturnRelated) {
                    // If order is returned/cancelled, mark commission as cancelled and deduct from pending balance
                    // (Note: processOrderReturn usually handles this, but this is a safety fallback)
                    commission.status = 'cancelled';
                    await commission.save({ session });
                    
                    await Vendor.findByIdAndUpdate(commission.vendorId, {
                        $inc: { 
                            pendingBalance: -commission.vendorEarnings,
                            totalEarnings: -commission.vendorEarnings
                        }
                    }, { session });
                    
                    console.log(`[Cron] Commission ${commission._id} cancelled due to order status: ${orderStatus}`);
                } else if (orderStatus === 'delivered') {
                    // If order is delivered and 24h passed without return, move to ready
                    commission.status = 'ready';
                    await commission.save({ session });

                    // Move funds from pending to available
                    await Vendor.findByIdAndUpdate(commission.vendorId, {
                        $inc: { 
                            pendingBalance: -commission.vendorEarnings,
                            availableBalance: commission.vendorEarnings 
                        }
                    }, { session });

                    console.log(`[Cron] Commission ${commission._id} finalized and moved to available balance.`);
                }
            }

            await session.commitTransaction();
            console.log(`[Cron] finalizedCommissions task completed successfully.`);
        } catch (error) {
            await session.abortTransaction();
            console.error(`[Cron Error] finalizedCommissions task failed:`, error.message);
        } finally {
            session.endSession();
        }
    },

    /**
     * Initialize all scheduled tasks
     */
    init() {
        // Run every hour
        setInterval(() => {
            this.finalizeCommissions().catch(err => console.error('[Cron] Interval task error:', err));
        }, 60 * 60 * 1000);

        // Run once on startup after a short delay
        setTimeout(() => {
            this.finalizeCommissions().catch(err => console.error('[Cron] Initial task error:', err));
        }, 10000);
    }
};
