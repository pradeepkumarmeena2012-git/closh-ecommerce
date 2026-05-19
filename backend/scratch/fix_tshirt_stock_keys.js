import dotenv from 'dotenv';
dotenv.config();
import connectDB from '../src/config/db.js';
import Product from '../src/models/Product.model.js';

const run = async () => {
    try {
        await connectDB();
        console.log('Connected to MongoDB');

        const product = await Product.findOne({ name: 'Tshirt' });
        if (!product) {
            console.error('Product "Tshirt" not found.');
            process.exit(1);
        }

        console.log(`Before update:`, JSON.stringify(product.variants, null, 2));

        if (product.variants) {
            const stockMap = product.variants.stockMap || {};

            // Ensure both formats exist in stockMap with plenty of stock
            const keysToSet = {
                's|': 100,
                'size=s': 100,
                'm|': 100,
                'size=m': 100,
                'l|': 100,
                'size=l': 100
            };

            for (const [k, val] of Object.entries(keysToSet)) {
                if (stockMap instanceof Map) {
                    stockMap.set(k, val);
                } else if (typeof stockMap === 'object') {
                    stockMap[k] = val;
                }
            }

            product.variants.stockMap = stockMap;
            product.markModified('variants');
            product.markModified('variants.stockMap');

            product.stockQuantity = 300;
            product.stock = 'in_stock';

            await product.save();
            console.log('\nSuccessfully updated Tshirt stockMap keys to align with price keys!');
            console.log(`After update:`, JSON.stringify(product.variants, null, 2));
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

run();
