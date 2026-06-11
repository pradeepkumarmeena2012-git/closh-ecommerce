import mongoose from 'mongoose';

const cancellationReasonSchema = new mongoose.Schema({
    reason: {
        type: String,
        required: true,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const CancellationReason = mongoose.model('CancellationReason', cancellationReasonSchema);
export default CancellationReason;
