
import mongoose from 'mongoose';

async function listUsers() {
    try {
        await mongoose.connect('mongodb://localhost:27017/clothify');
        const users = await mongoose.connection.db.collection('users').find({}).toArray();
        console.log(`Found ${users.length} users:`);
        users.forEach(u => console.log(`Email: ${u.email} | Phone: ${u.phone} | Role: ${u.role}`));
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
listUsers();
