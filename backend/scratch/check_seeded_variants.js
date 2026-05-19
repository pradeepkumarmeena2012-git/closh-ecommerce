import dotenv from 'dotenv';
dotenv.config();
import connectDB from '../src/config/db.js';
import Product from '../src/models/Product.model.js';

const run = async () => {
    try {
        await connectDB();
        console.log('Connected to MongoDB');

        const products = await Product.find({ name: { $regex: /Ramesh|Suresh/i } });
        console.log(`Found ${products.length} products matching search.`);

        for (const p of products) {
            console.log(`\nProduct: "${p.name}" (_id: ${p._id})`);
            console.log(`Variants:`, JSON.stringify(p.variants, null, 2));
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

run();
