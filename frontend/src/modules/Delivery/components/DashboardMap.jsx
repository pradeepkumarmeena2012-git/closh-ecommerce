import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMapPin, FiNavigation, FiZap, FiRefreshCw, FiShare2, FiCheckCircle } from 'react-icons/fi';
import DeliveryBoyLiveMap from '../../../shared/components/DeliveryBoyLiveMap';
import toast from 'react-hot-toast';
import { useDeliveryAuthStore } from '../store/deliveryStore';

const DashboardMap = ({ currentLocation, isOnline, isLoaded, height = '300px', hideHeader = false }) => {
  const [isSharing, setIsSharing] = useState(false);
  const { updateLocation } = useDeliveryAuthStore();

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
      )}

      <div style={{ height }} className="w-full relative">
        {currentLocation ? (
          <DeliveryBoyLiveMap 
            currentLocation={currentLocation}
            // Passing minimal props for dashboard view
            distanceTraveled={0}
            earnings={0}
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
          {isOnline && currentLocation && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="absolute left-4 bottom-4 z-10"
            >
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
