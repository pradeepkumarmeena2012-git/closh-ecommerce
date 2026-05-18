
import mongoose from 'mongoose';

async function listDeliveryBoys() {
    try {
        await mongoose.connect('mongodb://localhost:27017/clothify');
        const boys = await mongoose.connection.db.collection('deliveryboys').find({}).toArray();
        console.log(`Found ${boys.length} delivery partners:`);
        boys.forEach(b => console.log(`Email: ${b.email} | Phone: ${b.phone} | Status: ${b.applicationStatus}`));
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
listDeliveryBoys();
