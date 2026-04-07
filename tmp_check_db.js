const mongoose = require('mongoose');

const DeliveryBoySchema = new mongoose.Schema({ phone: String, name: String });
const OrderSchema = new mongoose.Schema({ orderId: String, status: String, deliveryBoyId: mongoose.Schema.Types.ObjectId });

async function check() {
  await mongoose.connect('mongodb://localhost:27017/closh');
  const DeliveryBoy = mongoose.models.DeliveryBoy || mongoose.model('DeliveryBoy', DeliveryBoySchema);
  const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

  const rider = await DeliveryBoy.findOne({ phone: '7879363299' });
  console.log('--- RIDER ---');
  if (rider) {
    console.log('ID:', rider._id.toString());
    console.log('Name:', rider.name);
    
    const activeOrders = await Order.find({ 
      deliveryBoyId: rider._id,
      status: { $ne: 'delivered' }
    });
    console.log('\n--- HIS ASSIGNED ORDERS ---');
    activeOrders.forEach(o => console.log(`ID: ${o.orderId}, Status: ${o.status}`));

    const strayOrders = await Order.find({
        status: { $in: ['assigned', 'picked_up', 'out_for_delivery'] },
        deliveryBoyId: { $ne: rider._id }
    });
    console.log('\n--- ACTIVE ORDERS ASSIGNED TO OTHERS ---');
    strayOrders.forEach(o => console.log(`ID: ${o.orderId}, Status: ${o.status}, Rider: ${o.deliveryBoyId}`));

  } else {
    console.log('Rider 7879363299 not found');
  }
  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
