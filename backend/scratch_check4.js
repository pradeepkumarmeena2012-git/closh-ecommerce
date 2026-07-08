import mongoose from 'mongoose';
import DeliveryBoy from './src/models/DeliveryBoy.model.js';

async function check() {
    try {
        await mongoose.connect('mongodb+srv://mayurchadokar14_db_user:sORqnMJxbSjnstzY@cluster0.ueig0du.mongodb.net/clouse');
        const dboys = await DeliveryBoy.find().select('_id name');
        console.log("Delivery Boys:", dboys);
    } catch(err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
check();
