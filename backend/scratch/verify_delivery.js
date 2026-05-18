
import mongoose from 'mongoose';

async function verifyDeliveryBoy() {
    try {
        await mongoose.connect('mongodb://localhost:27017/clothify');
        const boy = await mongoose.connection.db.collection('deliveryboys').findOne({ phone: '7894561230' });
        if (boy) {
            console.log('--- Delivery Boy Status ---');
            console.log(`Phone: ${boy.phone}`);
            console.log(`Status: ${boy.applicationStatus}`);
            console.log(`Active: ${boy.isActive}`);
            console.log(`Available: ${boy.isAvailable}`);
        } else {
            console.log('❌ Delivery Boy with phone 7894561230 not found!');
        }
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
verifyDeliveryBoy();
