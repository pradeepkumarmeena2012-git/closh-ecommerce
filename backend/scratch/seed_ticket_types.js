import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import TicketType from '../src/models/TicketType.model.js';

const seedTicketTypes = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/closh');
        console.log('Connected to DB');

        const count = await TicketType.countDocuments({});
        if (count > 0) {
            console.log(`Collection already has ${count} ticket types. No seeding needed.`);
            return;
        }

        const defaultTypes = [
            { name: 'Orders & Delivery', description: 'Issues related to orders, dispatch, or rider delivery' },
            { name: 'Payments & Payouts', description: 'Questions or issues with payouts, sales commission, or earnings' },
            { name: 'Account & Profile', description: 'Problems logging in, updating profile details, or vendor settings' },
            { name: 'Technical Issue', description: 'Bugs, errors, or website performance issues' },
            { name: 'Product Listings', description: 'Trouble adding new products, attributes, inventory updates, or categories' },
            { name: 'Other', description: 'General inquiries or other issues not listed above' }
        ];

        console.log('Inserting default ticket types...');
        await TicketType.insertMany(defaultTypes);
        console.log('Seeding complete successfully.');

    } catch (err) {
        console.error('Error during seeding:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from DB');
    }
};

seedTicketTypes();
