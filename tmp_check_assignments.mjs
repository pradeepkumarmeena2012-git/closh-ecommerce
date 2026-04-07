import mongoose from 'mongoose';
import './backend/src/models/Order.model.js';
import './backend/src/models/DeliveryBoy.model.js';

async function check() {
  try {
    await mongoose.connect('mongodb://localhost:27017/closh');
    
    // We can't import directly if ESM is weird, but we can try to find them
    const Order = mongoose.model('Order');
    const DeliveryBoy = mongoose.model('DeliveryBoy');
    
    const rider = await DeliveryBoy.findOne({ phone: '7879363299' });
    console.log('--- RIDER ---');
    if (rider) {
      console.log('ID:', rider._id);
      console.log('Name:', rider.name);
    } else {
      console.log('Not found');
    }

    const activeOrders = await Order.find({ 
      status: { $in: ['assigned', 'picked_up', 'out_for_delivery'] } 
    }, 'orderId status deliveryBoyId').lean();

    console.log('\n--- ACTIVE ORDERS ---');
    activeOrders.forEach(o => {
      console.log(`Order: ${o.orderId}, Status: ${o.status}, AssignedTo: ${o.deliveryBoyId}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
