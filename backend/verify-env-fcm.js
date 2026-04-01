
import 'dotenv/config';
import fs from 'fs';

const verify = () => {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!json) {
        console.error('❌ FIREBASE_SERVICE_ACCOUNT_JSON not found in .env');
        return;
    }

    try {
        const parsed = JSON.parse(json);
        console.log('✅ Successfully parsed FIREBASE_SERVICE_ACCOUNT_JSON');
        console.log('Project ID:', parsed.project_id);
    } catch (err) {
        console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', err.message);
        console.log('Start of string:', json.substring(0, 50));
    }
};

verify();
