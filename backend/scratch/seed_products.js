import dotenv from 'dotenv';
dotenv.config();
import connectDB from '../src/config/db.js';
import Vendor from '../src/models/Vendor.model.js';
import Category from '../src/models/Category.model.js';
import Product from '../src/models/Product.model.js';

const run = async () => {
    try {
        await connectDB();
        
        // Find a vendor
        const vendor = await Vendor.findOne({ status: 'approved' });
        if (!vendor) {
            console.error('No approved vendor found. Please seed a vendor first.');
            process.exit(1);
        }
        
        // Find categories
        const categories = await Category.find({}).limit(2);
        if (categories.length === 0) {
            console.error('No categories found. Please create categories first.');
            process.exit(1);
        }
        
        const cat1 = categories[0];
        const cat2 = categories.length > 1 ? categories[1] : categories[0];

        const products = [
            {
                name: 'Premium Cotton Shirt ' + Date.now().toString().slice(-4),
                slug: 'premium-cotton-shirt-' + Date.now(),
                description: 'High quality premium cotton shirt for everyday use.',
                price: 1200,
                originalPrice: 2000,
                discount: 40,
                categoryId: cat1._id,
                division: 'Men',
                vendorId: vendor._id,
                stockQuantity: 50,
                stock: 'in_stock',
                image: 'https://images.unsplash.com/photo-1596755094514-f87e32f85e23?w=800&q=80',
                isActive: true,
                isVisible: true,
                approvalStatus: 'approved'
            },
            {
                name: 'Elegant Summer Dress ' + Date.now().toString().slice(-4),
                slug: 'elegant-summer-dress-' + Date.now(),
                description: 'Beautiful summer dress perfect for evening parties.',
                price: 1500,
                originalPrice: 2500,
                discount: 40,
                categoryId: cat2._id,
                division: 'Women',
                vendorId: vendor._id,
                stockQuantity: 30,
                stock: 'in_stock',
                image: 'https://images.unsplash.com/photo-1572804013309-8c995f9fdc30?w=800&q=80',
                isActive: true,
                isVisible: true,
                approvalStatus: 'approved'
            }
        ];

        await Product.insertMany(products);
        console.log(`Seeded 2 products successfully in categories: ${cat1.name}, ${cat2.name}`);
        process.exit(0);
    } catch (err) {
        console.error('Error seeding products:', err);
        process.exit(1);
    }
};

run();
