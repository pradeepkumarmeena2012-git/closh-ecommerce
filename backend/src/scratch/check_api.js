import mongoose from 'mongoose';
import { getDashboardSummary } from '../modules/delivery/controllers/order.controller.js';
import DeliveryBoy from '../models/DeliveryBoy.model.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGO_URI;

mongoose.connect(MONGODB_URI)
    .then(async () => {
        const adarsh = await DeliveryBoy.findOne({ name: /Adarsh/i });
        if (!adarsh) {
            console.log("Adarsh not found");
            process.exit(1);
        }

        // Mock req, res
        const req = {
            user: { id: adarsh._id.toString() },
            query: {}
        };

        const res = {
            statusCode: 200,
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(data) {
                console.log("RESPONSE JSON:");
                console.log(JSON.stringify({
                    recentOrdersCount: data?.data?.recentOrders?.length,
                    recentOrders: data?.data?.recentOrders,
                    activeReturnsCount: data?.data?.activeReturns?.length,
                    activeReturns: data?.data?.activeReturns
                }, null, 2));
                process.exit(0);
            }
        };

        console.log("Calling getDashboardSummary...");
        await getDashboardSummary(req, res, (err) => {
            console.error("Next called with error:", err);
            process.exit(1);
        });
    })
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
