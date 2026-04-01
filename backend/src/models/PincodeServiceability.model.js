import mongoose from 'mongoose';

const pincodeServiceabilitySchema = new mongoose.Schema(
    {
        pincode: { 
            type: String, 
            required: true, 
            unique: true, 
            trim: true,
            index: true 
        },
        serviceAreaId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'ServiceArea', 
            required: true,
            index: true
        },
        
        // Location details
        locality: String,
        subDistrict: String,
        district: String,
        
        // Coordinates for the pincode area (center point)
        coordinates: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point',
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                default: [0, 0],
            },
        },
        
        // Service availability
        isServiceable: { type: Boolean, default: true, index: true },
        serviceType: { 
            type: String, 
            enum: ['express', 'standard', 'next_day', 'unavailable'], 
            default: 'standard' 
        },
        
        // Delivery zone (for intra-city logistics optimization)
        deliveryZone: { type: String, trim: true }, // "Zone A", "Zone B", "North", "South", etc.
        hubId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryHub' }, // Future: delivery hub assignment
        
        // Override settings (optional - overrides service area defaults)
        customSettings: {
            deliveryFee: Number,
            deliveryTime: String, // "20-30 mins"
            minOrderAmount: Number,
            codAvailable: Boolean
        },
        
        // Verification and quality
        isVerified: { type: Boolean, default: false }, // Manually verified by admin
        lastVerified: Date,
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
        
        // Usage stats
        stats: {
            totalOrders: { type: Number, default: 0 },
            totalCustomers: { type: Number, default: 0 },
            lastOrderDate: Date
        },
        
        // Admin notes
        notes: String,
    },
    { timestamps: true }
);

// Create 2dsphere index for geospatial queries
pincodeServiceabilitySchema.index({ coordinates: '2dsphere' });

// Compound indexes
pincodeServiceabilitySchema.index({ serviceAreaId: 1, isServiceable: 1 });
pincodeServiceabilitySchema.index({ deliveryZone: 1, isServiceable: 1 });
pincodeServiceabilitySchema.index({ pincode: 1, isServiceable: 1 });

// Static method to check serviceability
pincodeServiceabilitySchema.statics.checkPincode = async function(pincode) {
    const result = await this.findOne({ pincode, isServiceable: true })
        .populate('serviceAreaId');
    
    return result;
};

// Method to get effective delivery settings
pincodeServiceabilitySchema.methods.getDeliverySettings = function() {
    const serviceArea = this.serviceAreaId;
    
    return {
        deliveryFee: this.customSettings?.deliveryFee ?? serviceArea?.deliverySettings?.deliveryFee ?? 40,
        deliveryTime: this.customSettings?.deliveryTime ?? serviceArea?.deliverySettings?.averageDeliveryTime ?? '30-45 mins',
        minOrderAmount: this.customSettings?.minOrderAmount ?? serviceArea?.deliverySettings?.minOrderAmount ?? 0,
        codAvailable: this.customSettings?.codAvailable ?? serviceArea?.deliverySettings?.codAvailable ?? true,
        freeDeliveryThreshold: serviceArea?.deliverySettings?.freeDeliveryThreshold ?? 500
    };
};

const PincodeServiceability = mongoose.model('PincodeServiceability', pincodeServiceabilitySchema);
export default PincodeServiceability;
