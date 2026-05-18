
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/clothify';

async function listDatabasesAndCollections() {
    try {
        await mongoose.connect(mongoUri);
        const admin = mongoose.connection.db.admin();
        const dbs = await admin.listDatabases();
        console.log('Databases:', dbs.databases.map(db => db.name));

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections in current DB:', collections.map(c => c.name));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

listDatabasesAndCollections();
