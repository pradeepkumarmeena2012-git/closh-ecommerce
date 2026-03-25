import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!serviceAccountJson && !serviceAccountPath) {
    console.warn('⚠️ Firebase credentials not found in .env (JSON or Path). Push notifications will be disabled.');
} else {
    try {
        let serviceAccount;

        if (serviceAccountJson) {
            // Priority 1: Use raw JSON string from .env
            serviceAccount = JSON.parse(serviceAccountJson);
        } else if (serviceAccountPath) {
            // Priority 2: Use file path
            const absolutePath = path.isAbsolute(serviceAccountPath) 
                ? serviceAccountPath 
                : path.resolve(__dirname, '../../', serviceAccountPath);

            if (fs.existsSync(absolutePath)) {
                serviceAccount = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
            } else {
                throw new Error(`Service account file not found at: ${absolutePath}`);
            }
        }

        if (serviceAccount) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: process.env.FIREBASE_DATABASE_URL
            });
            console.log('✅ Firebase Admin initialized successfully');
        }
    } catch (error) {
        console.error('❌ Error initializing Firebase Admin:', error.message);
    }
}

const db = admin.apps.length ? admin.database() : null;

export { db };
export default admin;



