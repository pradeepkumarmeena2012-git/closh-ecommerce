import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDeliveryAuthStore } from '../store/deliveryStore';
import { 
  FiUser, FiMail, FiPhone, FiTruck, FiEdit2, FiSave, FiX, FiLogOut, 
  FiCheckCircle, FiCreditCard, FiSmartphone, FiDollarSign, FiInfo, 
  FiAlertCircle, FiActivity, FiMapPin, FiCamera
} from 'react-icons/fi';
import PageTransition from '../../../shared/components/PageTransition';
import toast from 'react-hot-toast';
import { formatPrice } from '../../../shared/utils/helpers';
import CashSettlementModal from '../components/CashSettlementModal';

import { useRef } from 'react';

const DeliveryProfile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { deliveryBoy, updateProfile, fetchProfile, fetchProfileSummary, isLoading, logout } = useDeliveryAuthStore();
  
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' or 'banking'
  const [isEditing, setIsEditing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [settlementHistory, setSettlementHistory] = useState([]);
  
  const [profileMetrics, setProfileMetrics] = useState({
    totalDeliveries: 0,
    completedToday: 0,
    earnings: 0,
    cashInHand: 0,
    totalCashCollected: 0,
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    vehicleType: '',
    vehicleNumber: '',
    emergencyContact: '',
    aadharNumber: '',
    upiId: '',
    bankDetails: {
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
      bankName: '',
    }
  });

  const loadProfile = useCallback(async () => {
    try {
      setLoadFailed(false);
      const profile = await fetchProfile();
      try {
        const summary = await fetchProfileSummary();
        setProfileMetrics({
          totalDeliveries: Number(summary?.totalDeliveries || 0),
          completedToday: Number(summary?.completedToday || 0),
          earnings: Number(summary?.earnings || 0),
          cashInHand: Number(summary?.cashInHand || 0),
          totalCashCollected: Number(summary?.totalCashCollected || 0),
        });
      } catch (err) {
        console.error("Summary fetch failed:", err);
        setProfileMetrics({
          totalDeliveries: Number(profile?.totalDeliveries || 0),
          completedToday: 0,
          earnings: 0,
          cashInHand: 0,
          totalCashCollected: 0,
        });
      }
    } catch {
      setLoadFailed(true);
    }
  }, [fetchProfile, fetchProfileSummary]);

  const loadSettlements = useCallback(async () => {
    try {
      const history = await useDeliveryAuthStore.getState().fetchSettlementHistory();
      setSettlementHistory(Array.isArray(history) ? history : (history.data || []));
    } catch (err) {
      console.error("Settlement history fetch failed:", err);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    loadSettlements();
  }, [loadProfile, loadSettlements]);

  useEffect(() => {
    if (deliveryBoy) {
      setFormData({
        name: deliveryBoy.name || '',
        email: deliveryBoy.email || '',
        phone: deliveryBoy.phone || '',
        vehicleType: deliveryBoy.vehicleType || '',
        vehicleNumber: deliveryBoy.vehicleNumber || '',
        emergencyContact: deliveryBoy.emergencyContact || '',
        aadharNumber: deliveryBoy.aadharNumber || '',
        upiId: deliveryBoy.upiId || '',
        bankDetails: {
          accountHolderName: deliveryBoy.bankDetails?.accountHolderName || '',
          accountNumber: deliveryBoy.bankDetails?.accountNumber || '',
          ifscCode: deliveryBoy.bankDetails?.ifscCode || '',
          bankName: deliveryBoy.bankDetails?.bankName || '',
        }
      });
    }
  }, [deliveryBoy]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [field, subField] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [field]: { ...prev[field], [subField]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) return toast.error('Name is required');
    if (!formData.email?.trim()) return toast.error('Email is required');
    
    // Plate Number Validation
    if (formData.vehicleNumber) {
      const normalizedPlate = formData.vehicleNumber.replace(/[-\s]/g, '').toUpperCase();
      const plateRegex = /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/;
      if (!plateRegex.test(normalizedPlate)) {
        return toast.error('Invalid Plate Number! Example: MH12AB1234');
      }
      formData.vehicleNumber = normalizedPlate; // Save normalized version
    }

    // Account Holder Name Validation
    if (formData.bankDetails?.accountHolderName) {
      if (!/^[a-zA-Z\s]+$/.test(formData.bankDetails.accountHolderName)) {
        return toast.error('Invalid Account Holder Name! Only letters and spaces are allowed.');
      }
    }

    if (formData.bankDetails?.bankName) {
      if (!/^[a-zA-Z\s]+$/.test(formData.bankDetails.bankName)) {
        return toast.error('Invalid Bank Name! Only letters and spaces are allowed.');
      }
    }

    if (formData.bankDetails?.accountNumber) {
      if (!/^[0-9]{9,18}$/.test(formData.bankDetails.accountNumber)) {
        return toast.error('Invalid Account Number! Must be 9-18 digits.');
      }
    }

    if (formData.bankDetails?.ifscCode) {
      const normalizedIfsc = formData.bankDetails.ifscCode.trim().toUpperCase();
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(normalizedIfsc)) {
        return toast.error('Invalid IFSC Code! Format: ABCD0123456');
      }
      formData.bankDetails.ifscCode = normalizedIfsc;
    }

    try {
      await updateProfile({
        ...formData,
        email: formData.email.trim().toLowerCase(),
      });
      setIsEditing(false);
      toast.success('KYC & Profile details updated successfully');
    } catch {
      // Error handled by API interceptor
    }
  };

  const handleCancel = () => {
    if (deliveryBoy) {
      setFormData({
        name: deliveryBoy.name || '',
        email: deliveryBoy.email || '',
        phone: deliveryBoy.phone || '',
        vehicleType: deliveryBoy.vehicleType || '',
        vehicleNumber: deliveryBoy.vehicleNumber || '',
        emergencyContact: deliveryBoy.emergencyContact || '',
        aadharNumber: deliveryBoy.aadharNumber || '',
        upiId: deliveryBoy.upiId || '',
        bankDetails: {
          accountHolderName: deliveryBoy.bankDetails?.accountHolderName || '',
          accountNumber: deliveryBoy.bankDetails?.accountNumber || '',
          ifscCode: deliveryBoy.bankDetails?.ifscCode || '',
          bankName: deliveryBoy.bankDetails?.bankName || '',
        }
      });
    }
    setIsEditing(false);
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/delivery/login');
  };

  const handleImageClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) return toast.error('Image size must be less than 2MB');

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64String = reader.result;
        await updateProfile({ avatar: base64String });
        toast.success('Profile picture updated!');
      } catch (err) {
        toast.error('Failed to update profile picture');
      }
    };
    reader.readAsDataURL(file);
  };

  const stats = [
    { label: 'Total Earnings', value: formatPrice(Number(deliveryBoy?.totalEarnings || 0)), icon: FiCreditCard, bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
    { label: 'Available Payout', value: formatPrice(Number(deliveryBoy?.availableBalance || 0)), icon: FiDollarSign, bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    { label: 'Cash in Hand', value: formatPrice(Number(profileMetrics.cashInHand || 0)), icon: FiActivity, bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
    { label: 'Total Deliveries', value: Number(deliveryBoy?.totalDeliveries || 0), icon: FiTruck, bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' },
    { label: 'Completed Today', value: Number(profileMetrics.completedToday || 0), icon: FiCheckCircle, bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
    { label: 'Avg Rating', value: Number(deliveryBoy?.rating || 0).toFixed(1), icon: FiUser, bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
  ];

  if (loadFailed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <FiAlertCircle size={48} className="text-rose-500 mb-4" />
        <h2 className="text-xl font-black text-slate-800">Connection Error</h2>
        <p className="text-slate-500 mt-2">Failed to load profile details. Please check your connection.</p>
        <button onClick={() => window.location.reload()} className="mt-6 px-8 py-3 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg">Retry</button>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* Profile Header (Proper Logistics Style) */}
        <div className="bg-[#1E293B] pt-6 pb-12 px-4 relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10 flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Partner Account</h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Status & Credentials</p>
            </div>
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center text-white">
                <FiEdit2 size={16} />
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={isLoading} className="w-10 h-10 bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center text-white shadow-lg">
                  <FiSave size={16} />
                </button>
                <button onClick={handleCancel} className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white">
                  <FiX size={16} />
                </button>
              </div>
            )}
          </div>

          <div className="relative z-10 flex items-center gap-4">
             <div 
              onClick={handleImageClick}
              className="w-16 h-16 shrink-0 aspect-square bg-[#0F172A] rounded-2xl flex items-center justify-center border-2 border-white/10 shadow-xl relative group cursor-pointer overflow-hidden"
            >
              {deliveryBoy?.avatar ? (
                <img src={deliveryBoy.avatar} alt="P" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-xl font-bold">{deliveryBoy?.name?.charAt(0) || 'D'}</span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <FiCamera className="text-white" size={18} />
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
            </div>
            
            <div className="flex-1 min-w-0">
               <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-white tracking-tight truncate">{deliveryBoy?.name || 'Partner'}</h2>
                {deliveryBoy?.kycStatus === 'verified' && <FiCheckCircle size={14} className="text-emerald-400 shrink-0" />}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <FiMail size={11} className="shrink-0" />
                  <span className="text-[10px] font-medium truncate max-w-[120px]">{deliveryBoy?.email}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <FiPhone size={11} className="shrink-0" />
                  <span className="text-[10px] font-medium">{deliveryBoy?.phone}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="px-4 -mt-6 relative z-20 space-y-4 pb-24 max-w-lg mx-auto">
          {/* Dashboard Stats */}
          <div className="grid grid-cols-2 gap-3">
             {stats.slice(0, 4).map((stat) => (
                <div key={stat.label} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${stat.bg} ${stat.text} border ${stat.border} flex items-center justify-center shrink-0`}>
                       <stat.icon size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                      <p className="text-[13px] font-bold text-slate-800 truncate">{stat.value}</p>
                    </div>
                  </div>
                </div>
             ))}
          </div>

          {/* Navigation Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200/50 shadow-inner">
            {['personal', 'banking'].map((tab) => (
               <button
                 key={tab}
                 onClick={() => { setActiveTab(tab); setIsEditing(false); }}
                 className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-[#1E293B] text-white shadow-lg' : 'text-slate-400'}`}
               >
                 {tab === 'personal' ? 'Identity' : 'Settlement'}
               </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'personal' ? (
              <motion.div key="identity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-0.5 h-3 bg-indigo-600 rounded-full" />
                    <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Personal Ledger</h2>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                        {isEditing ? (
                          <input name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none font-bold text-sm text-slate-800" />
                        ) : (
                          <div className="px-4 py-3 bg-slate-100/50 rounded-xl font-bold text-sm text-slate-800">{formData.name || 'Set Name'}</div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Vehicle Type</label>
                          {isEditing ? (
                             <select name="vehicleType" value={formData.vehicleType} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none font-bold text-sm text-slate-800">
                               <option value="">Select Type</option>
                               <option value="Two Wheeler">Two Wheeler</option>
                               <option value="Three Wheeler">Three Wheeler</option>
                               <option value="Four Wheeler">Four Wheeler</option>
                             </select>
                          ) : (
                             <div className="px-4 py-3 bg-slate-100/50 rounded-xl font-bold text-sm text-slate-800">{formData.vehicleType || 'Not Specified'}</div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Plate Number</label>
                          {isEditing ? (
                             <input name="vehicleNumber" value={formData.vehicleNumber} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none font-bold text-sm text-slate-800 uppercase" />
                          ) : (
                             <div className="px-4 py-3 bg-slate-100/50 rounded-xl font-bold text-sm text-slate-800 uppercase">{formData.vehicleNumber || 'Registering...'}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="banking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className={`p-4 rounded-2xl border flex items-center gap-4 ${deliveryBoy?.kycStatus === 'verified' ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${deliveryBoy?.kycStatus === 'verified' ? 'bg-emerald-600' : 'bg-amber-600'}`}>
                    <FiCheckCircle size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Verification Status</p>
                    <h3 className="text-[15px] font-bold text-slate-800 tracking-tight leading-none">
                      {deliveryBoy?.kycStatus === 'verified' ? 'System Verified' : 'Under Review'}
                    </h3>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-4">
                   <div className="flex items-center gap-2 mb-1">
                    <div className="w-0.5 h-3 bg-indigo-600 rounded-full" />
                    <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Settlement Vault</h2>
                  </div>

                  {/* Cash in Hand Section */}
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest leading-none mb-1">Cash in Hand</p>
                      <h3 className="text-xl font-bold text-slate-800">{formatPrice(profileMetrics.cashInHand)}</h3>
                    </div>
                    <button 
                      onClick={() => setIsSettlementModalOpen(true)}
                      className="px-4 py-2 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all"
                    >
                      Settle Now
                    </button>
                  </div>

                  <div className="space-y-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Account Holder</label>
                        {isEditing ? (
                          <input name="bankDetails.accountHolderName" value={formData.bankDetails.accountHolderName} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none font-bold text-sm text-slate-800 uppercase" />
                        ) : (
                          <div className="px-4 py-3 bg-slate-100/50 rounded-xl font-bold text-sm text-slate-800 uppercase">{formData.bankDetails.accountHolderName || 'Verify Bank'}</div>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Bank Name</label>
                        {isEditing ? (
                          <input name="bankDetails.bankName" value={formData.bankDetails.bankName} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none font-bold text-sm text-slate-800" />
                        ) : (
                          <div className="px-4 py-3 bg-slate-100/50 rounded-xl font-bold text-sm text-slate-800">{formData.bankDetails.bankName || 'Not Set'}</div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Account No.</label>
                          {isEditing ? (
                            <input name="bankDetails.accountNumber" value={formData.bankDetails.accountNumber} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none font-bold text-sm text-slate-800" />
                          ) : (
                            <div className="px-4 py-3 bg-slate-100/50 rounded-xl font-bold text-sm text-slate-800 tracking-tighter">•••• {formData.bankDetails.accountNumber?.slice(-4) || 'XXXX'}</div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">IFSC Code</label>
                          {isEditing ? (
                            <input name="bankDetails.ifscCode" value={formData.bankDetails.ifscCode} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none font-bold text-sm text-slate-800 uppercase" />
                          ) : (
                            <div className="px-4 py-3 bg-slate-100/50 rounded-xl font-bold text-sm text-slate-800 uppercase">{formData.bankDetails.ifscCode || 'None'}</div>
                          )}
                        </div>
                      </div>
                  </div>
                </div>

                {/* Settlement History */}
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-0.5 h-3 bg-indigo-600 rounded-full" />
                    <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Settlement History</h2>
                  </div>
                  
                  <div className="space-y-3">
                    {settlementHistory.length > 0 ? (
                      settlementHistory.map((item) => (
                        <div key={item._id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div>
                            <p className="text-[10px] font-bold text-slate-800 mb-0.5">₹{item.amount}</p>
                            <p className="text-[8px] text-slate-400 font-medium italic">
                              {new Date(item.settledAt || item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[8px] font-bold uppercase tracking-wider">
                              Completed
                            </span>
                            <p className="text-[7px] text-slate-400 mt-1">ID: {item.razorpayPaymentId?.slice(-8) || 'N/A'}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center">
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No settlement history</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Logout Section */}
          {!isEditing && (
            <div className="flex flex-col gap-4">
              <button onClick={handleLogout} className="flex items-center justify-center gap-3 w-full py-4 bg-white border border-rose-100 text-rose-600 rounded-2xl font-bold uppercase text-[11px] tracking-widest shadow-sm active:scale-95 transition-all">
                <FiLogOut size={16} /> Sign Out Partner
              </button>
              <div className="text-center opacity-30">
                <p className="text-[8px] font-bold text-slate-900 uppercase tracking-widest">Infrastructure Secure • v2.0.4</p>
              </div>
            </div>
          )}
        </div>

        <CashSettlementModal 
          isOpen={isSettlementModalOpen}
          onClose={() => setIsSettlementModalOpen(false)}
          cashInHand={profileMetrics.cashInHand}
          onSettlementComplete={() => {
            loadProfile();
            loadSettlements();
          }}
        />
      </div>
  );
};

export default DeliveryProfile;
