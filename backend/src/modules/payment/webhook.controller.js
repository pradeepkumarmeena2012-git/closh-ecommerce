import crypto from 'crypto';
import { Order } from '../../models/Order.model.js';
import ReturnRequest from '../../models/ReturnRequest.model.js';

export const handleRazorpayWebhook = async (req, res) => {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        const signature = req.headers['x-razorpay-signature'];
        
        if (!secret || !signature) {
            return res.status(400).json({ success: false, message: 'Missing secret or signature' });
        }

        const bodyString = JSON.stringify(req.body);
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(bodyString)
            .digest('hex');

        if (expectedSignature !== signature) {
            return res.status(400).json({ success: false, message: 'Invalid signature' });
        }

        const event = req.body.event;
        const payload = req.body.payload;

        if (event === 'refund.processed') {
            const refundInfo = payload.refund.entity;
            const paymentId = refundInfo.payment_id;
            const notes = refundInfo.notes || {};
            
            // Check if it's an order refund or return request refund based on metadata notes
            if (notes.orderId) {
                await Order.findOneAndUpdate(
                    { _id: notes.orderId },
                    { 
                        refundStatus: 'processed', 
                        refundId: refundInfo.id,
                        paymentStatus: 'refunded'
                    }
                );
            }
            
            if (notes.returnId) {
                await ReturnRequest.findOneAndUpdate(
                    { _id: notes.returnId },
                    { 
                        refundStatus: 'processed', 
                        refundId: refundInfo.id 
                    }
                );
            }
        } else if (event === 'refund.failed') {
            const refundInfo = payload.refund.entity;
            const notes = refundInfo.notes || {};

            if (notes.orderId) {
                await Order.findOneAndUpdate(
                    { _id: notes.orderId },
                    { refundStatus: 'failed' }
                );
            }
            
            if (notes.returnId) {
                await ReturnRequest.findOneAndUpdate(
                    { _id: notes.returnId },
                    { refundStatus: 'failed' }
                );
            }
        }

        // Return 200 OK immediately to Razorpay so they don't retry
        return res.status(200).json({ status: 'ok' });

    } catch (error) {
        console.error('Webhook processing error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
