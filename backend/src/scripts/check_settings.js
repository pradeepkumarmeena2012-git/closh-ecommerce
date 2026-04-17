
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const SettingsSchema = new mongoose.Schema({
    key: String,
    value: mongoose.Schema.Types.Mixed
});

const Settings = mongoose.model('Settings', SettingsSchema);

async function checkSettings() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
        
        const settings = await Settings.find({});
        console.log('All Settings keys found:', settings.map(s => s.key));
        
        const contentSetting = settings.find(s => s.key === 'content');
        if (contentSetting) {
            console.log('Content Settings Value:');
            console.log(JSON.stringify(contentSetting.value, null, 2));
        }

        const termsPolicy = settings.find(s => s.key === 'terms_policy');
        if (termsPolicy) {
            console.log('Terms Policy (Top Level):', termsPolicy.value.substring(0, 100) + '...');
        }
        
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkSettings();
