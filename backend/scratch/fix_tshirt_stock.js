import dotenv from 'dotenv';
dotenv.config();
import connectDB from '../src/config/db.js';
import Product from '../src/models/Product.model.js';

const run = async () => {
    try {
        await connectDB();
        console.log('Connected to MongoDB');

        // Find all products that might match "tshirt" or "t-shirt"
        const products = await Product.find({ name: { $regex: /tshirt|t-shirt|shirt/i } });
        console.log(`Found ${products.length} products matching search.`);

        for (const p of products) {
            console.log(`\nProduct: "${p.name}" (_id: ${p._id})`);
            console.log(`StockQuantity: ${p.stockQuantity}, Stock Status: ${p.stock}`);
            console.log(`Variants:`, JSON.stringify(p.variants, null, 2));

            // Check if stockMap has size=m or m and it's 0 or missing, let's update it!
            if (p.variants) {
                let updated = false;
                const stockMap = p.variants.stockMap || {};

                // Let's print the keys in stockMap
                const keys = typeof stockMap.keys === 'function' ? Array.from(stockMap.keys()) : Object.keys(stockMap);
                console.log(`StockMap keys:`, keys);

                // Set variant stock of "m" or "size=m" or similar to 100
                // Let's update common keys: "m", "size=m", "M", "size=M"
                const keysToSet = ['m', 'size=m', 'M', 'size=M'];
                
                // Let's also check attributes and sizes to see what variants exist
                const sizes = p.variants.sizes || [];
                console.log(`Sizes defined:`, sizes);
                
                for (const k of keysToSet) {
                    if (stockMap instanceof Map) {
                        stockMap.set(k, 100);
                        updated = true;
                    } else if (typeof stockMap === 'object') {
                        stockMap[k] = 100;
                        updated = true;
                    }
                }

                // If sizes list is empty but it expects variants, let's ensure 'm' is in sizes
                if (sizes.length > 0 && !sizes.map(s => s.toLowerCase()).includes('m')) {
                    p.variants.sizes.push('m');
                    updated = true;
                }

                if (updated) {
                    p.variants.stockMap = stockMap;
                    p.markModified('variants');
                    p.markModified('variants.stockMap');
                    
                    // Update total stock quantity
                    p.stockQuantity = (p.stockQuantity || 0) + 100;
                    p.stock = 'in_stock';
                    
                    await p.save();
                    console.log(`Successfully updated stock for product "${p.name}"!`);
                }
            }
        }

        console.log('\nFinished checking and fixing product stocks.');
        process.exit(0);
    } catch (err) {
        console.error('Error running fix:', err);
        process.exit(1);
    }
};

run();
