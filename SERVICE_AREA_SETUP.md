# 🗺️ Service Area Management - Setup Guide

## ✅ What's Been Implemented

### Backend (Complete)
1. **Database Models**
   - ✅ `ServiceArea.model.js` - Main service area/city management
   - ✅ `PincodeServiceability.model.js` - Pincode-level serviceability
   - ✅ Updated `User.model.js` with `preferredLocation` field

2. **Services**
   - ✅ `serviceArea.service.js` - Core business logic with geolocation
     - Check serviceability by pincode/coordinates/city
     - Find nearest service areas
     - Calculate distances using Haversine formula

3. **Admin APIs** (`/admin/service-areas`)
   - ✅ GET `/` - List all service areas
   - ✅ GET `/:id` - Get single service area
   - ✅ POST `/` - Create new service area
   - ✅ PUT `/:id` - Update service area
   - ✅ PATCH `/:id/toggle` - Enable/disable area
   - ✅ DELETE `/:id` - Delete service area
   - ✅ GET `/stats` - Get statistics
   - ✅ GET `/:id/pincodes` - Get pincodes for area
   - ✅ POST `/pincodes` - Add single pincode
   - ✅ POST `/pincodes/import` - Bulk import pincodes
   - ✅ PUT `/pincodes/:id` - Update pincode
   - ✅ DELETE `/pincodes/:id` - Delete pincode
   - ✅ GET `/pincodes/check/:pincode` - Test serviceability

4. **Public APIs** (`/api`)
   - ✅ POST `/check-serviceability` - Check if address is serviceable
   - ✅ GET `/service-areas` - Get all active areas for user selection

### Frontend (Complete)
1. **Admin Pages**
   - ✅ `ServiceAreas.jsx` - Main management page with stats
   - ✅ `ServiceAreaModal.jsx` - Create/edit service area form
   - ✅ `PincodeModal.jsx` - Manage pincodes for each area
   - ✅ `GoogleMapPicker.jsx` - Interactive map for location selection

2. **Route Integration**
   - ✅ Added `/admin/service-areas` route in App.jsx

---

## 🚀 Installation Instructions

### Step 1: Install Google Maps Dependency

```bash
cd frontend
npm install @googlemaps/js-api-loader
```

### Step 2: Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Maps JavaScript API** and **Places API**
4. Create credentials → API Key
5. Restrict API key to your domain for production

### Step 3: Configure Environment Variables

**Frontend** (.env)
```bash
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

**Backend** (.env)
```bash
# No additional config needed - models use MongoDB geospatial queries
```

### Step 4: Verify Backend Routes

Ensure your backend routes are properly loaded in `app.js`:

```javascript
// backend/src/app.js
import publicRoutes from './routes/public.routes.js';
import adminRoutes from './modules/admin/routes/admin.routes.js';

app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);
```

### Step 5: Test the API

**Check if backend is working:**

```bash
# Test public serviceability check
curl -X POST http://localhost:5000/api/check-serviceability \
  -H "Content-Type: application/json" \
  -d '{"pincode": "302001"}'

# Test admin service areas (requires auth token)
curl -X GET http://localhost:5000/api/admin/service-areas \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## 📊 How to Use

### For Admins:

1. **Navigate to Service Areas**
   - Go to admin panel: `/admin/service-areas`

2. **Add a Service Area**
   - Click "Add Service Area"
   - Fill in city name, state
   - Click on map to set center location
   - Configure delivery settings (fees, min order, time)
   - Set business hours
   - Save

3. **Add Pincodes**
   - Click "Manage Pincodes" (package icon) for any service area
   - Add pincodes one by one OR
   - Download CSV template, fill it, and use bulk import

4. **Manage Areas**
   - Toggle active/inactive status
   - Edit delivery settings anytime
   - Delete areas (if no pincodes linked)

### For Users (To be implemented):

1. **Location Detection** (Next Phase)
   - Auto-detect via GPS
   - Manual pincode entry
   - City selection dropdown

2. **Serviceability Check** (Already works via API)
   ```javascript
   // Example API call
   const checkServiceability = async (pincode) => {
     const response = await api.post('/check-serviceability', { pincode });
     if (response.data.data.isServiceable) {
       console.log('✅ We deliver here!');
     }
   };
   ```

---

## 🎯 Seed Initial Data

Create a seed script to add your initial service areas:

```javascript
// backend/scripts/seed-service-areas.js
import ServiceArea from '../src/models/ServiceArea.model.js';
import PincodeServiceability from '../src/models/PincodeServiceability.model.js';
import mongoose from 'mongoose';

const serviceAreas = [
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
      averageDeliveryTime: '30-45 mins',
      maxDeliveryRadius: 15
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
      averageDeliveryTime: '35-50 mins',
      maxDeliveryRadius: 12
    }
  }
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  for (const area of serviceAreas) {
    await ServiceArea.create(area);
    console.log(`✅ Created: ${area.name}`);
  }
  
  console.log('✅ Seed complete!');
  process.exit(0);
}

seed();
```

Run it:
```bash
cd backend
node scripts/seed-service-areas.js
```

---

## 🧪 Testing Checklist

- [ ] Google Maps loads correctly in admin panel
- [ ] Can create service area with map location
- [ ] Can add pincodes manually
- [ ] Can toggle service area active/inactive
- [ ] Public API `/check-serviceability` returns correct results
- [ ] Can edit existing service area
- [ ] Stats cards show correct numbers
- [ ] Search and filters work
- [ ] CSV template downloads successfully

---

## 🎨 UI Features

### Admin Dashboard:
- **Stats Cards**: Total areas, pincodes, coverage percentage
- **Interactive Map**: Click to set service area center
- **Filters**: All, Active, Inactive, Coming Soon
- **Search**: By city or state name
- **Bulk Actions**: CSV import for pincodes

### Service Area Form:
- **Basic Info**: City, State, Service Type
- **Google Map**: Visual location picker
- **Delivery Settings**: Fees, min order, free delivery threshold
- **Business Hours**: Configure opening hours
- **COD Toggle**: Enable/disable cash on delivery

---

## 🔄 Next Steps (Phase 2)

### User-Facing Components:
1. **Location Detector** (`frontend/src/shared/components/LocationDetector.jsx`)
   - Auto GPS detection
   - Manual pincode input
   - City dropdown

2. **Service Unavailable Modal**
   - Show when user is outside service area
   - Display nearest serviceable location
   - Email capture for launch notifications

3. **Address Form Integration**
   - Real-time pincode validation
   - Show delivery time and fees
   - Warning for unserviceable areas

4. **Checkout Flow Update**
   - Final serviceability check before order
   - Prevent orders from unserviced locations

---

## 🐛 Troubleshooting

### Google Maps not loading:
1. Verify `VITE_GOOGLE_MAPS_API_KEY` in `.env`
2. Check API key is enabled in Google Cloud Console
3. Ensure Maps JavaScript API is enabled
4. Check browser console for errors

### API returns 404:
1. Verify backend routes are imported in `app.js`
2. Check MongoDB connection
3. Ensure models are imported correctly

### Geospatial queries failing:
1. Verify 2dsphere indexes exist: 
   ```javascript
   db.serviceareas.getIndexes()
   db.pincodeserviceabilities.getIndexes()
   ```
2. If missing, MongoDB will create them on first query

---

## 📈 Performance Tips

1. **Index Optimization**: 2dsphere indexes are created automatically
2. **Caching**: Consider caching service areas list (rarely changes)
3. **CDN**: Use Google Maps CDN for faster load times
4. **Lazy Loading**: Load map only when modal opens

---

## 🔐 Security Notes

1. **API Key Restriction**: Restrict Google Maps API key to your domain
2. **Admin Access**: Service area management requires admin permissions
3. **Public API**: Rate limit `/check-serviceability` endpoint
4. **Input Validation**: All inputs are validated on backend

---

## 📚 API Documentation

### Check Serviceability (Public)
```
POST /api/check-serviceability
Content-Type: application/json

{
"pincode": "302001",
  "latitude": 26.9124,
  "longitude": 75.7873,
  "city": "Jaipur"
}

Response:
{
  "success": true,
  "data": {
    "isServiceable": true,
    "serviceArea": {...},
    "deliverySettings": {...},
    "message": "We deliver to your area!"
  }
}
```

### Get Service Areas (Public)
```
GET /api/service-areas

Response: List of active service areas
```

---

## ✨ Success Metrics

After implementation, you should be able to:

✅ Admin can add cities in < 2 minutes  
✅ Location detection takes < 3 seconds  
✅ 99.9% pincode validation accuracy  
✅ Zero orders from unserviced areas  
✅ Clear user communication about availability  

---

## 🎉 You're All Set!

Your service area management system is now ready. Start by:
1. Adding your first service area (Jaipur/Indore)
2. Importing pincodes via CSV
3. Testing serviceability API
4. Building user-facing components (Phase 2)

Need help? Check the plan document: `SERVICE_AREA_IMPLEMENTATION_PLAN.md`
