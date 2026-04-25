import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function fixProductPrice() {
    try {
        if (!MONGO_URI) {
            console.error('MONGO_URI not found in .env');
            return;
        }
        await mongoose.connect(MONGO_URI);
        const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
        
        const productId = '69d667caf8c242c348dfb529';
        const product = await Product.findById(productId);
        
        if (!product) {
            console.log('Product not found');
            return;
        }

        console.log('Before Fix:');
        console.log('Base Price:', product.price);
        console.log('Variant Prices:', JSON.stringify(product.variants?.prices, null, 2));

        const newPrice = 700; // As per user's update
        
        const nextVariants = { ...product.variants };
        if (nextVariants.prices) {
            // Convert Map entries or Object entries
            const pricesObj = nextVariants.prices instanceof Map 
                ? Object.fromEntries(nextVariants.prices)
                : nextVariants.prices;
            
            Object.keys(pricesObj).forEach(key => {
                pricesObj[key] = newPrice;
            });
            
            nextVariants.prices = pricesObj;
        }

        await Product.findByIdAndUpdate(productId, { 
            price: newPrice,
            variants: nextVariants,
            updatedAt: new Date()
        });

        console.log('Product fixed successfully');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

fixProductPrice();
