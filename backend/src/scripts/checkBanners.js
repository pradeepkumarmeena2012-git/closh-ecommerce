import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/appzeto';

mongoose.connect(MONGO_URI)
    .then(async () => {
        const bannerSchema = new mongoose.Schema({
            title: String,
            subtitle: String,
            image: String,
            type: String,
        }, { strict: false });

        const Banner = mongoose.models.Banner || mongoose.model('Banner', bannerSchema);
        const banners = await Banner.find({});
        fs.writeFileSync(path.join(__dirname, 'banners_out.json'), JSON.stringify(banners, null, 2));
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
