import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import { User } from '../src/models/User.model.js';
import DeliveryBoy from '../src/models/DeliveryBoy.model.js';
import { Order } from '../src/models/Order.model.js';
import Vendor from '../src/models/Vendor.model.js';
import Product from '../src/models/Product.model.js';

const seedOrder = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const mobile = "7879363299";

        // Find user and delivery boy
        const user = await User.findOne({ phone: mobile });
        const deliveryBoy = await DeliveryBoy.findOne({ phone: mobile });

        if (!user || !deliveryBoy) {
            console.error("❌ User or Delivery Boy with mobile 7879363299 not found. Run seed_harsh.js first.");
            process.exit(1);
        }

        // Get a random product and vendor if available
        let product = await Product.findOne();
        let vendor = await Vendor.findOne();
        
        let productId = product ? product._id : new mongoose.Types.ObjectId();
        let vendorId = vendor ? vendor._id : new mongoose.Types.ObjectId();
        let productName = product ? product.name : "Test T-Shirt";
        let vendorName = vendor ? vendor.storeName : "Test Store";

        const orderId = `ORD-TEST-${Math.floor(100000 + Math.random() * 900000)}`;

        const newOrder = new Order({
            orderId: orderId,
            userId: user._id,
            deliveryBoyId: deliveryBoy._id,
            orderType: 'check_and_buy',
            deliveryType: 'online',
            paymentMethod: 'cod',
            paymentStatus: 'paid',
            codCollectionMethod: 'cash',
            status: 'delivered',
            subtotal: 500,
            shipping: 50,
            tax: 25,
            total: 575,
            shippingAddress: {
                name: user.name,
                phone: user.phone,
                address: "123 Test Street, Apartment 4",
                city: "Indore",
                state: "Madhya Pradesh",
                zipCode: "452001",
                country: "India"
            },
            items: [
                {
                    productId: productId,
                    vendorId: vendorId,
                    name: productName,
                    image: product && product.images && product.images.length ? product.images[0].url : "https://via.placeholder.com/150",
                    price: 500,
                    quantity: 1,
                    basePrice: 500,
                }
            ],
            vendorItems: [
                {
                    vendorId: vendorId,
                    vendorName: vendorName,
                    status: 'delivered',
                    items: [
                        {
                            productId: productId,
                            name: productName,
                            price: 500,
                            quantity: 1,
                        }
                    ],
                    subtotal: 500,
                    shipping: 50,
                    tax: 25,
                }
            ],
            deliveryFlow: {
                phase: 'delivered',
                startedAt: new Date(Date.now() - 3600000),
                arrivedAt: new Date(Date.now() - 1800000),
                paymentMethod: 'cash',
                paymentCollected: true,
                originalAmount: 575,
                finalAmount: 575,
                paymentCollectedAt: new Date(),
                otpVerified: true,
                otpVerifiedAt: new Date(),
            },
            assignedAt: new Date(Date.now() - 7200000),
            riderAcceptedAt: new Date(Date.now() - 7100000),
            pickedUpAt: new Date(Date.now() - 3600000),
            deliveredAt: new Date(),
            codCollectedAt: new Date(),
        });

        await newOrder.save();
        console.log(`✅ Order ${orderId} seeded successfully for user and delivery boy.`);
        process.exit(0);

    } catch (error) {
        console.error("❌ Error seeding order:", error);
        process.exit(1);
    }
};

seedOrder();
