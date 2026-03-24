import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const categorySchema = new mongoose.Schema({
    name: String,
    image: String,
    isActive: Boolean
});

const Category = mongoose.model('Category', categorySchema);

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    const categories = await Category.find({}); // All
    fs.writeFileSync('output.json', JSON.stringify(categories, null, 2));
    await mongoose.disconnect();
}

run();
