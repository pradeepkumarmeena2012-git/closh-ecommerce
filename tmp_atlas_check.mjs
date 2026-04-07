import mongoose from 'mongoose';

async function check() {
  const uri = "mongodb+srv://mayurchadokar14_db_user:sORqnMJxbSjnstzY@cluster0.ueig0du.mongodb.net/clouse";
  await mongoose.connect(uri);
  
  const Order = mongoose.connection.db.collection('orders');
  const orderId = "ORD-1775553272563-4H23";
  
  const order = await Order.findOne({ orderId: orderId });
  console.log('--- ORDER DATA ---');
  if (order) {
    console.log('ID:', order._id);
    console.log('Status:', order.status);
    console.log('DeliveryBoyId:', order.deliveryBoyId);
    console.log('Flow Phase:', order.deliveryFlow?.phase);
  } else {
    console.log('Order not found in Atlas');
  }

  const DeliveryBoy = mongoose.connection.db.collection('deliveryboys');
  const rider = await DeliveryBoy.findOne({ phone: '7879363299' });
  console.log('\n--- RIDER DATA ---');
  if (rider) {
    console.log('ID:', rider._id);
    console.log('Name:', rider.name);
  } else {
    console.log('Rider 7879363299 not found');
  }

  process.exit(0);
}

check();
