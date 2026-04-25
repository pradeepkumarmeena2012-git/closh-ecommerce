import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function checkAdarshStatus() {
    try {
        if (!MONGO_URI) {
            console.error('MONGO_URI not found in .env');
            return;
        }
        await mongoose.connect(MONGO_URI);
        
        // Define schemas
        const DeliveryBoy = mongoose.model('DeliveryBoy', new mongoose.Schema({
            name: String,
            status: String,
            currentLocation: {
                type: { type: String, enum: ['Point'] },
                coordinates: [Number]
            }
        }, { strict: false }));

        const Order = mongoose.model('Order', new mongoose.Schema({
            orderId: String,
            status: String,
            pickupLocation: {
                type: { type: String, enum: ['Point'] },
                coordinates: [Number]
            }
        }, { strict: false }));

        // 1. Find Adarsh
        const adarsh = await DeliveryBoy.findOne({ name: /Adarsh/i });
        if (!adarsh) {
            console.log('Rider "Adarsh" not found.');
        } else {
            console.log('--- Rider Info ---');
            console.log('ID:', adarsh._id);
            console.log('Name:', adarsh.name);
            console.log('Status:', adarsh.status);
            console.log('Location:', JSON.stringify(adarsh.currentLocation, null, 2));
        }

        // 2. Find any pending orders in 'searching' status
        const orders = await Order.find({ status: 'searching' });
        console.log('\n--- Active Searching Orders ---');
        if (orders.length === 0) {
            console.log('No orders currently in "searching" status.');
        } else {
            orders.forEach(o => {
                console.log(`Order ID: ${o.orderId}, Pickup: ${JSON.stringify(o.pickupLocation?.coordinates)}`);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkAdarshStatus();
