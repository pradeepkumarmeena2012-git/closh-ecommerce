import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function checkVendorAddress() {
    try {
        if (!MONGO_URI) {
            console.error('MONGO_URI not found in .env');
            return;
        }
        await mongoose.connect(MONGO_URI);
        
        const Vendor = mongoose.model('Vendor', new mongoose.Schema({
            storeName: String,
            shopAddress: String,
            address: {
                street: String,
                city: String,
                state: String
            }
        }, { strict: false }));

        const vendor = await Vendor.findOne({ storeName: 'Fashion Hub' });
        if (vendor) {
            console.log('--- Fashion Hub Info ---');
            console.log('Shop Address:', vendor.shopAddress);
            console.log('Address Object:', JSON.stringify(vendor.address, null, 2));
            console.log('Coordinates:', JSON.stringify(vendor.shopLocation?.coordinates));
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkVendorAddress();
