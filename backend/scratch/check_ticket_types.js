import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const checkTicketTypes = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/closh');
        console.log('Connected to DB');

        const TicketType = mongoose.model('TicketType', new mongoose.Schema({}, { strict: false }));
        
        const count = await TicketType.countDocuments({});
        console.log(`Total TicketTypes: ${count}`);

        const types = await TicketType.find({});
        console.log('TicketTypes:');
        console.log(JSON.stringify(types, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
};

checkTicketTypes();
