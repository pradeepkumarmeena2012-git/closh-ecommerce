import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI = (process.env.MONGO_URI || '').trim();
await mongoose.connect(MONGO_URI);

// Use the exact same model as the app
const pincodeServiceabilitySchema = new mongoose.Schema({}, { strict: false });
const PincodeServiceability = mongoose.model('PincodeServiceability', pincodeServiceabilitySchema);

const ServiceArea = mongoose.model('ServiceArea', new mongoose.Schema({}, { strict: false, collection: 'serviceareas' }));

const indoreArea = await ServiceArea.findOne({ name: /indore/i, isActive: true });
console.log('Indore Service Area:', indoreArea ? indoreArea.name : 'NOT FOUND');

if (!indoreArea) {
  console.log('❌ No Indore service area found!');
  await mongoose.disconnect();
  process.exit(1);
}

// Add both pincodes: 452001 (Indore city) and 453331 (Rau)
const pincodes = ['452001', '453331'];

for (const pin of pincodes) {
  const existing = await PincodeServiceability.findOne({ pincode: pin });
  if (existing) {
    console.log(`✅ Pincode ${pin} already exists (isServiceable: ${existing.isServiceable})`);
  } else {
    await PincodeServiceability.create({
      pincode: pin,
      serviceAreaId: indoreArea._id,
      locality: pin === '452001' ? 'South Tukoganj' : 'Rau',
      district: 'Indore',
      isServiceable: true,
      serviceType: 'standard',
      deliveryZone: 'zone_1',
      coordinates: { type: 'Point', coordinates: [75.8577, 22.7196] },
    });
    console.log(`✅ Pincode ${pin} ADDED successfully!`);
  }
}

// Verify
const allPins = await PincodeServiceability.find({}).select('pincode isServiceable locality').lean();
console.log('\n=== All Pincodes in DB ===');
allPins.forEach(p => console.log(`  ${p.pincode} - ${p.locality} (serviceable: ${p.isServiceable})`));
console.log('=========================\n');

await mongoose.disconnect();
