
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

import Product from '../models/Product.model.js';

const fixStock = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const products = await Product.find({});
        console.log(`Found ${products.length} products. Fixing stock...`);

        for (const product of products) {
            let updated = false;

            // 1. Fix base stock
            if (product.stockQuantity < 100) {
                product.stockQuantity = 100;
                product.stock = 'in_stock';
                updated = true;
            }

            // 2. Fix variants stock
            if (product.variants && product.variants.prices) {
                const variantKeys = Array.from(product.variants.prices.keys());
                
                if (!product.variants.stockMap) {
                    product.variants.stockMap = new Map();
                }

                for (const key of variantKeys) {
                    const currentStock = product.variants.stockMap.get(key);
                    if (currentStock === undefined || currentStock < 10) {
                        product.variants.stockMap.set(key, 100);
                        updated = true;
                        console.log(`   📦 Fixed variant stock for [${key}] of ${product.name}`);
                    }
                }
            }

            if (updated) {
                await product.save();
                console.log(`✅ Updated stock for: ${product.name}`);
            }
        }

        console.log('\n🚀 ALL PRODUCT STOCK FIXED SUCCESSFULLY!');
    } catch (err) {
        console.error('❌ Fix failed:', err.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

fixStock();
