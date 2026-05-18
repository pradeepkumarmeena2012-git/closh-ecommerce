
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const dbsToTry = ['clothify', 'closh'];

async function getCredentials() {
    try {
        for (const dbName of dbsToTry) {
            const mongoUri = `mongodb://localhost:27017/${dbName}`;
            console.log(`\n--- TRYING DB: ${dbName} ---`);
            const conn = await mongoose.createConnection(mongoUri).asPromise();
            
            const User = conn.model('User', new mongoose.Schema({}), 'users');
            const Vendor = conn.model('Vendor', new mongoose.Schema({}), 'vendors');
            const DeliveryBoy = conn.model('DeliveryBoy', new mongoose.Schema({}), 'deliveryboys');
            const Admin = conn.model('Admin', new mongoose.Schema({}), 'admins');

            const users = await User.find({}).limit(3).lean();
            const vendors = await Vendor.find({}).limit(3).lean();
            const deliveryBoys = await DeliveryBoy.find({}).limit(3).lean();
            const admins = await Admin.find({}).limit(3).lean();

            console.log(`Found: Users(${users.length}), Vendors(${vendors.length}), Riders(${deliveryBoys.length}), Admins(${admins.length})`);

            if (users.length > 0) {
                console.log('CUSTOMERS:');
                users.forEach(u => console.log(`  - Phone: ${u.phone} | Email: ${u.email} | Name: ${u.name}`));
            }
            if (vendors.length > 0) {
                console.log('VENDORS:');
                vendors.forEach(v => console.log(`  - Email: ${v.email} | Phone: ${v.phone} | Store: ${v.storeName}`));
            }
            if (deliveryBoys.length > 0) {
                console.log('RIDERS:');
                deliveryBoys.forEach(d => console.log(`  - Phone: ${d.phone} | Email: ${d.email} | Name: ${d.name}`));
            }
            if (admins.length > 0) {
                console.log('ADMINS:');
                admins.forEach(a => console.log(`  - Email: ${a.email} | Name: ${a.name}`));
            }

            await conn.close();
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

getCredentials();
