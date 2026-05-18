import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;

async function deepDiag() {
    try {
        if (!MONGO_URI) {
            console.error('❌ MONGO_URI not found');
            return;
        }

        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB.');

        const db = mongoose.connection.db;

        // 1. List all delivery boys in the deliveryboys collection
        const deliveryBoys = await db.collection('deliveryboys').find({}).toArray();
        console.log('\n👥 --- ALL DOCUMENTS IN "deliveryboys" COLLECTION ---');
        deliveryBoys.forEach(d => {
            console.log(`- ID: ${d._id}`);
            console.log(`  Name: ${d.name}`);
            console.log(`  Email: ${d.email}`);
            console.log(`  Phone: ${d.phone}`);
            console.log(`  Status: ${d.status} | Application: ${d.applicationStatus}`);
            console.log(`  isActive: ${d.isActive} | isAvailable: ${d.isAvailable}`);
            console.log(`  Location: ${JSON.stringify(d.currentLocation?.coordinates)}`);
        });

        // 2. List any delivery-related users in the users collection
        const users = await db.collection('users').find({
            $or: [
                { role: 'delivery' },
                { role: 'rider' },
                { role: 'delivery_partner' },
                { email: /delivery/i },
                { email: /rider/i },
                { phone: '9876543210' },
                { phone: '7894561230' }
            ]
        }).toArray();
        console.log('\n👤 --- RELEVANT DOCUMENTS IN "users" COLLECTION ---');
        users.forEach(u => {
            console.log(`- ID: ${u._id}`);
            console.log(`  Name: ${u.name}`);
            console.log(`  Email: ${u.email}`);
            console.log(`  Phone: ${u.phone}`);
            console.log(`  Role: ${u.role}`);
            console.log(`  isVerified: ${u.isVerified}`);
        });

        // 3. Find any active orders (assigned, picked_up, out_for_delivery, arrived)
        const activeOrders = await db.collection('orders').find({
            status: { $in: ['assigned', 'picked_up', 'out_for_delivery', 'arrived'] }
        }).toArray();
        console.log('\n📦 --- ACTIVE ORDERS IN SYSTEM ---');
        activeOrders.forEach(o => {
            console.log(`- OrderId: ${o.orderId}`);
            console.log(`  Status: ${o.status}`);
            console.log(`  deliveryBoyId: ${o.deliveryBoyId}`);
            console.log(`  Customer: ${o.shippingAddress?.name} (${o.shippingAddress?.phone})`);
        });

        // 4. Find any active returns
        const activeReturns = await db.collection('returnrequests').find({
            status: { $in: ['processing', 'approved', 'ready_for_pickup'] }
        }).toArray();
        console.log('\n🔄 --- ACTIVE RETURN REQUESTS IN SYSTEM ---');
        activeReturns.forEach(r => {
            console.log(`- ID: ${r._id}`);
            console.log(`  Status: ${r.status}`);
            console.log(`  deliveryBoyId: ${r.deliveryBoyId}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

deepDiag();
