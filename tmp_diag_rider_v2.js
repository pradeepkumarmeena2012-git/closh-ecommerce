import mongoose from 'mongoose';
import 'dotenv/config';

// Manually define models since importing can be tricky in scratch scripts with ES modules
const UserSchema = new mongoose.Schema({ phone: String });
const User = mongoose.model('User', UserSchema);

const OrderSchema = new mongoose.Schema({ 
    orderId: String,
    deliveryBoyId: mongoose.Schema.Types.ObjectId,
    status: String,
    isDeleted: { type: Boolean, default: false },
    updatedAt: Date
});
const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

const DeliveryBoySchema = new mongoose.Schema({ userId: mongoose.Schema.Types.ObjectId });
const DeliveryBoy = mongoose.models.DeliveryBoy || mongoose.model('DeliveryBoy', DeliveryBoySchema);

const MONGO_URI = "mongodb+srv://mayurchadokar14_db_user:sORqnMJxbSjnstzY@cluster0.ueig0du.mongodb.net/clouse";

async function check() {
    try {
        await mongoose.connect(MONGO_URI);
        const user = await User.findOne({ phone: '7879363299' });
        if (!user) {
            console.log('User not found');
            process.exit();
        }
        console.log('User ID:', user._id);
        
        // Find rider profile
        const riderProfile = await DeliveryBoy.findOne({ userId: user._id });
        console.log('Rider Profile ID:', riderProfile?._id);
        
        const dbId = riderProfile ? riderProfile._id : user._id; // Use whichever is used in the app
        
        const activeStatuses = ['assigned', 'picked_up', 'out_for_delivery', 'picked-up', 'out-for-delivery'];
        
        const activeCountUser = await Order.countDocuments({ deliveryBoyId: user._id, status: { $in: activeStatuses }, isDeleted: { $ne: true } });
        const activeCountRider = await Order.countDocuments({ deliveryBoyId: riderProfile?._id, status: { $in: activeStatuses }, isDeleted: { $ne: true } });
        
        console.log('Search ID: user._id -> Active:', activeCountUser);
        console.log('Search ID: rider._id -> Active:', activeCountRider);
        
        const totalCount = await Order.countDocuments({ deliveryBoyId: dbId });
        console.log('Total Tasks (dbId):', totalCount);
        
        const recent = await Order.find({ deliveryBoyId: dbId })
            .sort({ updatedAt: -1 })
            .limit(10)
            .select('status orderId updatedAt');
        console.log('Most Recent 10 for Rider:', JSON.stringify(recent, null, 2));

    } catch (e) {
        console.error(e);
    }
    process.exit();
}

check();
