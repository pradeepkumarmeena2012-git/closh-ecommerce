import mongoose from 'mongoose';
import 'dotenv/config';
import User from './backend/src/models/User.model.js';
import Order from './backend/src/models/Order.model.js';
import DeliveryBoy from './backend/src/models/DeliveryBoy.model.js';

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const user = await User.findOne({ phone: '7879363299' });
        if (!user) {
            console.log('User not found');
            process.exit();
        }
        const riderId = user._id; // Often the user._id IS the deliveryBoyId in some controllers, but check the model
        const riderProfile = await DeliveryBoy.findOne({ userId: user._id });
        const dbId = riderProfile ? riderProfile._id : user._id;
        
        console.log('Rider ID (Searchable):', dbId);
        
        const activeCount = await Order.countDocuments({ deliveryBoyId: dbId, status: { $in: ['assigned', 'picked_up', 'out_for_delivery'] } });
        const totalCount = await Order.countDocuments({ deliveryBoyId: dbId });
        console.log('Active Tasks:', activeCount);
        console.log('Total Tasks:', totalCount);
        
        const recent = await Order.find({ deliveryBoyId: dbId }).sort({ updatedAt: -1 }).limit(10).select('status orderId updatedAt');
        console.log('Recent Orders:', JSON.stringify(recent, null, 2));
    } catch (e) {
        console.error(e);
    }
    process.exit();
}

check();
