import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Trim leading whitespace from MONGO_URI (env file has a leading space)
const MONGO_URI = (process.env.MONGO_URI || '').trim();
await mongoose.connect(MONGO_URI);

const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

const product = await Product.findOne({ isActive: true }).select('_id name price salePrice stockQuantity').lean();
const user = await User.findOne({}).select('_id email').lean();

console.log('\n=== TEST DATA ===');
console.log('Product ID :', product?._id);
console.log('Product    :', product?.name, '| Price: ₹' + (product?.salePrice || product?.price));
console.log('User ID    :', user?._id);
console.log('User Email :', user?.email);
console.log('================\n');

await mongoose.disconnect();
