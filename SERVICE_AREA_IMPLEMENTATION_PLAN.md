# Service Area / Zone Management - Implementation Plan

## 📋 Overview
Implement a comprehensive service area management system where admins can define which cities/zones the app serves. Users logging in from unserviced areas will see an appropriate message.

---

## 🎯 Features Required

### Admin Features
1. **Service Area Management**
   - Create/Edit/Delete service areas (cities)
   - Enable/Disable specific service areas
   - View statistics per service area
   - Bulk import cities via CSV
   - Set delivery zones within cities

2. **Zone Configuration**
   - Define delivery zones by pincode ranges
   - Set zone-specific delivery fees
   - Assign delivery partners to zones
   - Configure service availability hours per zone

### User Features
1. **Location Detection**
   - Auto-detect user location on login/registration
   - Allow manual city/pincode selection
   - Show "Service Not Available" message for unserviced areas
   - Suggest nearest serviced location
   - Remember user's selected location

2. **Service Availability Check**
   - Check during registration
   - Check during address addition
   - Check during checkout
   - Real-time availability status

---

## 🗂️ Database Schema

### 1. ServiceArea Model (New)
```javascript
// backend/src/models/ServiceArea.model.js
const serviceAreaSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }, // e.g., "Jaipur"
    state: { type: String, required: true },
    country: { type: String, default: 'India' },
    
    // Geographic data
    coordinates: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] } // [lng, lat]
    },
    
    // Service configuration
    isActive: { type: Boolean, default: true },
    serviceType: { 
        type: String, 
        enum: ['full', 'limited', 'coming_soon'], 
        default: 'full' 
    },
    
    // Zone-specific settings
    deliverySettings: {
        minOrderAmount: { type: Number, default: 0 },
        deliveryFee: { type: Number, default: 0 },
        freeDeliveryThreshold: { type: Number, default: 500 },
        averageDeliveryTime: { type: String, default: '30-45 mins' },
        maxDeliveryRadius: { type: Number, default: 10 } // km
    },
    
    // Business hours
    businessHours: [{
        day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
        openTime: String, // "09:00"
        closeTime: String, // "21:00"
        isOpen: { type: Boolean, default: true }
    }],
    
    // Metadata
    launchDate: Date,
    estimatedLaunchDate: Date, // For "coming_soon" areas
    displayMessage: String, // Custom message for users in this area
    alternativeMessage: String, // Message for unavailable areas nearby
    
    // Stats (denormalized for quick access)
    stats: {
        totalOrders: { type: Number, default: 0 },
        totalCustomers: { type: Number, default: 0 },
        activeDeliveryPartners: { type: Number, default: 0 }
    }
}, { timestamps: true });

// Index for geospatial queries
serviceAreaSchema.index({ coordinates: '2dsphere' });
serviceAreaSchema.index({ isActive: 1, serviceType: 1 });
```

### 2. PincodeServiceability Model (New)
```javascript
// backend/src/models/PincodeServiceability.model.js
const pincodeServiceabilitySchema = new mongoose.Schema({
    pincode: { type: String, required: true, unique: true, index: true },
    serviceAreaId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'ServiceArea', 
        required: true,
        index: true
    },
    
    locality: String,
    subDistrict: String,
    district: String,
    
    isServiceable: { type: Boolean, default: true },
    serviceType: { 
        type: String, 
        enum: ['express', 'standard', 'next_day', 'unavailable'], 
        default: 'standard' 
    },
    
    // Delivery zone (for intra-city logistics)
    deliveryZone: String, // "Zone A", "Zone B", etc.
    
    coordinates: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] }
    },
    
    // Override settings
    customDeliveryFee: Number,
    customDeliveryTime: String,
    
    lastVerified: { type: Date, default: Date.now }
}, { timestamps: true });

pincodeServiceabilitySchema.index({ coordinates: '2dsphere' });
pincodeServiceabilitySchema.index({ isServiceable: 1 });
```

### 3. Update Existing Models

#### Update City Model
```javascript
// Add serviceAreaId reference
cityId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ServiceArea' 
}
```

#### Update Address Model
```javascript
// Add serviceability check
isServiceable: { type: Boolean, default: true },
serviceAreaId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ServiceArea' 
},
deliveryZone: String
```

#### Update User Model
```javascript
// Add preferred location
preferredLocation: {
    serviceAreaId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceArea' },
    pincode: String,
    city: String,
    lastUpdated: Date
}
```

---

## 🔧 Backend Implementation

### Phase 1: Core Models & Services

#### 1.1 Create Service Area Service
```javascript
// backend/src/services/serviceArea.service.js

export const checkServiceAvailability = async ({ pincode, coordinates, city }) => {
    // Priority: Pincode > Coordinates > City name
    
    if (pincode) {
        const pincodeData = await PincodeServiceability.findOne({ 
            pincode, 
            isServiceable: true 
        }).populate('serviceAreaId');
        
        if (pincodeData && pincodeData.serviceAreaId?.isActive) {
            return {
                isServiceable: true,
                serviceArea: pincodeData.serviceAreaId,
                deliveryZone: pincodeData.deliveryZone,
                serviceType: pincodeData.serviceType
            };
        }
    }
    
    if (coordinates && coordinates.length === 2) {
        // Find nearest service area using geospatial query
        const nearestArea = await ServiceArea.findOne({
            isActive: true,
            coordinates: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: coordinates
                    },
                    $maxDistance: 50000 // 50km
                }
            }
        });
        
        if (nearestArea) {
            return {
                isServiceable: true,
                serviceArea: nearestArea,
                deliveryZone: 'auto-detected'
            };
        }
    }
    
    if (city) {
        const serviceArea = await ServiceArea.findOne({ 
            name: new RegExp(city, 'i'), 
            isActive: true 
        });
        
        if (serviceArea) {
            return {
                isServiceable: true,
                serviceArea,
                message: 'Please provide pincode for accurate delivery information'
            };
        }
    }
    
    // Not serviceable
    const nearestArea = await ServiceArea.findOne({ isActive: true })
        .sort({ 'stats.totalOrders': -1 });
    
    return {
        isServiceable: false,
        message: 'Sorry, we don\'t deliver to your area yet.',
        nearestArea: nearestArea ? {
            name: nearestArea.name,
            estimatedLaunchDate: nearestArea.estimatedLaunchDate
        } : null
    };
};

export const validateAddress = async (address) => {
    const { pincode, city, coordinates } = address;
    
    const result = await checkServiceAvailability({ pincode, coordinates, city });
    
    if (!result.isServiceable) {
        throw new ApiError(400, result.message);
    }
    
    return result;
};
```

#### 1.2 Create Admin Controllers
```javascript
// backend/src/modules/admin/controllers/serviceArea.controller.js

export const createServiceArea = asyncHandler(async (req, res) => {
    const { name, state, coordinates, deliverySettings, businessHours } = req.body;
    
    const serviceArea = await ServiceArea.create({
        name,
        state,
        coordinates,
        deliverySettings,
        businessHours,
        isActive: true,
        serviceType: 'full'
    });
    
    res.status(201).json(new ApiResponse(201, serviceArea, 'Service area created'));
});

export const getAllServiceAreas = asyncHandler(async (req, res) => {
    const { status, serviceType } = req.query;
    const filter = {};
    
    if (status) filter.isActive = status === 'active';
    if (serviceType) filter.serviceType = serviceType;
    
    const areas = await ServiceArea.find(filter).sort({ name: 1 });
    
    res.json(new ApiResponse(200, areas, 'Service areas fetched'));
});

export const updateServiceArea = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    const serviceArea = await ServiceArea.findByIdAndUpdate(
        id, 
        updates, 
        { new: true, runValidators: true }
    );
    
    if (!serviceArea) {
        throw new ApiError(404, 'Service area not found');
    }
    
    res.json(new ApiResponse(200, serviceArea, 'Service area updated'));
});

export const toggleServiceArea = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    
    const serviceArea = await ServiceArea.findByIdAndUpdate(
        id,
        { isActive },
        { new: true }
    );
    
    res.json(new ApiResponse(200, serviceArea, `Service area ${isActive ? 'enabled' : 'disabled'}`));
});

export const importPincodes = asyncHandler(async (req, res) => {
    const { serviceAreaId, pincodes } = req.body; // pincodes: [{ pincode, locality, zone }]
    
    const serviceArea = await ServiceArea.findById(serviceAreaId);
    if (!serviceArea) throw new ApiError(404, 'Service area not found');
    
    const operations = pincodes.map(p => ({
        updateOne: {
            filter: { pincode: p.pincode },
            update: {
                $set: {
                    serviceAreaId,
                    locality: p.locality,
                    deliveryZone: p.zone,
                    isServiceable: true
                }
            },
            upsert: true
        }
    }));
    
    const result = await PincodeServiceability.bulkWrite(operations);
    
    res.json(new ApiResponse(200, result, `${result.upsertedCount + result.modifiedCount} pincodes imported`));
});

export const checkPincodeServiceability = asyncHandler(async (req, res) => {
    const { pincode } = req.params;
    
    const result = await checkServiceAvailability({ pincode });
    
    res.json(new ApiResponse(200, result));
});
```

### Phase 2: User-Facing APIs

#### 2.1 Public Check API
```javascript
// backend/src/routes/public.routes.js

router.post('/check-serviceability', asyncHandler(async (req, res) => {
    const { pincode, latitude, longitude, city } = req.body;
    
    const coordinates = latitude && longitude ? [longitude, latitude] : null;
    
    const result = await checkServiceAvailability({ 
        pincode, 
        coordinates, 
        city 
    });
    
    res.json(new ApiResponse(200, result));
}));
```

#### 2.2 User Location Middleware
```javascript
// backend/src/middlewares/checkServiceArea.js

export const checkServiceArea = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id).select('preferredLocation');
    
    if (!user.preferredLocation?.serviceAreaId) {
        return next(); // Allow first-time setup
    }
    
    const serviceArea = await ServiceArea.findById(user.preferredLocation.serviceAreaId);
    
    if (!serviceArea || !serviceArea.isActive) {
        throw new ApiError(403, 'Service is currently unavailable in your area');
    }
    
    req.serviceArea = serviceArea;
    next();
});
```

---

## 🎨 Frontend Implementation

### Phase 3: Admin Panel Components

#### 3.1 Service Areas Management Page
```javascript
// frontend/src/modules/Admin/pages/ServiceAreas.jsx

Components needed:
- ServiceAreaList (table with all areas)
- ServiceAreaForm (create/edit form)
- PincodeImportModal (CSV upload)
- ServiceabilityTester (test pincode availability)
- ServiceAreaStats (dashboard cards)
```

#### 3.2 Pincode Management
```javascript
// frontend/src/modules/Admin/pages/PincodeManagement.jsx

Features:
- Bulk import pincodes from CSV
- Search and filter pincodes
- Assign zones to pincodes
- Enable/disable specific pincodes
```

### Phase 4: User-Facing Components

#### 4.1 Location Detector
```javascript
// frontend/src/shared/components/LocationDetector.jsx

Features:
- Auto-detect using browser geolocation API
- Manual pincode input
- City selection dropdown
- "Service Not Available" message
- Nearest location suggestion
```

#### 4.2 Service Unavailable Modal
```javascript
// frontend/src/modules/user/components/ServiceUnavailableModal.jsx

Display when user is in unserviced area:
- Friendly message
- Nearest serviced location
- Notify me when available (email capture)
- Browse without location (view-only mode)
```

#### 4.3 Address Form Enhancement
```javascript
// Update address forms to check serviceability
- Real-time pincode validation
- Show delivery time and fees
- Warning for unserviceable areas
```

---

## 🚀 Implementation Roadmap

### Week 1: Backend Foundation
- [ ] Create ServiceArea model
- [ ] Create PincodeServiceability model
- [ ] Implement service area service
- [ ] Create admin APIs (CRUD)
- [ ] Add validation middleware

### Week 2: Admin Panel
- [ ] Service Areas management page
- [ ] Create/Edit service area forms
- [ ] Pincode import functionality
- [ ] CSV template download
- [ ] Service area statistics dashboard

### Week 3: User Integration
- [ ] Public serviceability check API
- [ ] Location detection component
- [ ] Service unavailable modal
- [ ] Update address forms
- [ ] Update checkout flow

### Week 4: Testing & Polish
- [ ] Seed initial service areas (Jaipur, Indore, etc.)
- [ ] Test geolocation accuracy
- [ ] Edge case handling
- [ ] Performance optimization
- [ ] Documentation

---

## 📊 Data Seeding

### Initial Service Areas
```javascript
const initialServiceAreas = [
    {
        name: 'Jaipur',
        state: 'Rajasthan',
        coordinates: { type: 'Point', coordinates: [75.7873, 26.9124] },
        isActive: true,
        serviceType: 'full',
        deliverySettings: {
            minOrderAmount: 299,
            deliveryFee: 40,
            freeDeliveryThreshold: 500,
            averageDeliveryTime: '30-45 mins'
        }
    },
    {
        name: 'Indore',
        state: 'Madhya Pradesh',
        coordinates: { type: 'Point', coordinates: [75.8577, 22.7196] },
        isActive: true,
        serviceType: 'full',
        deliverySettings: {
            minOrderAmount: 299,
            deliveryFee: 40,
            freeDeliveryThreshold: 500,
            averageDeliveryTime: '30-45 mins'
        }
    },
    {
        name: 'Delhi',
        state: 'Delhi',
        coordinates: { type: 'Point', coordinates: [77.1025, 28.7041] },
        isActive: false,
        serviceType: 'coming_soon',
        estimatedLaunchDate: new Date('2026-06-01'),
        displayMessage: 'We are launching in Delhi soon! Stay tuned.'
    }
];
```

---

## 🔒 Security & Validation

### Checks Required
1. **Registration**: Check if user's pincode is serviceable
2. **Address Addition**: Validate before saving
3. **Checkout**: Final validation before order placement
4. **Delivery Assignment**: Ensure delivery partner is in same zone

### Error Messages
```javascript
const SERVICE_MESSAGES = {
    NOT_AVAILABLE: 'Sorry, we don\'t deliver to your area yet. We\'re expanding soon!',
    COMING_SOON: 'Good news! We\'re launching in {city} on {date}. Enter your email to get notified.',
    LIMITED_SERVICE: 'Limited service available in your area. Some features may be restricted.',
    PINCODE_INVALID: 'Please enter a valid pincode',
    AREA_TEMPORARILY_DISABLED: 'Service is temporarily unavailable in your area. Please try again later.'
};
```

---

## 📱 User Flow Examples

### Scenario 1: New User in Jaipur (Serviced Area)
1. User opens app
2. Location auto-detected → Jaipur
3. ✅ "Great! We deliver to your area"
4. Shows available products and services
5. Can proceed with orders

### Scenario 2: New User in Mumbai (Not Serviced)
1. User opens app
2. Location auto-detected → Mumbai
3. ❌ "Sorry, we don't deliver to Mumbai yet"
4. Shows nearest serviced city: "We deliver to Delhi (250km away)"
5. Option to browse in view-only mode
6. Email capture for launch notification

### Scenario 3: User Enters Wrong Pincode
1. User adds delivery address
2. Enters pincode: 999999
3. Real-time validation fails
4. ❌ "This pincode is not serviceable"
5. Suggests nearby serviceable pincodes

---

## 🧪 Testing Checklist

- [ ] Geolocation API works on all browsers
- [ ] Pincode validation is accurate
- [ ] Service area boundaries are correct
- [ ] Admin can enable/disable areas
- [ ] Bulk import CSV works
- [ ] Orders cannot be placed in unserviced areas
- [ ] Delivery partners see only their zone orders
- [ ] Performance with 1000+ pincodes
- [ ] Graceful handling of no location permission

---

## 📈 Analytics & Monitoring

### Metrics to Track
- Requests from unserviced areas (by city)
- Most requested new locations
- Serviceability check success rate
- Average delivery time per zone
- Orders per service area

---

## 💡 Future Enhancements

1. **Dynamic Boundaries**: Draw custom polygons on map for service areas
2. **Temporary Service**: Enable/disable service areas during peak times
3. **Surge Pricing**: Zone-based dynamic delivery fees
4. **Vendor Zones**: Allow vendors to define their own delivery zones
5. **Hyperlocal**: Neighborhood-level serviceability
6. **Slot-based Delivery**: Time slot selection per zone
7. **Express Zones**: Premium zones with faster delivery

---

## 🎯 Success Metrics

- ✅ Admin can add service area in < 2 minutes
- ✅ User location detection takes < 3 seconds
- ✅ 99.9% accuracy in pincode validation
- ✅ Zero orders placed in unserviced areas
- ✅ 50% reduction in delivery partner route confusion

---

## 📞 Support & Documentation

Create user-facing help articles:
- "Which areas do you serve?"
- "How to request service in my area?"
- "Why can't I place an order?"
- "How to change my location?"

---

## Summary

This plan provides a complete, scalable solution for service area management. Implementation will take approximately 4 weeks with proper testing. The system will:

✅ Allow admins to control service areas  
✅ Prevent orders from unserviced locations  
✅ Provide clear user communication  
✅ Enable data-driven expansion decisions  
✅ Scale to support 100+ cities  

**Priority**: HIGH - This is a critical business requirement to ensure operational efficiency and customer satisfaction.
