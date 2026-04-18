import mongoose from 'mongoose';

const settlementSchema = new mongoose.Schema(
    {
        vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', index: true },
        deliveryBoyId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryBoy', index: true },
        type: { type: String, enum: ['vendor', 'rider'], default: 'vendor' },
        amount: { type: Number, required: true },
        method: { type: String, enum: ['bank_transfer', 'upi', 'cash', 'other'], default: 'bank_transfer' },
        referenceId: { type: String, trim: true, unique: true, sparse: true }, // Transaction ID
        notes: String,
        status: { type: String, enum: ['processing', 'completed', 'failed'], default: 'completed' },
        processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
        periodStart: Date,
        periodEnd: Date,
    },
    { timestamps: true }
);

const Settlement = mongoose.model('Settlement', settlementSchema);
export default Settlement;
