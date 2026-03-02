import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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

        // Update Main Banner
        // Wait for updates to finish
        await Banner.findByIdAndUpdate("69a01ad9dcf6bdf749efa1c9", {
            title: "The SS24 Collection",
            subtitle: "Discover the new season's most coveted pieces, crafted with uncompromising attention to luxury and detail.",
            image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=2070"
        });

        // Update Side Banner
        await Banner.findByIdAndUpdate("69a01bc7dcf6bdf749efa20e", {
            title: "Luxe Essentials",
            subtitle: "Wardrobe Staples",
            image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=1000"
        });

        console.log('Banners updated successfully!');
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
