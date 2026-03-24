import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const categorySchema = new mongoose.Schema({
    name: String,
    image: String,
    isActive: Boolean,
    parentId: mongoose.Schema.Types.ObjectId
});

const Category = mongoose.model('Category', categorySchema);

async function checkCategories() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const categories = await Category.find({});
        console.log(JSON.stringify(categories, null, 2));
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkCategories();
