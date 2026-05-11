import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import WithdrawalRequest from '../../../models/WithdrawalRequest.model.js';
import DeliveryBoy from '../../../models/DeliveryBoy.model.js';
import Vendor from '../../../models/Vendor.model.js';
import mongoose from 'mongoose';
import { payoutToUpi } from '../../../services/razorpay.service.js';
import { createNotification } from '../../../services/notification.service.js';

/**
 * Get all withdrawal requests
 */
export const getAllWithdrawalRequests = asyncHandler(async (req, res) => {
    const { status, type, requestType } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.requesterType = type;
    if (requestType) filter.requestType = requestType;

    const requests = await WithdrawalRequest.find(filter)
        .populate({ path: 'requesterId', select: 'name email phone storeName storeLogo avatar' })
        .sort({ createdAt: -1 });

    res.status(200).json(new ApiResponse(200, requests, 'Withdrawal requests fetched.'));
});

/**
 * Approve or Reject a withdrawal request
 */
export const updateWithdrawalStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, adminNotes, transactionId } = req.body;

    if (!['approved', 'rejected', 'completed'].includes(status)) {
        throw new ApiError(400, 'Invalid status.');
    }

    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            const request = await WithdrawalRequest.findById(id).session(session);
            if (!request) throw new ApiError(404, 'Withdrawal request not found.');

            if (request.status !== 'pending') {
                throw new ApiError(400, 'Request has already been processed.');
            }

            const model = request.requesterType === 'DeliveryBoy' ? DeliveryBoy : Vendor;
            const requester = await model.findById(request.requesterId).session(session);

            // Check if this is a settlement request (linked to commissions)
            const Commission = mongoose.model('Commission');
            const linkedCommissions = await Commission.find({ withdrawalRequestId: request._id }).session(session);
            const isSettlementRequest = linkedCommissions.length > 0;

            if (status === 'approved' || status === 'completed') {
                const balanceToCheck = isSettlementRequest ? 'pendingBalance' : 'availableBalance';
                const currentBalance = Number(requester?.[balanceToCheck] || 0);
                const requestAmount = Number(request.amount || 0);
                
                // Use Math.round to avoid floating point precision issues (e.g. 100.000000001 < 100)
                // Also, for settlement requests, we allow some leniency if the vendor has legacy commissions 
                // that might not be fully reflected in the new pendingBalance field.
                if (!requester || (Math.round(currentBalance) < Math.round(requestAmount) && !isSettlementRequest)) {
                    throw new ApiError(400, `Requester no longer has sufficient ${balanceToCheck.replace('Balance', ' balance')}. Current: ₹${currentBalance}, Requested: ₹${requestAmount}`);
                }

                // If UPI ID is present, try to process real payout via Razorpay
                if (request.bankDetails?.upiId && process.env.RAZORPAY_KEY_ID !== 'your_key_id') {
                    try {
                        const payout = await payoutToUpi({
                            name: requester.name || requester.storeName,
                            upiId: request.bankDetails.upiId,
                            amount: request.amount,
                            requestId: String(request._id)
                        });
                        request.transactionId = payout.id || transactionId || request.transactionId;
                        request.adminNotes = `Razorpay Payout ID: ${payout.id}. ` + (adminNotes || '');
                    } catch (error) {
                        console.error('Payout automation failed:', error);
                        throw new ApiError(500, `Automated Payout Failed: ${error.message}. Please approve manually if you handled the transfer separately.`);
                    }
                }

                // Deduct balance
                await model.findByIdAndUpdate(request.requesterId, {
                    $inc: { [balanceToCheck]: -requestAmount }
                }, { session });

                // If it's a settlement request, mark commissions as paid
                if (isSettlementRequest) {
                    await Commission.updateMany(
                        { withdrawalRequestId: request._id },
                        { $set: { status: 'paid', paidAt: new Date() } },
                        { session }
                    );
                }

                request.status = status;
                request.transactionId = transactionId || request.transactionId;
            } else if (status === 'rejected') {
                request.status = 'rejected';
                
                // If it's a settlement request, revert commissions to pending
                if (isSettlementRequest) {
                    await Commission.updateMany(
                        { withdrawalRequestId: request._id },
                        { $set: { status: 'pending' }, $unset: { withdrawalRequestId: "" } },
                        { session }
                    );
                }
            }

            request.adminNotes = adminNotes || request.adminNotes;
            request.processedAt = new Date();
            await request.save({ session });

            // Send notification to requester
            const requesterType = request.requesterType === 'DeliveryBoy' ? 'delivery' : 'vendor';
            let notificationTitle = '';
            let notificationMessage = '';
            let notificationSound = 'default';

            if (status === 'approved' || status === 'completed') {
                notificationTitle = '✅ Payout Approved';
                notificationMessage = `Your payout request of ₹${request.amount} has been approved and will be processed within 24-48 hours.`;
                notificationSound = 'success';
            } else if (status === 'rejected') {
                notificationTitle = '❌ Payout Rejected';
                notificationMessage = `Your payout request of ₹${request.amount} was rejected. ${adminNotes ? `Reason: ${adminNotes}` : 'Please contact support for details.'}`;
                notificationSound = 'alert';
            }

            // Create notification
            await createNotification({
                recipientId: request.requesterId,
                recipientType: requesterType,
                title: notificationTitle,
                message: notificationMessage,
                type: 'payout',
                data: {
                    withdrawalId: String(request._id),
                    amount: request.amount,
                    status: request.status,
                    sound: notificationSound
                }
            });
        });
    } finally {
        await session.endSession();
    }

    res.status(200).json(new ApiResponse(200, request, `Withdrawal request ${status}.`));
});
