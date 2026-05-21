import mongoose from 'mongoose';
import Order from '../models/Order.model.js';
import DeliveryBatch from '../models/DeliveryBatch.model.js';
import ReturnRequest from '../models/ReturnRequest.model.js';

await mongoose.connect('mongodb://localhost:27017/clouse');

const ordersCount = await Order.countDocuments({});
console.log('Total orders:', ordersCount);

const ordersList = await Order.find({}).limit(10);
console.log('Last 10 orders:');
ordersList.forEach(o => {
    console.log(`- ${o.orderId} : status = ${o.status}, type = ${o.orderType}`);
});

const returnRequests = await ReturnRequest.find({}).limit(10);
console.log('\nLast 10 ReturnRequests:');
returnRequests.forEach(r => {
    console.log(`- OrderID: ${r.orderId}, returnId: ${r.returnId}, status = ${r.status}`);
});

await mongoose.disconnect();
