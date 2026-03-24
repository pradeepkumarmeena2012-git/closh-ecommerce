import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const categorySchema = new mongoose.Schema({
    name: String,
    image: String,
    isActive: Boolean
});

const Category = mongoose.model('Category', categorySchema);

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    const categories = await Category.find({ parentId: null, isActive: true });
    console.log(categories.map(c => ({ name: c.name, image: c.image })));
    await mongoose.disconnect();
}

run();
