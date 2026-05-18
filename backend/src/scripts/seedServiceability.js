
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

import ServiceArea from '../models/ServiceArea.model.js';
import PincodeServiceability from '../models/PincodeServiceability.model.js';

const seedServiceability = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Create a Default Service Area
        let serviceArea = await ServiceArea.findOne({ name: 'Jaipur' });
        
        if (!serviceArea) {
            serviceArea = await ServiceArea.create({
                name: 'Jaipur',
                state: 'Rajasthan',
                isActive: true,
                serviceType: 'full',
                deliverySettings: {
                    minOrderAmount: 0,
                    deliveryFee: 40,
                    freeDeliveryThreshold: 500,
                    averageDeliveryTime: '30-45 mins',
                    maxDeliveryRadius: 50,
                    codAvailable: true
                },
                businessHours: [
                    { day: 'Monday', isOpen: true },
                    { day: 'Tuesday', isOpen: true },
                    { day: 'Wednesday', isOpen: true },
                    { day: 'Thursday', isOpen: true },
                    { day: 'Friday', isOpen: true },
                    { day: 'Saturday', isOpen: true },
                    { day: 'Sunday', isOpen: true }
                ]
            });
            console.log('✅ Created Service Area: Jaipur');
        }

        // 2. Add Serviceable Pincodes
        const testPincodes = ['302001', '302012', '302020', '123456', '452001', '302017'];
        
        for (const pin of testPincodes) {
            const existing = await PincodeServiceability.findOne({ pincode: pin });
            if (!existing) {
                await PincodeServiceability.create({
                    pincode: pin,
                    serviceAreaId: serviceArea._id,
                    locality: 'Main City Area',
                    district: 'Jaipur',
                    isServiceable: true,
                    serviceType: 'standard'
                });
                console.log(`✅ Added Pincode: ${pin}`);
            } else {
                existing.isServiceable = true;
                existing.serviceAreaId = serviceArea._id;
                await existing.save();
                console.log(`✅ Updated Pincode: ${pin}`);
            }
        }

        console.log('🚀 Serviceability seeding completed!');
    } catch (err) {
        console.error('❌ Seed failed:', err.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

seedServiceability();
