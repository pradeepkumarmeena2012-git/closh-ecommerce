import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import User from './src/models/User.model.js';
import { createNotification } from './src/services/notification.service.js';

const testUserEmail = 'isha@example.com'; 

async function sendTestNotification() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const user = await User.findOne({ email: testUserEmail });
        if (!user) {
            console.log(`User with email ${testUserEmail} not found!`);
            return;
        }

        console.log(`Sending test notification to ${user.name} (${user._id})`);
        
        const notification = await createNotification({
            recipientId: user._id,
            recipientType: 'user',
            title: 'Admin Test Alert! 🚀',
            message: 'Hello! This is a test push notification from the Admin panel.',
            type: 'broadcast',
            data: { test: true }
        });

        console.log('Notification created and push triggered!');
        console.log(notification);

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error in test script:', err);
    }
}

sendTestNotification();
