
import mongoose from 'mongoose';

async function checkClosh() {
    try {
        const conn = await mongoose.createConnection('mongodb://localhost:27017/closh').asPromise();
        const collections = await conn.db.listCollections().toArray();
        console.log('Collections in CLOSH:', collections.map(c => c.name));
        await conn.close();
    } catch (err) {
        console.error(err);
    }
}
checkClosh();
