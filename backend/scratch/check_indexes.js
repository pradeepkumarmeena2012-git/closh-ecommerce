import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const checkIndexes = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/closh');
        console.log('Connected to DB');

        // Let's import the Vendor model to trigger its schema indexes
        await import('../src/models/Vendor.model.js');

        const db = mongoose.connection.db;
        const indexes = await db.collection('vendors').indexes();
        console.log('Indexes on vendors collection:');
        console.log(JSON.stringify(indexes, null, 2));

        const isPhoneUnique = indexes.some(idx => idx.key.phone === 1 && idx.unique);
        if (isPhoneUnique) {
            console.log('SUCCESS: Unique index on phone exists.');
        } else {
            console.log('WARNING: Unique index on phone does NOT exist. Attempting to create it...');
            await db.collection('vendors').createIndex({ phone: 1 }, { unique: true });
            console.log('Index created successfully.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
};

checkIndexes();
