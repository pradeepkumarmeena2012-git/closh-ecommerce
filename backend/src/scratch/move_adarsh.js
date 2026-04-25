import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function moveAdarsh() {
    try {
        if (!MONGO_URI) {
            console.error('MONGO_URI not found in .env');
            return;
        }
        await mongoose.connect(MONGO_URI);
        
        const DeliveryBoy = mongoose.model('DeliveryBoy', new mongoose.Schema({
            name: String,
            currentLocation: {
                type: { type: String, enum: ['Point'] },
                coordinates: [Number]
            }
        }, { strict: false }));

        // Move Adarsh to Indore (near Fashion Hub)
        const indoreCoords = [75.90012468259165, 22.711125594800297];
        
        const result = await DeliveryBoy.findOneAndUpdate(
            { name: /Adarsh/i },
            { 
                $set: { 
                    status: 'available',
                    currentLocation: {
                        type: 'Point',
                        coordinates: indoreCoords
                    }
                }
            },
            { new: true }
        );

        if (result) {
            console.log(`Adarsh moved to Indore successfully. Current Location: ${JSON.stringify(result.currentLocation.coordinates)}`);
        } else {
            console.log('Adarsh not found.');
        }

        // Also, fix the orders that had [0,0] pickup location
        const Order = mongoose.model('Order', new mongoose.Schema({
            orderId: String,
            pickupLocation: {
                type: { type: String, enum: ['Point'] },
                coordinates: [Number]
            }
        }, { strict: false }));

        const orderFix = await Order.updateMany(
            { status: 'searching', 'pickupLocation.coordinates': [0, 0] },
            { $set: { 'pickupLocation.coordinates': indoreCoords } }
        );
        console.log(`Updated ${orderFix.modifiedCount} orders with correct pickup location.`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

moveAdarsh();
