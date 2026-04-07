const mongoose = require('mongoose');
require('./backend/src/models/Order.model.js');
require('./backend/src/models/DeliveryBoy.model.js');

async function check() {
  await mongoose.connect('mongodb://localhost:27017/closh');
  
  const rider = await mongoose.model('DeliveryBoy').findOne({ phone: '7879363299' });
  console.log('--- RIDER ---');
  if (rider) {
    console.log('ID:', rider._id);
    console.log('Name:', rider.name);
  } else {
    console.log('Not found');
  }

  const activeOrders = await mongoose.model('Order').find({ 
    status: { $in: ['assigned', 'picked_up', 'out_for_delivery'] } 
  }, 'orderId status deliveryBoyId').lean();

  console.log('\n--- ACTIVE ORDERS ---');
  activeOrders.forEach(o => {
    console.log(`Order: ${o.orderId}, Status: ${o.status}, AssignedTo: ${o.deliveryBoyId}`);
  });

  process.exit(0);
}

check().catch(err => { console.error(err); process.exit(1); });
