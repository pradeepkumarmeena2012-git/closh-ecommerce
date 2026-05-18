import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;

async function diagnoseAndFixOrder() {
    try {
        if (!MONGO_URI) {
            console.error('❌ MONGO_URI not found in .env');
            return;
        }

        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB Atlas');

        // Dynamic schema definition to avoid model compilation conflicts
        const Order = mongoose.model('Order_Diag', new mongoose.Schema({
            orderId: String,
            status: String,
            pickupLocation: {
                type: { type: String, enum: ['Point'] },
                coordinates: [Number]
            },
            dropoffLocation: {
                type: { type: String, enum: ['Point'] },
                coordinates: [Number]
            },
            deliveryBoyId: mongoose.Schema.Types.ObjectId
        }, { collection: 'orders', strict: false }));

        const DeliveryBoy = mongoose.model('DeliveryBoy_Diag', new mongoose.Schema({
            name: String,
            email: String,
            phone: String,
            applicationStatus: String,
            isActive: Boolean,
            isAvailable: Boolean,
            status: String,
            currentLocation: {
                type: { type: String, enum: ['Point'] },
                coordinates: [Number]
            }
        }, { collection: 'deliveryboys', strict: false }));

        // 1. Diagnose Order
        const targetOrderId = 'ORD-260518-A2O8';
        const order = await Order.findOne({ orderId: targetOrderId });

        if (!order) {
            console.log(`❌ Order ${targetOrderId} not found in database!`);
            return;
        }

        console.log('\n🔍 --- ORDER DIAGNOSIS ---');
        console.log(`- ID: ${order._id}`);
        console.log(`- Order ID: ${order.orderId}`);
        console.log(`- Status: ${order.status}`);
        console.log(`- Current deliveryBoyId: ${order.deliveryBoyId || 'NONE'}`);
        console.log(`- Pickup Location Coordinates: ${JSON.stringify(order.pickupLocation?.coordinates)}`);
        console.log(`- Dropoff Location Coordinates: ${JSON.stringify(order.dropoffLocation?.coordinates)}`);

        const indoreCoords = [75.87176933682845, 22.717598767554193];

        let orderUpdated = false;
        // Fix coordinates if they are [0,0]
        if (order.pickupLocation?.coordinates?.[0] === 0 && order.pickupLocation?.coordinates?.[1] === 0) {
            order.pickupLocation = {
                type: 'Point',
                coordinates: indoreCoords
            };
            orderUpdated = true;
            console.log('⚡ Updated pickupLocation coordinates to Indore:', indoreCoords);
        }

        if (order.dropoffLocation?.coordinates?.[0] === 0 && order.dropoffLocation?.coordinates?.[1] === 0) {
            order.dropoffLocation = {
                type: 'Point',
                coordinates: indoreCoords
            };
            orderUpdated = true;
            console.log('⚡ Updated dropoffLocation coordinates to Indore:', indoreCoords);
        }

        if (orderUpdated) {
            await order.save();
            console.log('✅ Order coordinates saved successfully!');
        }

        // 2. Diagnose & Fix Delivery Boys
        const boys = await DeliveryBoy.find({});
        console.log(`\n👥 --- AVAILABLE DELIVERY PARTNERS (${boys.length}) ---`);
        for (const boy of boys) {
            console.log(`- Name: ${boy.name}`);
            console.log(`  Email: ${boy.email}`);
            console.log(`  Phone: ${boy.phone}`);
            console.log(`  Status: ${boy.status} | Application Status: ${boy.applicationStatus}`);
            console.log(`  isActive: ${boy.isActive} | isAvailable: ${boy.isAvailable}`);
            console.log(`  Location: ${JSON.stringify(boy.currentLocation?.coordinates)}`);
            
            // Check if this delivery boy is not available or has invalid location coordinates
            let boyUpdated = false;
            const updateFields = {};

            if (boy.applicationStatus !== 'approved') {
                updateFields.applicationStatus = 'approved';
                boyUpdated = true;
                console.log(`  👉 Setting applicationStatus to approved`);
            }
            if (boy.isActive !== true) {
                updateFields.isActive = true;
                boyUpdated = true;
                console.log(`  👉 Setting isActive to true`);
            }
            if (boy.isAvailable !== true) {
                updateFields.isAvailable = true;
                boyUpdated = true;
                console.log(`  👉 Setting isAvailable to true`);
            }
            if (boy.status !== 'available') {
                updateFields.status = 'available';
                boyUpdated = true;
                console.log(`  👉 Setting status to available`);
            }
            if (!boy.currentLocation?.coordinates || (boy.currentLocation.coordinates[0] === 0 && boy.currentLocation.coordinates[1] === 0)) {
                updateFields.currentLocation = {
                    type: 'Point',
                    coordinates: indoreCoords
                };
                boyUpdated = true;
                console.log(`  👉 Setting currentLocation coordinates to Indore:`, indoreCoords);
            }

            if (boyUpdated) {
                await DeliveryBoy.findByIdAndUpdate(boy._id, { $set: updateFields });
                console.log(`  ✅ Successfully updated delivery partner ${boy.name}`);
            }
        }

        console.log('\n🎉 ALL DIAGNOSTIC AND REPAIR ACTIONS COMPLETED!');

    } catch (e) {
        console.error('Error during diagnosis:', e);
    } finally {
        await mongoose.disconnect();
    }
}

diagnoseAndFixOrder();
