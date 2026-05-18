
import mongoose from 'mongoose';

async function queryClosh() {
    try {
        const conn = await mongoose.createConnection('mongodb://localhost:27017/closh').asPromise();
        
        const users = await conn.db.collection('users').find({}).limit(1).toArray();
        const vendors = await conn.db.collection('vendors').find({}).limit(1).toArray();
        const deliveryBoys = await conn.db.collection('deliveryboys').find({}).limit(1).toArray();
        const admins = await conn.db.collection('admins').find({}).limit(1).toArray();

        console.log('User:', users[0] ? { phone: users[0].phone, email: users[0].email } : 'None');
        console.log('Vendor:', vendors[0] ? { email: vendors[0].email, phone: vendors[0].phone } : 'None');
        console.log('Delivery:', deliveryBoys[0] ? { phone: deliveryBoys[0].phone, email: deliveryBoys[0].email } : 'None');
        console.log('Admin:', admins[0] ? { email: admins[0].email } : 'None');

        await conn.close();
    } catch (err) {
        console.error(err);
    }
}
queryClosh();
