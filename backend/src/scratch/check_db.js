import mongoose from 'mongoose';
import DeliveryBoy from '../models/DeliveryBoy.model.js';
import Order from '../models/Order.model.js';
import ReturnRequest from '../models/ReturnRequest.model.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGO_URI;

mongoose.connect(MONGODB_URI)
    .then(async () => {
        const riders = await DeliveryBoy.find({ name: /Adarsh/i });
        console.log("RIDERS MATCHING ADARSH:");
        console.log(JSON.stringify(riders.map(r => ({ _id: r._id, name: r.name, phone: r.phone, status: r.status })), null, 2));

        const adarsh = await DeliveryBoy.findOne({ name: /Adarsh/i });
        const returnRequests = await ReturnRequest.find({ deliveryBoyId: adarsh._id });
        console.log("RETURN REQUESTS FOR ADARSH:");
        console.log(JSON.stringify(returnRequests.map(r => ({ _id: r._id, returnId: r.returnId, status: r.status })), null, 2));

        const testOrder = await Order.findOneAndUpdate(
            { orderId: /x7k1/i },
            { $set: { status: 'assigned', deliveryBoyId: adarsh._id } },
            { new: true }
        );
        console.log("UPDATED TEST ORDER:");
        console.log(JSON.stringify(testOrder, null, 2));

        const list = await Order.find({ 
            orderId: /x7k1/i
        });
        console.log("ORDERS WITH X7K1:");
        console.log(JSON.stringify(list.map(o => ({ 
            _id: o._id, 
            orderId: o.orderId, 
            status: o.status, 
            deliveryBoyId: o.deliveryBoyId,
            customerName: o.shippingAddress?.name,
            total: o.total,
            createdAt: o.createdAt
        })), null, 2));

        const activeOrders = await Order.find({
            status: { $in: ['assigned', 'picked_up', 'out_for_delivery', 'arrived', 'processing'] }
        });
        console.log("ALL ACTIVE ORDERS IN DB:");
        console.log(JSON.stringify(activeOrders.map(o => ({ 
            _id: o._id, 
            orderId: o.orderId, 
            status: o.status, 
            deliveryBoyId: o.deliveryBoyId,
            customerName: o.shippingAddress?.name,
            total: o.total
        })), null, 2));

        process.exit(0);
    })
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
