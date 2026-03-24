import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

if (!serviceAccountPath) {
    console.warn('FIREBASE_SERVICE_ACCOUNT_PATH not found in .env. Push notifications will be disabled.');
} else {
    try {
        const absolutePath = path.isAbsolute(serviceAccountPath) 
            ? serviceAccountPath 
            : path.resolve(__dirname, '../../', serviceAccountPath);

        if (fs.existsSync(absolutePath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log('✅ Firebase Admin initialized successfully');
        } else {
            console.error(`❌ Firebase service account file not found at: ${absolutePath}`);
        }
    } catch (error) {
        console.error('❌ Error initializing Firebase Admin:', error);
    }
}

export default admin;
