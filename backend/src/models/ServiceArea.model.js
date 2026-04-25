import mongoose from 'mongoose';

const businessHoursSchema = new mongoose.Schema({
    day: { 
        type: String, 
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        required: true
    },
    openTime: { type: String, default: '09:00' }, // "HH:MM" format
    closeTime: { type: String, default: '21:00' },
    isOpen: { type: Boolean, default: true }
}, { _id: false });

const serviceAreaSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true, trim: true, index: true }, // e.g., "Jaipur"
        state: { type: String, required: true, trim: true },
        country: { type: String, default: 'India' },
        
        // Geographic data (center point of the city)
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

        // Geofencing boundaries (Polygon)
        boundaries: {
            type: {
                type: String,
                enum: ['Polygon'],
            },
            coordinates: {
                type: [[[Number]]], // Array of points [lng, lat]
            },
        },
        isStrictBoundary: { type: Boolean, default: false },
        
        // Service configuration
        isActive: { type: Boolean, default: true, index: true },
        serviceType: { 
            type: String, 
            enum: ['full', 'limited', 'coming_soon'], 
            default: 'full',
            index: true
        },
        
        // Zone-specific delivery settings
        deliverySettings: {
            minOrderAmount: { type: Number, default: 0 },
            deliveryFee: { type: Number, default: 40 },
            freeDeliveryThreshold: { type: Number, default: 500 },
            averageDeliveryTime: { type: String, default: '30-45 mins' },
            maxDeliveryRadius: { type: Number, default: 10 }, // km
            expressDeliveryAvailable: { type: Boolean, default: false },
            expressDeliveryFee: { type: Number, default: 80 },
            codAvailable: { type: Boolean, default: true }
        },
        
        // Business hours
        businessHours: [businessHoursSchema],
        
        // Metadata
        launchDate: { type: Date, default: Date.now },
        estimatedLaunchDate: Date, // For "coming_soon" areas
        displayMessage: String, // Custom message for users in this area
        alternativeMessage: String, // Message for unavailable areas nearby
        
        // Display info
        displayOrder: { type: Number, default: 0 }, // For sorting in dropdowns
        icon: String, // URL to city icon/image
        
        // Stats (denormalized for quick access)
        stats: {
            totalOrders: { type: Number, default: 0 },
            totalCustomers: { type: Number, default: 0 },
            totalVendors: { type: Number, default: 0 },
            activeDeliveryPartners: { type: Number, default: 0 },
            averageRating: { type: Number, default: 0 }
        },
        
        // Admin notes
        notes: String,
    },
    { timestamps: true }
);

// Middleware to remove empty boundaries before saving
const cleanEmptyBoundaries = function(next) {
    const doc = this._update || this;
    
    // Check for boundaries in updates or document
    if (doc.boundaries) {
        if (!doc.boundaries.coordinates || 
            doc.boundaries.coordinates.length === 0 || 
            (Array.isArray(doc.boundaries.coordinates[0]) && doc.boundaries.coordinates[0].length === 0)) {
            
            if (this._update) {
                // For findOneAndUpdate
                this._update.$unset = this._update.$unset || {};
                this._update.$unset.boundaries = "";
                delete this._update.boundaries;
            } else {
                // For save
                this.boundaries = undefined;
            }
        }
    }
    next();
};

serviceAreaSchema.pre('save', cleanEmptyBoundaries);
serviceAreaSchema.pre('findOneAndUpdate', cleanEmptyBoundaries);
serviceAreaSchema.pre('updateMany', cleanEmptyBoundaries);
serviceAreaSchema.pre('updateOne', cleanEmptyBoundaries);

// Create 2dsphere index for geospatial queries
serviceAreaSchema.index({ coordinates: '2dsphere' });

// Compound indexes for common queries
serviceAreaSchema.index({ isActive: 1, serviceType: 1 });
serviceAreaSchema.index({ name: 1, state: 1 });

// Virtual for full display name
serviceAreaSchema.virtual('displayName').get(function() {
    return `${this.name}, ${this.state}`;
});

// Method to check if currently open
serviceAreaSchema.methods.isCurrentlyOpen = function() {
    if (this.serviceType !== 'full') return false;
    
    const now = new Date();
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const todayHours = this.businessHours.find(bh => bh.day === dayName);
    if (!todayHours || !todayHours.isOpen) return false;
    
    return currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
};

// Ensure virtuals are included in JSON
serviceAreaSchema.set('toJSON', { virtuals: true });
serviceAreaSchema.set('toObject', { virtuals: true });

const ServiceArea = mongoose.model('ServiceArea', serviceAreaSchema);
export default ServiceArea;
