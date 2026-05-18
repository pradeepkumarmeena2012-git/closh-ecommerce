
import mongoose from 'mongoose';

async function listServiceability() {
    try {
        await mongoose.connect('mongodb://localhost:27017/clothify');
        
        const serviceAreas = await mongoose.connection.db.collection('serviceareas').find({}).toArray();
        console.log(`\n--- Service Areas (${serviceAreas.length}) ---`);
        serviceAreas.forEach(sa => console.log(`Name: ${sa.name} | Active: ${sa.isActive}`));

        const pincodes = await mongoose.connection.db.collection('pincodeserviceabilities').find({}).toArray();
        console.log(`\n--- Pincode Serviceability (${pincodes.length}) ---`);
        pincodes.forEach(p => console.log(`Pincode: ${p.pincode} | Serviceable: ${p.isServiceable}`));

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
listServiceability();
