import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiPackage, FiNavigation, FiMap, FiCheckCircle, FiInfo, FiChevronLeft, 
  FiCamera, FiPhone, FiUser, FiMapPin, FiClock, FiTarget, FiZap,
  FiShield, FiDollarSign, FiCreditCard, FiTrash2, FiAlertCircle
} from 'react-icons/fi';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { useDeliveryEngineStore } from '../store/deliveryEngineStore';
import PageTransition from '../../../shared/components/PageTransition';
import socketService from '../../../shared/utils/socket';

const formatPrice = (price) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(price || 0);
};

const ChangeView = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center);
  }, [center, map]);
  return null;
};

const BatchDetail = () => {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const {
    activeBatch,
    isLoadingBatch,
    isUpdatingBatch,
    fetchActiveBatch,
    pickupBatch,
    startBatchDelivery,
    markBatchArrived,
    processTryAndBuy,
    processBatchPayment,
    completeBatchDelivery
  } = useDeliveryEngineStore();

  const [otp, setOtp] = useState('');
  const [proofs, setProofs] = useState({ packagePhoto: null, sealedBoxPhoto: null, openBoxPhoto: null });
  const [tryBuyAnswers, setTryBuyAnswers] = useState({}); // { deliveryId: { accepted: [], rejected: [] } }
  
  const packageInputRef = useRef(null);
  const sealedInputRef = useRef(null);
  const openBoxInputRef = useRef(null);

  useEffect(() => {
    fetchActiveBatch(batchId).catch(() => {
      toast.error("Failed to load batch context.");
      navigate('/delivery/dashboard');
    });
  }, [batchId, fetchActiveBatch]);

  if (isLoadingBatch || !activeBatch) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const batch = activeBatch;
  const status = batch.status;

  // --- Handlers ---

  const handleCapture = (type, file) => {
    const reader = new FileReader();
    reader.onloadend = () => {
       setProofs(prev => ({ ...prev, [type]: reader.result }));
    };
    if (file) reader.readAsDataURL(file);
  };

  const handlePickup = async () => {
    if (!proofs.packagePhoto || !proofs.sealedBoxPhoto) {
      return toast.error("Package and Sealed Box photos are required.");
    }
    try {
      await pickupBatch(batchId, { 
        packagePhoto: proofs.packagePhoto, 
        sealedBoxPhoto: proofs.sealedBoxPhoto 
      });
      toast.success("Pickup verified!");
    } catch(err) {}
  };

  const handleStartDelivery = async () => {
    try {
      await startBatchDelivery(batchId);
      toast.success("Live Tracking Active!");
    } catch(err) {}
  };

  const handleArrived = async () => {
    try {
      await markBatchArrived(batchId);
      toast.success("Customer notified of arrival.");
    } catch(err) {}
  };

  const handleTryBuyToggle = (deliveryId, itemId, accept) => {
    setTryBuyAnswers(prev => {
      const current = prev[deliveryId] || { accepted: [], rejected: [] };
      let newAccepted = [...current.accepted];
      let newRejected = [...current.rejected];

      if (accept) {
        if (!newAccepted.includes(itemId)) newAccepted.push(itemId);
        newRejected = newRejected.filter(id => id !== itemId);
      } else {
        if (!newRejected.includes(itemId)) newRejected.push(itemId);
        newAccepted = newAccepted.filter(id => id !== itemId);
      }

      return { ...prev, [deliveryId]: { accepted: newAccepted, rejected: newRejected } };
    });
  };

  const handleCommitTryAndBuy = async () => {
    const mapping = Object.entries(tryBuyAnswers).map(([deliveryId, data]) => ({
      deliveryId,
      acceptedItems: data.accepted,
      rejectedItems: data.rejected
    }));
    try {
      await processTryAndBuy(batchId, mapping);
      toast.success("Billing updated!");
    } catch(err) {}
  };

  const handleFinalDelivery = async () => {
    if (otp.length !== 6) return toast.error("Enter valid 6-digit OTP");
    if (!proofs.openBoxPhoto) return toast.error("Open box verification photo required");
    try {
      await completeBatchDelivery(batchId, otp, proofs.openBoxPhoto);
      toast.success("Batch successfully delivered!");
      navigate('/delivery/dashboard');
    } catch(err) {}
  };

  // --- Render Nodes ---

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F8FAFC] pb-32">
        {/* Header */}
        <div className="px-6 pt-12 pb-8 bg-slate-900 text-white rounded-b-[40px] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="relative z-10">
            <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
              <FiChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-400">Logistics Phase</p>
              <div className="w-1 h-1 rounded-full bg-indigo-400" />
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-400 animate-pulse">{status.replace(/_/g, ' ')}</p>
            </div>
            <h1 className="text-3xl font-black tracking-tight">{batch.batchId}</h1>
            <p className="text-slate-400 text-xs font-bold mt-1 opacity-80 uppercase tracking-widest">Customer: {batch.customerName}</p>
          </div>
        </div>

        <div className="px-6 -mt-6 space-y-6 relative z-20">
          
          {/* Phase 1: Pickup Node */}
          {status === 'assigned' && (
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[32px] p-6 shadow-xl border border-slate-100 space-y-6">
               <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <FiPackage className="text-indigo-600" size={24} />
                  <div>
                    <p className="text-xs font-black text-indigo-900 uppercase">Step 1: Verify Pickup</p>
                    <p className="text-[10px] text-indigo-600 font-bold">Upload required proofs from vendor store</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase text-center">Package Image</p>
                    <input type="file" capture="environment" className="hidden" ref={packageInputRef} onChange={(e) => handleCapture('packagePhoto', e.target.files[0])} />
                    <button onClick={() => packageInputRef.current?.click()} className="w-full h-32 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 overflow-hidden bg-slate-50">
                      {proofs.packagePhoto ? <img src={proofs.packagePhoto} className="w-full h-full object-cover" /> : <><FiCamera size={24} className="text-slate-300" /><span className="text-[9px] font-black uppercase text-slate-400">Capture</span></>}
                    </button>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase text-center">Sealed Box</p>
                    <input type="file" capture="environment" className="hidden" ref={sealedInputRef} onChange={(e) => handleCapture('sealedBoxPhoto', e.target.files[0])} />
                    <button onClick={() => sealedInputRef.current?.click()} className="w-full h-32 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 overflow-hidden bg-slate-50">
                      {proofs.sealedBoxPhoto ? <img src={proofs.sealedBoxPhoto} className="w-full h-full object-cover" /> : <><FiCamera size={24} className="text-slate-300" /><span className="text-[9px] font-black uppercase text-slate-400">Capture</span></>}
                    </button>
                  </div>
               </div>

               <button 
                 onClick={handlePickup}
                 disabled={isUpdatingBatch || !proofs.packagePhoto || !proofs.sealedBoxPhoto}
                 className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-200 disabled:opacity-50"
               >
                 {isUpdatingBatch ? 'Verifying...' : 'Complete Phase 1: Pickup'}
               </button>
            </motion.div>
          )}

          {/* Phase 2: Transit Node */}
          {status === 'picked_up' && (
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-4">
               <div className="bg-white rounded-[32px] p-6 shadow-xl border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <FiNavigation size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 uppercase">Phase 2: In-Transit</p>
                      <p className="text-[10px] text-slate-500 font-bold tracking-tight">{batch.customerAddress?.address}</p>
                    </div>
                  </div>
                  <button onClick={() => window.open(`http://maps.google.com/?q=${batch.customerLocation.coordinates[1]},${batch.customerLocation.coordinates[0]}`)} className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg">
                    <FiMap size={20} />
                  </button>
               </div>

               <button 
                 onClick={handleStartDelivery}
                 disabled={isUpdatingBatch}
                 className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-200"
               >
                 Start Live Tracking & Transit
               </button>
            </motion.div>
          )}

          {/* Phase 3: Arrived Node */}
          {status === 'out_for_delivery' && (
            <button 
              onClick={handleArrived}
              disabled={isUpdatingBatch}
              className="w-full py-6 bg-amber-500 text-white rounded-[32px] font-black text-sm uppercase tracking-widest shadow-2xl shadow-amber-200 flex items-center justify-center gap-3 border-b-4 border-amber-600 active:border-b-0 active:translate-y-1 transition-all"
            >
              <FiTarget size={24} /> I Have Arrived at Customer
            </button>
          )}

          {/* Phase 4: Try & Buy Node */}
          {status === 'arrived' && (
            <div className="space-y-6">
              <div className="bg-white rounded-[32px] p-6 shadow-xl border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600">
                    <FiZap size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase">Try & Buy Verification</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">Record Customer Decisions</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {batch.deliveries.map((delivery) => (
                    <div key={delivery._id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Order #{String(delivery.orderId).slice(-6)}</p>
                      {/* This is a simplified items view, in production we would map specific items if available in populate */}
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm">
                         <span className="text-xs font-bold text-slate-700">Package Contents</span>
                         <div className="flex gap-2">
                           <button 
                             onClick={() => handleTryBuyToggle(delivery._id, 'main', false)}
                             className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${tryBuyAnswers[delivery._id]?.rejected?.includes('main') ? 'bg-red-500 text-white' : 'bg-red-50 text-red-500'}`}
                           >
                             <FiTrash2 />
                           </button>
                           <button 
                             onClick={() => handleTryBuyToggle(delivery._id, 'main', true)}
                             className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${tryBuyAnswers[delivery._id]?.accepted?.includes('main') ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-500'}`}
                           >
                             <FiCheckCircle />
                           </button>
                         </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={handleCommitTryAndBuy}
                  disabled={isUpdatingBatch}
                  className="w-full mt-6 py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest"
                >
                  Confirm Items & Update Bill
                </button>
              </div>
            </div>
          )}

          {/* Phase 5: Final Payment & OTP Node */}
          {(status === 'try_and_buy' || status === 'payment_pending') && (
            <div className="space-y-6 animate-in fade-in zoom-in duration-300">
               {/* Recalculated Bill */}
               <div className="bg-emerald-600 rounded-[32px] p-6 text-white shadow-xl shadow-emerald-200">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Final Amount to Collect</p>
                  <h2 className="text-4xl font-black">{formatPrice(batch.deliveries.reduce((sum, d) => sum + (d.payment?.recalculatedAmount || d.payment?.originalAmount || 0), 0))}</h2>
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10">
                    <FiShield size={16} />
                    <span className="text-[10px] font-bold uppercase">Dynamic Cash Protected</span>
                  </div>
               </div>

               <div className="bg-white rounded-[32px] p-6 shadow-xl border border-slate-100 space-y-6">
                  {/* Proof of delivery (Open Box) */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase text-center">Open Box Product Proof</p>
                    <input type="file" capture="environment" className="hidden" ref={openBoxInputRef} onChange={(e) => handleCapture('openBoxPhoto', e.target.files[0])} />
                    <button onClick={() => openBoxInputRef.current?.click()} className="w-full h-40 rounded-3xl border-2 border-dashed border-emerald-100 flex flex-col items-center justify-center gap-2 overflow-hidden bg-emerald-50/30">
                      {proofs.openBoxPhoto ? <img src={proofs.openBoxPhoto} className="w-full h-full object-cover" /> : <><FiCamera size={32} className="text-emerald-200" /><span className="text-[9px] font-black uppercase text-emerald-400">Capture Proof</span></>}
                    </button>
                  </div>

                  {/* OTP ENTRY */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase text-center tracking-[0.3em]">Customer Secure OTP</p>
                    <input 
                      type="text" 
                      maxLength={6} 
                      value={otp} 
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full h-20 bg-slate-50 border-2 border-slate-100 rounded-[24px] text-center text-4xl font-black tracking-[0.5em] text-indigo-600 focus:border-indigo-400 outline-none"
                      placeholder="••••••"
                    />
                  </div>

                  <button 
                    onClick={handleFinalDelivery}
                    disabled={isUpdatingBatch || otp.length !== 6 || !proofs.openBoxPhoto}
                    className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl active:scale-95 transition-all"
                  >
                    Finish Batch Delivery
                  </button>
               </div>
            </div>
          )}

        </div>
      </div>
    </PageTransition>
  );
};

export default BatchDetail;
