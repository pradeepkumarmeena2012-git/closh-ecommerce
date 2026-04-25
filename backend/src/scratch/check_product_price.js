import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function checkProduct() {
    try {
        if (!MONGO_URI) {
            console.error('MONGO_URI not found in .env');
            return;
        }
        await mongoose.connect(MONGO_URI);
        const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
        
        // Search by ID or Name
        let product = await Product.findById('69d667caf8c242c348dfb529');
        
        if (!product) {
             // Try searching by name if ID fails, maybe the ID was slightly wrong in transcription
             console.log('ID not found, searching recent products...');
             const recent = await Product.find().sort({ updatedAt: -1 }).limit(10);
             recent.forEach(p => console.log(`ID: ${p._id}, Name: ${p.name}, Price: ${p.price}`));
             return;
        }

        console.log('Product Found:');
        console.log('Name:', product.name);
        console.log('Base Price:', product.price);
        console.log('Original Price:', product.originalPrice);
        console.log('Variants Prices:', JSON.stringify(product.variants?.prices, null, 2));
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkProduct();
