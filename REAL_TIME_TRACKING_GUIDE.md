# 🗺️ Real-Time Delivery Tracking with Google Maps

## Features Implemented

### 1. **Live Delivery Boy Map** 📍
- Real-time location tracking with animated marker
- Shows delivery boy's current position with direction indicator
- Displays distance traveled and earnings in real-time
- Path visualization showing complete route

### 2. **Distance Tracking** 📏
- Haversine formula for accurate distance calculation
- Filters GPS noise (minimum 10m movement threshold)
- Tracks total distance per order
- Updates backend database with tracking data

### 3. **Earnings Calculator** 💰
- Based on actual distance traveled
- Formula: Base ₹25 + ₹9 per km after 3km
- Live updates as delivery progresses
- Stored in Order model for accurate settlement

### 4. **Integration Points** 🔌
- **Frontend**: Live tracking page at `/delivery/live-tracking/:orderId`
- **Backend**: Tracking API at `/api/delivery/tracking/*`
- **Socket.io**: Real-time location broadcasts
- **Database**: Order.deliveryTracking schema for persistence

---

## 🚀 Getting Started

### Step 1: Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable these APIs:
   - **Maps JavaScript API**
   - **Directions API** (for route calculation)
   - **Distance Matrix API** (optional, for advanced features)
   - **Geocoding API** (optional, for address lookup)

4. Create credentials:
   - Navigate to **APIs & Services > Credentials**
   - Click **Create Credentials > API Key**
   - Copy the API key

5. Restrict your API key (recommended for production):
   - Click on the API key to edit
   - Under **Application restrictions**, select **HTTP referrers**
   - Add your domains:
     ```
     http://localhost:5173/*
     http://localhost:3000/*
     https://yourdomain.com/*
     ```
   - Under **API restrictions**, select **Restrict key**
   - Select only the APIs you need

### Step 2: Configure Frontend

1. Update frontend `.env` file:
```bash
cd frontend
cp .env.example .env
```

2. Add your Google Maps API key:
```env
VITE_GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXX
```

### Step 3: Test the Feature

1. **Start the backend:**
```bash
cd backend
npm install
npm run dev
```

2. **Start the frontend:**
```bash
cd frontend
npm install
npm run dev
```

3. **Test workflow:**
   - Login as delivery boy
   - Accept an order
   - Mark as "Picked Up"
   - Mark as "Out for Delivery"
   - Click **"📍 Live Map"** button
   - See real-time tracking with distance & earnings!

---

## 📋 API Endpoints

### POST `/api/delivery/tracking/update-location`
Update delivery boy location with distance tracking.

**Request:**
```json
{
  "lat": 28.6139,
  "lng": 77.2090,
  "orderId": "507f1f77bcf86cd799439011",
  "accuracy": 15
}
```

**Response:**
```json
{
  "success": true,
  "location": { "lat": 28.6139, "lng": 77.2090 },
  "distanceTraveled": 5.43,
  "earnings": 46,
  "message": "Location updated successfully"
}
```

### GET `/api/delivery/tracking/stats/:orderId`
Get tracking statistics for a specific order.

**Response:**
```json
{
  "success": true,
  "orderId": "507f1f77bcf86cd799439011",
  "distanceTraveled": 5.43,
  "earnings": 46,
  "path": [[77.2090, 28.6139], [77.2095, 28.6145], ...],
  "checkpoints": 54,
  "startedAt": { "coordinates": [77.2090, 28.6139] },
  "lastUpdate": "2026-04-01T10:30:00Z"
}
```

### GET `/api/delivery/tracking/my-stats`
Get delivery boy's overall tracking statistics.

**Response:**
```json
{
  "success": true,
  "overall": {
    "totalDeliveries": 145,
    "totalDistance": "758.32",
    "totalEarnings": 9850
  },
  "today": {
    "deliveries": 8,
    "distance": "42.15",
    "earnings": 578
  }
}
```

---

## 🗄️ Database Schema

### Order Model - deliveryTracking field
```javascript
deliveryTracking: {
  startLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [lng, lat]
  },
  path: [[Number]], // Array of [lng, lat] coordinates
  totalDistance: { type: Number, default: 0 }, // in kilometers
  lastUpdate: Date
}
```

---

## 🔧 Component Structure

```
frontend/src/
├── shared/
│   ├── components/
│   │   ├── DeliveryBoyLiveMap.jsx  ← Animated map component
│   │   └── TrackingMap.jsx         ← Customer view map (existing)
│   └── hooks/
│       ├── useDistanceTracker.js   ← Distance & earnings calculator
│       └── useDeliveryTracking.js  ← Location broadcast hook (existing)
└── modules/Delivery/pages/
    └── LiveTracking.jsx            ← Full-screen live tracking page

backend/src/
├── modules/delivery/
│   ├── controllers/
│   │   └── tracking.controller.js  ← Tracking endpoints
│   └── routes/
│       └── tracking.routes.js      ← Tracking routes
└── models/
    └── Order.model.js              ← Updated with deliveryTracking
```

---

## 🎨 UI Components

### 1. Live Tracking Page
- **Path:** `/delivery/live-tracking/:orderId`
- **Features:**
  - Animated delivery boy marker with direction
  - Real-time distance counter
  - Live earnings display
  - Path visualization
  - Order details overlay
  - Recenter button

### 2. Dashboard Integration
- **Live Map** button appears on active orders (picked_up, out_for_delivery)
- Quick access from order cards

### 3. Order Detail Page
- Map preview with live tracking
- Navigate to full-screen live map

---

## 📊 Distance & Earnings Formula

```javascript
// Distance Calculation (Haversine)
const R = 6371; // Earth radius in km
const dLat = toRadians(lat2 - lat1);
const dLon = toRadians(lon2 - lon1);
const a = 
  Math.sin(dLat / 2) * Math.sin(dLat / 2) +
  Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
  Math.sin(dLon / 2) * Math.sin(dLon / 2);
const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

// Earnings Calculation
const BASE_FEE = 25;      // ₹25 base
const PER_KM_FEE = 9;     // ₹9 per km
const FREE_KMS = 3;       // First 3km included

if (distance <= 3) {
  earnings = 25;
} else {
  earnings = 25 + (distance - 3) * 9;
}

// Examples:
// 2 km = ₹25
// 5 km = ₹25 + (5-3)*9 = ₹43
// 10 km = ₹25 + (10-3)*9 = ₹88
```

---

## 🛠️ Troubleshooting

### Map not loading?
- Check if `VITE_GOOGLE_MAPS_API_KEY` is set in `.env`
- Verify API key is valid and has Maps JavaScript API enabled
- Check browser console for API errors

### Location not updating?
- Ensure location permissions are granted in browser
- Check if delivery boy status is "available"
- Verify socket connection in DevTools Network tab

### Distance not calculating?
- Minimum 10m movement required to filter GPS noise
- Check if order is in active status (picked_up, out_for_delivery)
- Verify order ID is valid

### Earnings not matching?
- Earnings calculated server-side based on distance
- Formula: ₹25 + ₹9 per km after 3km
- Check `Order.deliveryEarnings` field in database

---

## 🔐 Production Recommendations

1. **API Key Security:**
   - Use HTTP referrer restrictions
   - Enable only required APIs
   - Monitor usage in Google Cloud Console
   - Consider using API key per environment

2. **Performance:**
   - Cache map tiles for offline support
   - Throttle location updates (default: 10s interval)
   - Use Firebase Realtime Database for high-freq updates

3. **Accuracy:**
   - Use `enableHighAccuracy: true` for GPS
   - Fallback to network location if GPS timeout
   - Filter movements < 10m to reduce noise

4. **Cost Optimization:**
   - Maps JavaScript API: $0.007 per load
   - Directions API: $0.005 per request
   - Set daily quotas to prevent overuse
   - Cache directions for repeated routes

---

## 📝 Testing Checklist

- [ ] Google Maps loads correctly
- [ ] Delivery boy marker appears at current location
- [ ] Marker rotates based on movement direction
- [ ] Distance counter updates as moving
- [ ] Earnings calculator shows correct amount
- [ ] Path line draws behind delivery boy
- [ ] Destination marker visible
- [ ] Recenter button works
- [ ] Order details overlay displays
- [ ] Socket connection stable
- [ ] Backend tracking API receives data
- [ ] Database stores path and distance

---

## 🚦 Status Indicators

| Status | Map Behavior |
|--------|--------------|
| `assigned`, `accepted` | No tracking (not started) |
| `picked_up` | 🟢 Active tracking to customer |
| `out_for_delivery` | 🟢 Active tracking with route |
| `delivered` | 🔵 Complete - show summary |

---

## 💡 Future Enhancements

1. **Predictive ETA** - Use Google Directions API for accurate arrival time
2. **Offline Support** - Cache map tiles and queue location updates
3. **Multi-stop Optimization** - Batch delivery route planning
4. **Heatmap** - Show delivery density across city
5. **Replay Mode** - Review completed delivery journey
6. **Speed Monitoring** - Alert if delivery boy is speeding
7. **Traffic Integration** - Real-time traffic-aware routing

---

## 📚 References

- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
- [Haversine Formula](https://en.wikipedia.org/wiki/Haversine_formula)
- [React Google Maps API](https://react-google-maps-api-docs.netlify.app/)
- [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)

---

## 🤝 Support

Need help? Contact the development team or open an issue with:
- Browser console errors
- Screenshot of the issue
- Steps to reproduce

Happy Tracking! 🚴‍♂️📍
