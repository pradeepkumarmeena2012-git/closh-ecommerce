import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function checkVendorLocation() {
    try {
        if (!MONGO_URI) {
            console.error('MONGO_URI not found in .env');
            return;
        }
        await mongoose.connect(MONGO_URI);
        
        const Vendor = mongoose.model('Vendor', new mongoose.Schema({
            storeName: String,
            shopLocation: {
                type: { type: String, enum: ['Point'] },
                coordinates: [Number]
            }
        }, { strict: false }));

        const vendors = await Vendor.find({});
        console.log('--- Vendors Location Audit ---');
        vendors.forEach(v => {
            console.log(`Store: ${v.storeName}, Location: ${JSON.stringify(v.shopLocation?.coordinates)}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkVendorLocation();
