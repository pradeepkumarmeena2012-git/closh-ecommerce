import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI = (process.env.MONGO_URI || '').trim();
await mongoose.connect(MONGO_URI);

const Pincode = mongoose.model('Pincode', new mongoose.Schema({}, { strict: false, collection: 'pincodes' }));

const pincodes = await Pincode.find({}).select('pincode locality city serviceType isActive').limit(10).lean();

console.log('\n=== ALL PINCODES ===');
for (const p of pincodes) {
  console.log(`- ${p.pincode} (${p.locality || 'No Locality'}) in ${p.city} - Type: ${p.serviceType} - Active: ${p.isActive}`);
}
console.log('====================\n');

await mongoose.disconnect();
