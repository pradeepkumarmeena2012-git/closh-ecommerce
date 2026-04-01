import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
const dbUrl = process.env.MONGODB_URI || process.env.DB_URL || process.env.MONGO_URI;

mongoose.connect(dbUrl).then(async () => {
  const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
  const DeliveryBoy = mongoose.model('DeliveryBoy', new mongoose.Schema({}, { strict: false }));

  const order = await Order.findOne({ orderId: 'ORD-1774873481887-YDP4' });
  if (!order) { console.log('Order not found'); process.exit(1); }

  const riderEarnings = Number(order.shipping || 0);

  // Update order to delivered
  order.status = 'delivered';
  order.deliveredAt = new Date();
  order.deliveryOtpVerifiedAt = new Date();
  order.deliveryOtpHash = undefined;
  order.deliveryOtpExpiry = undefined;
  order.deliveryOtpDebug = undefined;
  order.deliveryOtpAttempts = 0;
  order.paymentStatus = 'paid';
  order.isCashSettled = false;
  if (order.deliveryFlow) order.deliveryFlow.phase = 'delivered';
  await order.save();
  console.log('Order updated to delivered');

  // Credit rider earnings
  if (order.deliveryBoyId) {
    const rider = await DeliveryBoy.findByIdAndUpdate(
      order.deliveryBoyId,
      { $inc: { totalDeliveries: 1, totalEarnings: riderEarnings, availableBalance: riderEarnings } },
      { new: true }
    );
    console.log('Rider updated:', rider?.name, 'Earnings added:', riderEarnings, 'New balance:', rider?.availableBalance);
  }

  console.log('Done!');
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
