import dotenv from 'dotenv';
dotenv.config();
import connectDB from '../src/config/db.js';
import Vendor from '../src/models/Vendor.model.js';
import Category from '../src/models/Category.model.js';
import Product from '../src/models/Product.model.js';

const run = async () => {
    try {
        await connectDB();
        console.log('Connected to MongoDB');

        // Find Ramesh and Suresh vendors
        const ramesh = await Vendor.findOne({ email: 'ramesh@example.com' });
        const suresh = await Vendor.findOne({ email: 'suresh@example.com' });

        if (!ramesh) {
            console.error('Ramesh vendor not found. Please seed vendors first.');
            process.exit(1);
        }
        if (!suresh) {
            console.error('Suresh vendor not found. Please seed vendors first.');
            process.exit(1);
        }

        // Find or create a default category if none exists
        let category = await Category.findOne({});
        if (!category) {
            console.log('No categories found. Creating a default "Fashion" category...');
            category = await Category.create({
                name: 'Fashion',
                slug: 'fashion',
                description: 'Fashion apparel and accessories',
                image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80',
                isActive: true
            });
        }

        // Clean existing seeded products for these specific vendors to keep db neat and prevent duplicates
        await Product.deleteMany({ vendorId: { $in: [ramesh._id, suresh._id] } });
        console.log('Cleaned existing products for Ramesh and Suresh.');

        const products = [
            {
                _id: '6a0b0d1b10c6eec7159c2a7a',
                name: 'Ramesh Premium Cotton Kurta 7735',
                slug: 'ramesh-premium-cotton-kurta-7735',
                description: 'Traditional style premium cotton Kurta by Ramesh Clothings Store.',
                price: 1499,
                originalPrice: 2499,
                discount: 40,
                categoryId: category._id,
                division: 'Men',
                vendorId: ramesh._id,
                stockQuantity: 300,
                stock: 'in_stock',
                image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80',
                isActive: true,
                isVisible: true,
                approvalStatus: 'approved',
                variants: {
                    defaultVariant: { size: "" },
                    sizes: ["XS", "S", "M"],
                    attributes: [],
                    prices: {
                        "size=xs": 1499,
                        "size=s": 1499,
                        "size=m": 1499
                    },
                    stockMap: {
                        "xs|": 100,
                        "size=xs": 100,
                        "s|": 100,
                        "size=s": 100,
                        "m|": 100,
                        "size=m": 100
                    },
                    imageMap: {},
                    defaultSelection: {}
                }
            },
            {
                _id: '6a0b0d1b10c6eec7159c2a7b',
                name: 'Suresh Designer Silk Saree 7735',
                slug: 'suresh-designer-silk-saree-7735',
                description: 'Exquisite designer silk saree perfect for weddings and festivals by Suresh Garments Store.',
                price: 3999,
                originalPrice: 5999,
                discount: 33,
                categoryId: category._id,
                division: 'Women',
                vendorId: suresh._id,
                stockQuantity: 300,
                stock: 'in_stock',
                image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80',
                isActive: true,
                isVisible: true,
                approvalStatus: 'approved',
                variants: {
                    defaultVariant: { size: "" },
                    sizes: ["XS", "S", "L"],
                    attributes: [],
                    prices: {
                        "size=xs": 3999,
                        "size=s": 3999,
                        "size=l": 3999
                    },
                    stockMap: {
                        "xs|": 100,
                        "size=xs": 100,
                        "s|": 100,
                        "size=s": 100,
                        "l|": 100,
                        "size=l": 100
                    },
                    imageMap: {},
                    defaultSelection: {}
                }
            }
        ];

        const inserted = await Product.create(products);
        console.log('\n--- SEEDED PRODUCTS SUCCESSFULLY ---');
        inserted.forEach(p => {
            console.log(`Product: "${p.name}" | Vendor: ${p.vendorId} | Price: ${p.price}`);
        });

        console.log('\nSeed process finished successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding products for Ramesh and Suresh:', err);
        process.exit(1);
    }
};

run();
