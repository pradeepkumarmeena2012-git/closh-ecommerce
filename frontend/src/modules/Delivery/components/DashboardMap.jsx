import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMapPin, FiNavigation, FiZap, FiRefreshCw, FiShare2, FiCheckCircle, FiActivity } from 'react-icons/fi';
import TrackingMap from '../../../shared/components/TrackingMap';
import toast from 'react-hot-toast';
import { useDeliveryAuthStore } from '../store/deliveryStore';

const DashboardMap = ({ currentLocation, activeOrder, isOnline, isLoaded, height = '300px', hideHeader = false }) => {
  const [isSharing, setIsSharing] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const { updateLocation } = useDeliveryAuthStore();

  useEffect(() => {
    if (activeOrder) {
      console.log('🗺️ [DashboardMap] Active mission data:', {
        id: activeOrder.id,
        status: activeOrder.status,
        customer: { lat: activeOrder.latitude, lng: activeOrder.longitude },
        vendor: { lat: activeOrder.vendorLatitude, lng: activeOrder.vendorLongitude },
        rider: currentLocation
      });
    }
  }, [activeOrder, currentLocation]);

  const handleShareLocation = async () => {
    if (!isOnline) {
      toast.error('Go online to share your live location');
      return;
    }

    if (!currentLocation) {
      toast.error('Waiting for GPS signal...');
      return;
    }

    setIsSharing(true);
    try {
      await updateLocation(currentLocation.lat, currentLocation.lng);
      toast.success('Current location shared with dispatch!');
    } catch (err) {
      toast.error('Failed to update location');
    } finally {
      setTimeout(() => setIsSharing(false), 2000);
    }
  };

  const vendorCoords = activeOrder?.pickupLocation?.coordinates?.[1] && activeOrder?.pickupLocation?.coordinates?.[0] !== 0
    ? { lat: Number(activeOrder.pickupLocation.coordinates[1]), lng: Number(activeOrder.pickupLocation.coordinates[0]) }
    : (activeOrder?.vendorLatitude && activeOrder?.vendorLongitude 
        ? { lat: Number(activeOrder.vendorLatitude), lng: Number(activeOrder.vendorLongitude) } 
        : null);
    
  const customerCoords = activeOrder?.dropoffLocation?.coordinates?.[1] && activeOrder?.dropoffLocation?.coordinates?.[0] !== 0
    ? { lat: Number(activeOrder.dropoffLocation.coordinates[1]), lng: Number(activeOrder.dropoffLocation.coordinates[0]) }
    : (activeOrder?.latitude && activeOrder?.longitude 
        ? { lat: Number(activeOrder.latitude), lng: Number(activeOrder.longitude) } 
        : null);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={hideHeader ? "w-full h-full" : "bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-100 mb-8"}
    >
      {!hideHeader && (
        <div className="p-5 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <FiNavigation size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 tracking-tight">Live Operations Map</h3>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {isOnline ? 'Location Tracking Active' : 'Tracking Paused'}
                </p>
              </div>
            </div>
          </div>
          
          {activeOrder && (
            <div className="flex flex-col items-end mr-auto ml-10">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Task</span>
               <span className="text-[10px] font-black text-indigo-600 uppercase">#{String(activeOrder.id).slice(-6)}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowDebug(!showDebug)}
              className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all active:scale-95 border border-slate-200"
              title="Debug Coords"
            >
              <FiActivity size={18} />
            </button>

            <button 
              onClick={handleShareLocation}
              disabled={!isOnline || isSharing}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all
                ${isOnline 
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 active:scale-95' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
              `}
            >
              {isSharing ? (
                <>
                  <FiCheckCircle className="animate-bounce" /> Shared
                </>
              ) : (
                <>
                  <FiShare2 /> Share Location
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div style={{ height }} className="w-full relative">
        {currentLocation ? (
          <TrackingMap 
            deliveryLocation={currentLocation}
            customerLocation={customerCoords}
            vendorLocation={vendorCoords}
            customerAddress={activeOrder?.address}
            vendorAddress={activeOrder?.vendorAddress}
            status={activeOrder?.status}
            isLoaded={isLoaded}
          />
        ) : (
          <div className="h-full w-full bg-slate-50 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
            <div className="text-center">
              <p className="text-slate-900 font-bold text-sm">Initializing GPS...</p>
              <p className="text-slate-400 text-[11px]">Please ensure location permissions are granted</p>
            </div>
          </div>
        )}

        {/* Custom Mini Info Overlay */}
        <AnimatePresence>
          {((isOnline && !hideHeader) || showDebug) && currentLocation && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="absolute left-4 bottom-4 z-10 space-y-2 pointer-events-none"
            >
              {showDebug && (
                <div className="bg-slate-900 shadow-2xl rounded-2xl p-4 border border-white/10 min-w-[200px]">
                  <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">Mission Telemetry</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Rider</span>
                      <span className="text-[10px] font-mono text-emerald-400">{currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}</span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Vendor</span>
                      <span className={`text-[10px] font-mono ${vendorCoords ? 'text-indigo-400' : 'text-rose-500'}`}>
                        {vendorCoords ? `${vendorCoords.lat.toFixed(4)}, ${vendorCoords.lng.toFixed(4)}` : 'MISSING DATA'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Customer</span>
                      <span className={`text-[10px] font-mono ${customerCoords ? 'text-indigo-400' : 'text-rose-500'}`}>
                        {customerCoords ? `${customerCoords.lat.toFixed(4)}, ${customerCoords.lng.toFixed(4)}` : 'MISSING DATA'}
                      </span>
                    </div>
                  </div>

                  {(!vendorCoords || !customerCoords) && (
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-start gap-2 text-rose-400">
                      <FiAlertCircle size={12} className="shrink-0 mt-0.5" />
                      <p className="text-[8px] font-bold leading-tight">Markers cannot be placed if mission coordinates are missing from the order object.</p>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-[#0F172A]/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/10 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <FiZap size={14} />
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter leading-none">Your Coords</p>
                  <p className="text-[11px] text-white font-mono mt-0.5">
                    {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};


export default DashboardMap;
