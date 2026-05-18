
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

import Admin from '../models/Admin.model.js';
import Vendor from '../models/Vendor.model.js';
import DeliveryBoy from '../models/DeliveryBoy.model.js';
import User from '../models/User.model.js';
import Category from '../models/Category.model.js';
import Product from '../models/Product.model.js';

const seedFullSystem = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // 1. ADMIN
        const adminEmail = 'admin@closh.com';
        await Admin.findOneAndUpdate(
            { email: adminEmail },
            { name: 'Super Admin', password: 'admin123', role: 'superadmin', isActive: true },
            { upsert: true, new: true }
        );
        console.log(`✅ Admin: ${adminEmail} / admin123`);

        // 2. VENDOR
        const vendorEmail = 'vendor@vendor.com';
        const vendor = await Vendor.findOneAndUpdate(
            { email: vendorEmail },
            { 
                name: 'Test Vendor', 
                password: 'vendor123', 
                phone: '1234567890', 
                storeName: 'Vendor Store', 
                status: 'approved', 
                isVerified: true 
            },
            { upsert: true, new: true }
        );
        console.log(`✅ Vendor: ${vendorEmail} / vendor123`);

        // 3. DELIVERY
        const driverPhone = '7894561230';
        await DeliveryBoy.findOneAndUpdate(
            { phone: driverPhone },
            { 
                name: 'Test Delivery Boy', 
                email: 'driver@driver.com', 
                password: 'driver123', 
                applicationStatus: 'approved', 
                isActive: true, 
                isAvailable: true 
            },
            { upsert: true, new: true }
        );
        console.log(`✅ Delivery: ${driverPhone} / 123456 (fixed OTP)`);

        // 4. USER
        const userPhone = '1234567890';
        await User.findOneAndUpdate(
            { phone: userPhone },
            { 
                name: 'Test Customer', 
                email: 'user@test.com', 
                password: 'password123', 
                role: 'customer', 
                isVerified: true, 
                isActive: true 
            },
            { upsert: true, new: true }
        );
        console.log(`✅ User: ${userPhone} / 123456 (fixed OTP)`);

        // 5. CATEGORIES & SUBCATEGORIES
        // Category 1: Fashion
        const cat1 = await Category.findOneAndUpdate(
            { slug: 'fashion' },
            { name: 'Fashion', slug: 'fashion', isActive: true },
            { upsert: true, new: true }
        );
        const subCat1 = await Category.findOneAndUpdate(
            { slug: 't-shirts', parentId: cat1._id },
            { name: 'T-Shirts', slug: 't-shirts', parentId: cat1._id, isActive: true },
            { upsert: true, new: true }
        );
        console.log('✅ Categories: Fashion > T-Shirts');

        // Category 2: Footwear
        const cat2 = await Category.findOneAndUpdate(
            { slug: 'footwear' },
            { name: 'Footwear', slug: 'footwear', isActive: true },
            { upsert: true, new: true }
        );
        const subCat2 = await Category.findOneAndUpdate(
            { slug: 'sneakers', parentId: cat2._id },
            { name: 'Sneakers', slug: 'sneakers', parentId: cat2._id, isActive: true },
            { upsert: true, new: true }
        );
        console.log('✅ Categories: Footwear > Sneakers');

        // 6. PRODUCTS
        // Product 1
        await Product.findOneAndUpdate(
            { slug: 'classic-cotton-tshirt' },
            {
                name: 'Classic Cotton T-Shirt',
                slug: 'classic-cotton-tshirt',
                description: 'High quality 100% cotton T-shirt for everyday wear.',
                price: 499,
                originalPrice: 999,
                discount: 50,
                categoryId: subCat1._id,
                vendorId: vendor._id,
                image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1000&auto=format&fit=crop',
                images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1000&auto=format&fit=crop'],
                stock: 'in_stock',
                stockQuantity: 100,
                isActive: true,
                isVisible: true,
                approvalStatus: 'approved'
            },
            { upsert: true, new: true }
        );

        // Product 2
        await Product.findOneAndUpdate(
            { slug: 'urban-white-sneakers' },
            {
                name: 'Urban White Sneakers',
                slug: 'urban-white-sneakers',
                description: 'Stylish and comfortable sneakers for the urban lifestyle.',
                price: 1999,
                originalPrice: 3999,
                discount: 50,
                categoryId: subCat2._id,
                vendorId: vendor._id,
                image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1000&auto=format&fit=crop',
                images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1000&auto=format&fit=crop'],
                stock: 'in_stock',
                stockQuantity: 50,
                isActive: true,
                isVisible: true,
                approvalStatus: 'approved'
            },
            { upsert: true, new: true }
        );
        console.log('✅ Products: T-Shirt & Sneakers seeded for Vendor');

        console.log('\n🚀 ALL SYSTEM DATA SEEDED SUCCESSFULLY!');
    } catch (err) {
        console.error('❌ Full Seed failed:', err.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

seedFullSystem();
