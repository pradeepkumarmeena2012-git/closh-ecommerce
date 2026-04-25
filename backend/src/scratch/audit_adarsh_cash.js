import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function auditAdarshCash() {
    try {
        if (!MONGO_URI) {
            console.error('MONGO_URI not found in .env');
            return;
        }
        await mongoose.connect(MONGO_URI);
        
        const Order = mongoose.model('Order', new mongoose.Schema({
            orderId: String,
            status: String,
            paymentMethod: String,
            total: Number,
            isCashSettled: Boolean,
            deliveryFlow: Object,
            deliveryBoyId: mongoose.Schema.Types.ObjectId
        }, { strict: false }));

        const adarshId = '69cf515f4ef6cf62b909a976'; // From previous check
        
        const orders = await Order.find({
            deliveryBoyId: adarshId,
            status: 'delivered',
            paymentMethod: { $in: ['cod', 'cash', 'upi', 'qr'] }, // Checking all payment methods just in case
            isDeleted: { $ne: true }
        });

        console.log('--- Adarsh Delivered COD/Cash Orders ---');
        let calculatedCashInHand = 0;
        
        orders.forEach(o => {
            const amount = o.deliveryFlow?.finalAmount ?? o.total;
            const settled = o.isCashSettled === true;
            
            console.log(`Order: ${o.orderId}, Method: ${o.paymentMethod}, Total: ${o.total}, Final: ${o.deliveryFlow?.finalAmount}, Settled: ${settled}`);
            
            if (!settled && (o.paymentMethod === 'cod' || o.paymentMethod === 'cash')) {
                calculatedCashInHand += amount;
            }
        });

        console.log('\nCalculated Cash In Hand:', calculatedCashInHand);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

auditAdarshCash();
