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

import { useRef } from 'react';

const DeliveryProfile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { deliveryBoy, updateProfile, fetchProfile, fetchProfileSummary, isLoading, logout } = useDeliveryAuthStore();
  
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' or 'banking'
  const [isEditing, setIsEditing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  
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

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

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
    { label: 'Total Deliveries', value: Number(deliveryBoy?.totalDeliveries || 0), icon: FiTruck, bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' },
    { label: 'Completed Today', value: Number(profileMetrics.completedToday || 0), icon: FiCheckCircle, bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
    { label: 'Cash in Hand', value: formatPrice(Number(profileMetrics.cashInHand || 0)), icon: FiActivity, bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
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
    <PageTransition>
      <div className="px-4 pt-3 pb-24 space-y-4 max-w-lg mx-auto overflow-x-hidden">
        {/* Profile Header (Compact) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-[28px] p-4 text-white shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-2xl" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h1 className="text-xl font-black tracking-tight leading-none uppercase tracking-widest opacity-80">Account</h1>
            <div className="flex gap-2">
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="w-9 h-9 bg-white/20 rounded-xl hover:bg-white/30 backdrop-blur-md transition-all shadow-lg active:scale-95 flex items-center justify-center">
                  <FiEdit2 size={16} />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={isLoading} className="w-9 h-9 bg-emerald-500 rounded-xl hover:bg-emerald-600 shadow-lg transition-all active:scale-95 flex items-center justify-center">
                    <FiSave size={16} />
                  </button>
                  <button onClick={handleCancel} className="w-9 h-9 bg-white/20 rounded-xl hover:bg-white/30 backdrop-blur-md transition-all active:scale-95 flex items-center justify-center">
                    <FiX size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleImageChange} 
          />

          <div className="flex flex-col gap-3 relative z-10">
            <div className="flex items-center gap-4">
              <div 
                onClick={handleImageClick}
                className="w-16 h-16 shrink-0 aspect-square bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-black backdrop-blur-md border border-white/20 shadow-inner relative group cursor-pointer overflow-hidden"
              >
                {deliveryBoy?.avatar ? (
                  <img src={deliveryBoy.avatar} alt="P" className="w-full h-full object-cover" />
                ) : (
                  <span className="opacity-80">{deliveryBoy?.name?.charAt(0) || 'D'}</span>
                )}
                {/* Camera Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <FiCamera className="text-white" size={18} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-lg font-black tracking-tight leading-none truncate">
                    {deliveryBoy?.name || 'Partner'}
                  </p>
                  {deliveryBoy?.kycStatus === 'verified' && (
                    <FiCheckCircle size={12} className="text-emerald-400" />
                  )}
                </div>
                <div className="flex items-center gap-1 text-primary-100/80 mb-0.5">
                  <FiMail size={10} className="shrink-0" />
                  <p className="text-[10px] font-bold truncate tracking-tight">{deliveryBoy?.email || 'email@closh.com'}</p>
                </div>
                <div className="flex items-center gap-1 text-primary-100/80">
                  <FiPhone size={10} className="shrink-0" />
                  <p className="text-[10px] font-bold tracking-tight">{deliveryBoy?.phone || 'No phone set'}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-sm border border-white/10 flex items-center gap-2">
                <FiTruck className="text-primary-200 shrink-0" size={14} />
                <div className="min-w-0">
                  <p className="text-[7px] uppercase font-black tracking-widest text-primary-200 leading-none mb-0.5">Vehicle</p>
                  <p className="text-[10px] font-black truncate leading-none">{deliveryBoy?.vehicleType || 'None'}</p>
                </div>
              </div>
              <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-sm border border-white/10 flex items-center gap-2">
                <FiMapPin className="text-primary-200 shrink-0" size={14} />
                <div className="min-w-0">
                  <p className="text-[7px] uppercase font-black tracking-widest text-primary-200 leading-none mb-0.5">ID No.</p>
                  <p className="text-[10px] font-black truncate leading-none">{deliveryBoy?.vehicleNumber || 'Pending'}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tab Selection */}
        <div className="flex gap-1.5 p-1 bg-slate-100 rounded-[20px]">
          <button
            onClick={() => { setActiveTab('personal'); setIsEditing(false); }}
            className={`flex-1 py-3 px-2 rounded-[16px] text-[9px] font-black uppercase tracking-[0.1em] transition-all ${activeTab === 'personal' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500'}`}
          >
            Identity
          </button>
          <button
            onClick={() => { setActiveTab('banking'); setIsEditing(false); }}
            className={`flex-1 py-3 px-2 rounded-[16px] text-[9px] font-black uppercase tracking-[0.1em] transition-all ${activeTab === 'banking' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500'}`}
          >
            KYC & Bank
          </button>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'personal' ? (
            <motion.div
              key="personal"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-4"
            >
              {/* High-Density Stats Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {stats.map((stat, idx) => (
                  <div key={stat.label} className={`p-3 rounded-[24px] ${stat.bg} ${stat.border} border shadow-sm relative overflow-hidden`}>
                    <div className="relative z-10 flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg ${stat.bg.replace('50', '200')} flex items-center justify-center ${stat.text} shrink-0`}>
                        <stat.icon size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[7px] font-black uppercase tracking-widest mb-0.5 leading-none opacity-60">{stat.label}</p>
                        <p className={`text-sm font-black ${stat.text.replace('600', '900')} tracking-tight truncate`}>{stat.value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Personal Identity Form */}
              <div className="bg-white rounded-[28px] p-4 shadow-sm border border-slate-100 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1 h-3 bg-primary-600 rounded-full" />
                  <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Partner Identity</h2>
                </div>
                
                <div className="space-y-3">
                  <div className="relative">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Full Name</label>
                    {isEditing ? (
                      <input name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-primary-500 outline-none font-black text-sm text-slate-800 transition-all shadow-inner" />
                    ) : (
                      <p className="px-4 py-3 bg-slate-50/50 rounded-xl font-black text-xs text-slate-700">{formData.name || 'Not Set'}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Email Address</label>
                      {isEditing ? (
                        <input name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-primary-500 outline-none font-bold text-sm text-slate-800 transition-all shadow-inner" />
                      ) : (
                        <p className="px-4 py-3 bg-slate-50/50 rounded-xl font-bold text-xs text-slate-700 truncate">{formData.email || 'Not Set'}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Phone Number</label>
                      {isEditing ? (
                        <input name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-primary-500 outline-none font-black text-xs text-slate-800 transition-all shadow-inner" />
                      ) : (
                        <p className="px-4 py-3 bg-slate-50/50 rounded-xl font-bold text-xs text-slate-700">{formData.phone || 'Not Set'}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Emergency</label>
                      {isEditing ? (
                        <input name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-primary-500 outline-none font-black text-xs text-slate-800 transition-all shadow-inner" />
                      ) : (
                        <p className="px-4 py-3 bg-slate-50/50 rounded-xl font-bold text-xs text-slate-700">{formData.emergencyContact || 'Not Set'}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="banking"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-4"
            >
              {/* KYC Status Card */}
              <div className={`p-4 rounded-[28px] border-2 flex items-start gap-3 shadow-sm ${
                deliveryBoy?.kycStatus === 'verified' ? 'bg-emerald-50 border-emerald-100' :
                deliveryBoy?.kycStatus === 'pending' ? 'bg-amber-50 border-amber-100' :
                deliveryBoy?.kycStatus === 'rejected' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
                  deliveryBoy?.kycStatus === 'verified' ? 'bg-emerald-500 text-white' :
                  deliveryBoy?.kycStatus === 'pending' ? 'bg-amber-500 text-white' :
                  deliveryBoy?.kycStatus === 'rejected' ? 'bg-rose-500 text-white' : 'bg-slate-400 text-white'
                }`}>
                  {deliveryBoy?.kycStatus === 'verified' ? <FiCheckCircle size={20} /> : <FiInfo size={20} />}
                </div>
                <div className="flex-1">
                  <p className={`text-[8px] font-black uppercase tracking-widest leading-none mb-1 opacity-70`}>KYC Status</p>
                  <h3 className="text-base font-black text-slate-800 leading-tight">
                    {deliveryBoy?.kycStatus === 'verified' ? 'Verified' :
                     deliveryBoy?.kycStatus === 'pending' ? 'Reviewing' :
                     deliveryBoy?.kycStatus === 'rejected' ? 'Rejected' : 'Setup Required'}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-500 mt-0.5 leading-tight">
                    {deliveryBoy?.kycStatus === 'verified' ? 'Earnings are settled automatically.' :
                     deliveryBoy?.kycStatus === 'pending' ? 'Verification is in progress.' :
                     deliveryBoy?.kycRejectionReason || 'Please submit bank details for payouts.'}
                  </p>
                </div>
              </div>

              {/* Bank Account Form */}
              <div className="bg-white rounded-[28px] p-4 shadow-sm border border-slate-100 space-y-4">
                <div className="flex items-center gap-2 text-primary-600 mb-1">
                  <FiCreditCard size={14} className="shrink-0" />
                  <span className="text-[9px] font-black uppercase tracking-widest leading-none">Settlement Account</span>
                </div>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Account Holder</label>
                      {isEditing ? (
                        <input name="bankDetails.accountHolderName" value={formData.bankDetails.accountHolderName} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-primary-500 outline-none font-black text-sm text-slate-800 transition-all uppercase shadow-inner" />
                      ) : (
                        <p className="px-4 py-3 bg-slate-50/50 rounded-xl font-black text-xs uppercase text-slate-700">{formData.bankDetails.accountHolderName || 'Not Set'}</p>
                      )}
                    </div>
                    <div className="col-span-2">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Bank Name</label>
                        {isEditing ? (
                          <input name="bankDetails.bankName" value={formData.bankDetails.bankName} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-indigo-500 outline-none font-black text-sm text-slate-800 transition-all shadow-inner" />
                        ) : (
                          <p className="px-4 py-3 bg-slate-50/50 rounded-xl font-bold text-xs text-slate-700">{formData.bankDetails.bankName || 'Not Set'}</p>
                        )}
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Account No.</label>
                      {isEditing ? (
                        <input name="bankDetails.accountNumber" value={formData.bankDetails.accountNumber} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-primary-500 outline-none font-bold text-xs text-slate-800 transition-all font-mono shadow-inner" />
                      ) : (
                        <p className="px-4 py-3 bg-slate-50/50 rounded-xl font-bold text-xs text-slate-700 font-mono tracking-tighter">
                          {formData.bankDetails.accountNumber ? `•••• ${formData.bankDetails.accountNumber.slice(-4)}` : 'No Set'}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">IFSC Code</label>
                      {isEditing ? (
                        <input name="bankDetails.ifscCode" value={formData.bankDetails.ifscCode} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-primary-500 outline-none font-bold text-xs text-slate-800 transition-all uppercase font-mono shadow-inner" />
                      ) : (
                        <p className="px-4 py-3 bg-slate-50/50 rounded-xl font-bold text-xs text-slate-700 font-mono uppercase">{formData.bankDetails.ifscCode || 'None'}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* sign out */}
        {!isEditing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-3 pt-2"
          >
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-3 w-full py-3.5 bg-white border-2 border-rose-100 text-rose-600 rounded-[20px] font-black uppercase text-[10px] tracking-widest hover:bg-rose-50 transition-all active:scale-95 shadow-sm"
            >
              <FiLogOut size={16} />
              Sign Out
            </button>
            <p className="text-[8px] font-black text-slate-400 text-center uppercase tracking-[0.2em] opacity-40">CLOSH DELIVERY • v2.0.4</p>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
};

export default DeliveryProfile;
