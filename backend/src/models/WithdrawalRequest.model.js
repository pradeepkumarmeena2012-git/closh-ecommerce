import mongoose from 'mongoose';

const withdrawalRequestSchema = new mongoose.Schema(
    {
        requesterId: { 
            type: mongoose.Schema.Types.ObjectId, 
            required: true, 
            refPath: 'requesterType',
            index: true
        },
        requesterType: { 
            type: String, 
            required: true, 
            enum: ['DeliveryBoy', 'Vendor'] 
        },
        requestType: {
            type: String,
            enum: ['withdrawal', 'settlement'],
            default: 'withdrawal',
            index: true
        },
        amount: { 
            type: Number, 
            required: true, 
            min: [1, 'Minimum withdrawal amount is 1']
        },
        bankDetails: {
            accountName: String,
            accountNumber: String,
            bankName: String,
            ifscCode: String,
            upiId: String
        },
        status: { 
            type: String, 
            enum: ['pending', 'approved', 'rejected', 'completed'], 
            default: 'pending',
            index: true
        },
        transactionId: String,
        adminNotes: String,
        processedAt: Date,
    },
    { timestamps: true }
);

// Index to quickly find the latest request for cooldown check
withdrawalRequestSchema.index({ requesterId: 1, createdAt: -1 });

const WithdrawalRequest = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);
export default WithdrawalRequest;
