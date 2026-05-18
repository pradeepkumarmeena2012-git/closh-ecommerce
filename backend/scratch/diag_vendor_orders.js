import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Vendor from '../src/models/Vendor.model.js';
import Order from '../src/models/Order.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/closh';

async function diagnose() {
    console.log('Connecting to database...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected!');

    // Find the vendor by email
    const vendor = await Vendor.findOne({ email: 'vendor@vendor.com' });
    if (!vendor) {
        console.error('Vendor not found!');
        await mongoose.disconnect();
        return;
    }

    console.log('\n--- VENDOR DETAILS ---');
    console.log('ID:', vendor._id);
    console.log('Name:', vendor.name);
    console.log('Store Name:', vendor.storeName);
    console.log('Is Online:', vendor.isOnline);
    console.log('Shop Location:', JSON.stringify(vendor.shopLocation));

    const vendorObjectId = vendor._id;

    // Find all orders for this vendor
    const orders = await Order.find({ 'vendorItems.vendorId': vendorObjectId })
        .sort({ createdAt: -1 })
        .lean();

    console.log(`\nFound ${orders.length} orders total for this vendor.`);

    if (orders.length > 0) {
        console.log('\n--- RECENT 5 ORDERS ---');
        orders.slice(0, 5).forEach((order) => {
            const vi = order.vendorItems.find(item => String(item.vendorId) === String(vendorObjectId));
            console.log(`Order ID: ${order.orderId} (${order._id})`);
            console.log(`  Overall Status: ${order.status}`);
            console.log(`  Payment Method: ${order.paymentMethod}`);
            console.log(`  Payment Status: ${order.paymentStatus}`);
            console.log(`  Vendor Specific Status: ${vi ? vi.status : 'NOT FOUND'}`);
            console.log(`  Created At: ${order.createdAt}`);
            console.log('-----------------------------------');
        });
    }

    await mongoose.disconnect();
}

diagnose().catch(err => {
    console.error('Diagnostic failed:', err);
    mongoose.disconnect();
});
