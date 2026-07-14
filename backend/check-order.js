import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    try {
        const Order = (await import('./src/models/order.model.js')).default;
        const User = (await import('./src/models/user.model.js')).default;
        
        const order = await Order.findOne({ orderId: 'ORD-260713-YKZC' }).populate('userId');
        if (!order) {
            console.log('Order not found');
        } else {
            console.log('--- ORDER FOUND ---');
            console.log('Order ID:', order.orderId);
            if (order.userId) {
                console.log('User Name:', order.userId.name);
                console.log('User Email:', order.userId.email);
                console.log('User Phone:', order.userId.phone);
                console.log('User ID:', order.userId._id);
            } else {
                console.log('User ID field is missing or guest order.');
            }
            console.log('Guest Info:', order.guestInfo);
            console.log('Shipping Address Name:', order.shippingAddress?.name);
            console.log('Shipping Address Phone:', order.shippingAddress?.phone);
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
  });
