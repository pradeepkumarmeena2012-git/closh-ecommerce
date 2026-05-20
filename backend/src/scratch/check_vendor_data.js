import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const vendors = mongoose.connection.collection('vendors');
        
        const vendorIds = ['6a0af969e1a5775d463862a6', '6a0af969e1a5775d463862a1'];
        for (const vid of vendorIds) {
            const v = await vendors.findOne({ _id: new mongoose.Types.ObjectId(vid) });
            if (v) {
                console.log(`\n--- Vendor: ${v.storeName} ---`);
                console.log('Phone:', v.phone);
                console.log('shopAddress:', v.shopAddress);
                console.log('address:', JSON.stringify(v.address));
                console.log('shopLocation:', JSON.stringify(v.shopLocation));
            }
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}
run();
