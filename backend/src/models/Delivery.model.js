import mongoose from 'mongoose';

const TryAndBuySchema = new mongoose.Schema({
  enabled: { type: Boolean, default: true },
  acceptedItems: [{ type: mongoose.Schema.Types.ObjectId }], // References to product or variant IDs inside the order
  rejectedItems: [{ type: mongoose.Schema.Types.ObjectId }]
}, { _id: false });

const PaymentSchema = new mongoose.Schema({
  method: { type: String, enum: ['cod', 'online', 'qr'], default: 'cod' },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  isCashCollected: { type: Boolean, default: false },
  originalAmount: { type: Number, required: true },
  recalculatedAmount: { type: Number }
}, { _id: false });

const DeliverySchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deliveryBoyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryBatch' },
  
  status: { 
    type: String, 
    enum: ['assigned', 'picked_up', 'out_for_delivery', 'arrived', 'try_and_buy', 'payment_pending', 'delivered', 'cancelled'],
    default: 'assigned'
  },
  
  pickupCompleted: { type: Boolean, default: false },
  deliveryStarted: { type: Boolean, default: false },
  arrivedAtCustomer: { type: Boolean, default: false },
  otpVerified: { type: Boolean, default: false },
  
  tryAndBuy: { type: TryAndBuySchema, default: () => ({}) },
  payment: { type: PaymentSchema, required: true },
  
  // Proofs
  packagePhoto: { type: String }, 
  sealedBoxPhoto: { type: String }, 
  openBoxPhoto: { type: String }, 
  deliveryProofPhoto: { type: String },
  
  // Time tracking
  assignedAt: { type: Date, default: Date.now },
  pickedUpAt: { type: Date },
  outForDeliveryAt: { type: Date },
  arrivedAt: { type: Date },
  deliveredAt: { type: Date }
}, { timestamps: true });

const Delivery = mongoose.model('Delivery', DeliverySchema);
export default Delivery;
