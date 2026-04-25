import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/closh';

async function findRecentProduct() {
    try {
        await mongoose.connect(MONGO_URI);
        const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
        const products = await Product.find().sort({ updatedAt: -1 }).limit(5);
        
        console.log('Recent Products:');
        products.forEach(p => {
            console.log(`ID: ${p._id}, Name: ${p.name}, Price: ${p.price}, UpdatedAt: ${p.updatedAt}`);
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

findRecentProduct();
