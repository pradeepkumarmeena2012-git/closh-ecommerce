import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

const envPath = 'c:/Users/mayur/OneDrive/Desktop/Cloth/Clouse/backend/.env';
dotenv.config({ path: envPath });

const checkRawStats = async () => {
    const client = new MongoClient(process.env.MONGODB_URI);
    try {
        await client.connect();
        const db = client.db();
        const orders = db.collection('orders');

        console.log('\n--- Status counts ---');
        const statusCounts = await orders.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]).toArray();
        statusCounts.forEach(s => console.log(`${s._id}: ${s.count}`));

        console.log('\n--- Orders with deliveryBoyId ---');
        const dbBoyStats = await orders.aggregate([
            { $match: { deliveryBoyId: { $exists: true, $ne: null } } },
            { $group: { _id: '$deliveryBoyId', total: { $sum: 1 }, delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } } } }
        ]).toArray();
        dbBoyStats.forEach(s => console.log(`BoyID: ${s._id} | Total: ${s.total} | Delivered: ${s.delivered}`));

        console.log('\n--- Example Order (with delivery info) ---');
        const example = await orders.findOne({ deliveryBoyId: { $exists: true } });
        if (example) {
            console.log('OrderId:', example.orderId);
            console.log('deliveryBoyId type:', typeof example.deliveryBoyId, example.deliveryBoyId instanceof ObjectId ? 'ObjectId' : 'not ObjectId');
            console.log('Status:', example.status);
        } else {
            console.log('None found.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
};

checkRawStats();
