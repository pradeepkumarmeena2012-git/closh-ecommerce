import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Review from './backend/src/models/Review.model.js';

dotenv.config({ path: './backend/.env' });

const checkReviews = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        const count = await Review.countDocuments();
        console.log(`Total reviews in DB: ${count}`);
        
        if (count > 0) {
            const reviews = await Review.find().limit(5).lean();
            console.log('Sample reviews:', JSON.stringify(reviews, null, 2));
        }
        
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
};

checkReviews();
