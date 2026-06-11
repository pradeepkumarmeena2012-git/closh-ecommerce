import mongoose from 'mongoose';

const enquirySchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    deliveryBoyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DeliveryBoy',
        required: true
    },
    reasonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CancellationReason'
    },
    reasonText: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    adminRemarks: {
        type: String,
        trim: true
    }
}, { timestamps: true });

const Enquiry = mongoose.model('Enquiry', enquirySchema);
export default Enquiry;
