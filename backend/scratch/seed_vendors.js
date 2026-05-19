import dotenv from 'dotenv';
dotenv.config();
import connectDB from '../src/config/db.js';
import Vendor from '../src/models/Vendor.model.js';
import mongoose from 'mongoose';

const run = async () => {
    try {
        await connectDB();
        const vendors = [
            {
                name: 'Ramesh Clothings',
                email: 'ramesh@example.com',
                password: 'password123', // Model hashes this automatically on save, wait! insertMany bypasses pre-save hooks! We should use create or save.
            },
            {
                name: 'Suresh Garments',
                email: 'suresh@example.com',
                password: 'password123',
            }
        ];

        for (let v of vendors) {
            const vendor = new Vendor({
                name: v.name,
                email: v.email,
                password: v.password,
                phone: '9876543210',
                storeName: v.name + ' Store',
                status: 'approved',
                isVerified: true,
                shopLocation: {
                    type: 'Point',
                    coordinates: [77.2090, 28.6139] // New Delhi
                }
            });
            await vendor.save();
            console.log(`Created vendor: ${vendor.email}`);
        }

        console.log('2 Vendors seeded successfully');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding vendors:', err);
        process.exit(1);
    }
};

run();
