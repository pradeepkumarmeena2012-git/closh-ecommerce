
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Settings from '../models/Settings.model.js';

dotenv.config();

const seedSettings = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const initialSettings = [
            {
                key: 'privacy_policy',
                value: `
                    <h1>Privacy Policy</h1>
                    <p>Welcome to our Privacy Policy page. We take your privacy seriously and are committed to protecting your personal data.</p>
                    <h3>1. Information We Collect</h3>
                    <p>We collect information that you provide to us directly, such as when you create an account, place an order, or contact us for support.</p>
                    <h3>2. How We Use Your Information</h3>
                    <p>We use your information to provide our services, process your orders, and communicate with you about your account and our products.</p>
                    <h3>3. Information Sharing</h3>
                    <p>We do not share your personal information with third parties except as necessary to provide our services or as required by law.</p>
                `
            },
            {
                key: 'terms_policy',
                value: `
                    <h1>Terms and Conditions</h1>
                    <p>Please read these Terms and Conditions carefully before using our website.</p>
                    <h3>1. Acceptance of Terms</h3>
                    <p>By accessing or using our website, you agree to be bound by these Terms and Conditions.</p>
                    <h3>2. Use of the Site</h3>
                    <p>You may use our site for lawful purposes only and in accordance with these Terms.</p>
                    <h3>3. Intellectual Property</h3>
                    <p>All content on this site is the property of Clouse and is protected by intellectual property laws.</p>
                `
            },
            {
                key: 'refund_policy',
                value: `
                    <h1>Refund Policy</h1>
                    <p>We want you to be completely satisfied with your purchase.</p>
                    <h3>1. Eligibility for Refunds</h3>
                    <p>Items may be eligible for a refund if they are returned in their original condition within 14 days of purchase.</p>
                    <h3>2. Non-Refundable Items</h3>
                    <p>Certain items, such as intimate apparel and final sale items, are not eligible for refunds.</p>
                    <h3>3. Refund Process</h3>
                    <p>To request a refund, please contact our support team with your order details.</p>
                `
            }
        ];

        for (const setting of initialSettings) {
            await Settings.findOneAndUpdate(
                { key: setting.key },
                { value: setting.value },
                { upsert: true, new: true }
            );
            console.log(`Seeded/Updated setting: ${setting.key}`);
        }

        console.log('Settings seeding completed!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding settings:', error);
        process.exit(1);
    }
};

seedSettings();
