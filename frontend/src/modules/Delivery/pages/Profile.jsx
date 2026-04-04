import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDeliveryAuthStore } from '../store/deliveryStore';
import { 
  FiUser, FiMail, FiPhone, FiTruck, FiEdit2, FiSave, FiX, FiLogOut, 
  FiCheckCircle, FiCreditCard, FiSmartphone, FiDollarSign, FiInfo, 
  FiAlertCircle, FiActivity, FiMapPin
} from 'react-icons/fi';
import PageTransition from '../../../shared/components/PageTransition';
import toast from 'react-hot-toast';
import { formatPrice } from '../../../shared/utils/helpers';

const DeliveryProfile = () => {
  const navigate = useNavigate();
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
      <div className="px-4 pt-4 pb-24 space-y-6 max-w-lg mx-auto">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-[32px] p-6 text-white shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
          <div className="flex items-center justify-between mb-6 relative z-10">
            <h1 className="text-2xl font-black tracking-tight">Account</h1>
            <div className="flex gap-2">
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="p-2.5 bg-white/20 rounded-xl hover:bg-white/30 backdrop-blur-md transition-all shadow-lg active:scale-95">
                  <FiEdit2 size={18} />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={isLoading} className="p-2.5 bg-emerald-500 rounded-xl hover:bg-emerald-600 shadow-lg transition-all active:scale-95">
                    <FiSave size={18} />
                  </button>
                  <button onClick={handleCancel} className="p-2.5 bg-white/20 rounded-xl hover:bg-white/30 backdrop-blur-md transition-all active:scale-95">
                    <FiX size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-5 relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 shrink-0 aspect-square bg-white/20 rounded-full flex items-center justify-center text-4xl font-black backdrop-blur-md border border-white/20 shadow-inner">
                {deliveryBoy?.name?.charAt(0) || 'D'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <p className="text-2xl font-black tracking-tight leading-none truncate">
                    {deliveryBoy?.name || 'Partner'}
                  </p>
                  {deliveryBoy?.kycStatus === 'verified' && (
                    <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-emerald-500/20">
                      <FiCheckCircle size={10} /> Verified
                    </span>
                  )}
                  {deliveryBoy?.kycStatus === 'pending' && (
                    <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-lg shadow-amber-500/20">
                      Pending Approval
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-primary-100/90 mb-1">
                  <FiMail size={12} className="shrink-0" />
                  <p className="text-xs font-bold truncate tracking-tight">{deliveryBoy?.email || 'email@closh.com'}</p>
                </div>
                <div className="flex items-center gap-1.5 text-primary-100/90">
                  <FiPhone size={12} className="shrink-0" />
                  <p className="text-xs font-bold tracking-tight">{deliveryBoy?.phone || 'No phone set'}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm border border-white/10 flex items-center gap-2">
                <FiTruck className="text-primary-200" size={14} />
                <div className="min-w-0">
                  <p className="text-[8px] uppercase font-black tracking-widest text-primary-200 leading-none mb-1">Vehicle</p>
                  <p className="text-xs font-bold truncate leading-none">{deliveryBoy?.vehicleType || 'None'}</p>
                </div>
              </div>
              <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm border border-white/10 flex items-center gap-2">
                <FiMapPin className="text-primary-200" size={14} />
                <div className="min-w-0">
                  <p className="text-[8px] uppercase font-black tracking-widest text-primary-200 leading-none mb-1">ID No.</p>
                  <p className="text-xs font-bold truncate leading-none">{deliveryBoy?.vehicleNumber || 'Pending'}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tab Selection */}
        <div className="flex gap-2 p-1.5 bg-slate-100 rounded-[24px]">
          <button
            onClick={() => { setActiveTab('personal'); setIsEditing(false); }}
            className={`flex-1 py-3.5 px-4 rounded-[18px] text-[10px] font-black uppercase tracking-[0.15em] transition-all ${activeTab === 'personal' ? 'bg-white text-primary-600 shadow-md ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Personal Info
          </button>
          <button
            onClick={() => { setActiveTab('banking'); setIsEditing(false); }}
            className={`flex-1 py-3.5 px-4 rounded-[18px] text-[10px] font-black uppercase tracking-[0.15em] transition-all ${activeTab === 'banking' ? 'bg-white text-primary-600 shadow-md ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
          >
            KYC & Banking
          </button>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'personal' ? (
            <motion.div
              key="personal"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                {stats.map((stat, idx) => (
                  <div key={stat.label} className={`p-4 rounded-[24px] ${stat.bg} ${stat.border} border shadow-sm relative overflow-hidden group`}>
                    <div className="relative z-10">
                      <div className={`w-8 h-8 rounded-xl ${stat.bg.replace('50', '100')} flex items-center justify-center mb-3 text-lg ${stat.text}`}>
                        <stat.icon size={16} />
                      </div>
                      <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.15em] mb-1 leading-none">{stat.label}</p>
                      <p className={`text-xl font-black ${stat.text.replace('600', '700')} tracking-tight`}>{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Personal Form */}
              <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 space-y-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-4 bg-primary-600 rounded-full" />
                  <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Partner Identity</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="relative">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Full Name</label>
                    {isEditing ? (
                      <input name="name" value={formData.name} onChange={handleChange} className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-primary-500 outline-none font-black text-slate-800 transition-all shadow-inner" />
                    ) : (
                      <p className="px-5 py-4 bg-slate-50/50 rounded-2xl font-black text-slate-700">{formData.name || 'Not Set'}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Email Address</label>
                      {isEditing ? (
                        <input name="email" value={formData.email} onChange={handleChange} className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-primary-500 outline-none font-black text-slate-800 transition-all font-mono text-sm shadow-inner" />
                      ) : (
                        <p className="px-5 py-4 bg-slate-50/50 rounded-2xl font-bold text-slate-700 truncate">{formData.email || 'Not Set'}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Phone Number</label>
                      {isEditing ? (
                        <input name="phone" value={formData.phone} onChange={handleChange} className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-primary-500 outline-none font-black text-slate-800 transition-all shadow-inner" />
                      ) : (
                        <p className="px-5 py-4 bg-slate-50/50 rounded-2xl font-bold text-slate-700">{formData.phone || 'Not Set'}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Emergency Contact</label>
                      {isEditing ? (
                        <input name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-primary-500 outline-none font-black text-slate-800 transition-all shadow-inner" />
                      ) : (
                        <p className="px-5 py-4 bg-slate-50/50 rounded-2xl font-bold text-slate-700">{formData.emergencyContact || 'Not Set'}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Aadhar / Government ID</label>
                    {isEditing ? (
                      <input name="aadharNumber" value={formData.aadharNumber} onChange={handleChange} className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-primary-500 outline-none font-bold text-slate-800 transition-all shadow-inner" />
                    ) : (
                      <p className="px-5 py-4 bg-slate-50/50 rounded-2xl font-black text-slate-700">{formData.aadharNumber || 'Not Set'}</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="banking"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* KYC Status Indicator */}
              <div className={`p-6 rounded-[32px] border-2 flex items-start gap-4 shadow-sm ${
                deliveryBoy?.kycStatus === 'verified' ? 'bg-emerald-50 border-emerald-100' :
                deliveryBoy?.kycStatus === 'pending' ? 'bg-amber-50 border-amber-100' :
                deliveryBoy?.kycStatus === 'rejected' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                  deliveryBoy?.kycStatus === 'verified' ? 'bg-emerald-500 text-white' :
                  deliveryBoy?.kycStatus === 'pending' ? 'bg-amber-500 text-white' :
                  deliveryBoy?.kycStatus === 'rejected' ? 'bg-rose-500 text-white' : 'bg-slate-400 text-white'
                }`}>
                  {deliveryBoy?.kycStatus === 'verified' ? <FiCheckCircle size={24} /> : <FiInfo size={24} />}
                </div>
                <div className="flex-1">
                  <p className={`text-[10px] font-black uppercase tracking-widest leading-none mb-1.5 ${
                    deliveryBoy?.kycStatus === 'verified' ? 'text-emerald-700' :
                    deliveryBoy?.kycStatus === 'pending' ? 'text-amber-700' :
                    deliveryBoy?.kycStatus === 'rejected' ? 'text-rose-700' : 'text-slate-500'
                  }`}>
                    KYC Verification
                  </p>
                  <h3 className="text-lg font-black text-slate-800 leading-tight">
                    {deliveryBoy?.kycStatus === 'verified' ? 'System Verified' :
                     deliveryBoy?.kycStatus === 'pending' ? 'Verification Pending' :
                     deliveryBoy?.kycStatus === 'rejected' ? 'Verification Rejected' : 'Setup Required'}
                  </h3>
                  <p className="text-[11px] font-bold text-slate-500 mt-1 leading-relaxed">
                    {deliveryBoy?.kycStatus === 'verified' ? 'Your identity and banking are verified. Enjoy instant payouts.' :
                     deliveryBoy?.kycStatus === 'pending' ? 'The administration is currently verifying your updated details.' :
                     deliveryBoy?.kycRejectionReason || 'Please submit your bank details to enable automatic payouts.'}
                  </p>
                </div>
              </div>

              {/* Banking Form */}
                <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 space-y-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-primary-600">
                      <FiCreditCard className="shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-widest leading-none">Bank Account Settings</span>
                    </div>
                    {deliveryBoy?.kycStatus === 'verified' && (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 font-black text-[8px] uppercase tracking-wider shadow-sm">
                        <FiCheckCircle size={10} /> Verified Settlement Account
                      </span>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Account Holder (Legal Name)</label>
                        {isEditing ? (
                          <input name="bankDetails.accountHolderName" value={formData.bankDetails.accountHolderName} onChange={handleChange} className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none font-black text-slate-800 transition-all uppercase shadow-inner" placeholder="AS PER PASSBOOK" />
                        ) : (
                          <p className={`px-5 py-4 rounded-2xl font-black uppercase tracking-tighter ${deliveryBoy?.kycStatus === 'verified' ? 'bg-emerald-50/30 text-emerald-900 border border-emerald-100/50' : 'bg-slate-50/50 text-slate-700'}`}>
                            {formData.bankDetails.accountHolderName || 'Legal Name Needed'}
                          </p>
                        )}
                      </div>
                      
                      <div className="col-span-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Bank Name</label>
                        {isEditing ? (
                          <input name="bankDetails.bankName" value={formData.bankDetails.bankName} onChange={handleChange} className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none font-black text-slate-800 transition-all shadow-inner" placeholder="e.g. State Bank of India" />
                        ) : (
                          <p className="px-5 py-4 bg-slate-50/50 rounded-2xl font-bold text-slate-700">{formData.bankDetails.bankName || 'Partner Bank'}</p>
                        )}
                      </div>

                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">A/c Number</label>
                        {isEditing ? (
                          <input name="bankDetails.accountNumber" value={formData.bankDetails.accountNumber} onChange={handleChange} className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all font-mono shadow-inner" placeholder="0000 0000 0000" />
                        ) : (
                          <p className={`px-5 py-4 rounded-2xl font-bold font-mono ${deliveryBoy?.kycStatus === 'verified' ? 'bg-emerald-50/30 text-emerald-700 border border-emerald-100/50' : 'bg-slate-50/50 text-slate-700'}`}>
                            {formData.bankDetails.accountNumber ? `•••• ${formData.bankDetails.accountNumber.slice(-4)}` : '•••• 0000'}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">IFSC Code</label>
                        {isEditing ? (
                          <input name="bankDetails.ifscCode" value={formData.bankDetails.ifscCode} onChange={handleChange} className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all uppercase font-mono shadow-inner" placeholder="SBIN0001234" />
                        ) : (
                          <p className="px-5 py-4 bg-slate-50/50 rounded-2xl font-bold text-slate-700 font-mono uppercase">{formData.bankDetails.ifscCode || 'REQUIRED'}</p>
                        )}
                      </div>

                      <div className="col-span-2 pt-4 border-t border-slate-50">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <FiSmartphone className="text-rose-500" size={18} />
                            <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Instant UPI Connectivity</h3>
                          </div>
                          {deliveryBoy?.kycStatus === 'verified' && formData.upiId && (
                            <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">UPI ACTIVE</span>
                          )}
                        </div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">UPI ID</label>
                        {isEditing ? (
                          <input name="upiId" value={formData.upiId} onChange={handleChange} className="w-full px-5 py-4 bg-rose-50/50 text-rose-700 rounded-2xl border-2 border-transparent focus:border-rose-500 outline-none font-black transition-all lowercase shadow-inner" placeholder="username@upi" />
                        ) : (
                          <p className={`px-5 py-4 rounded-2xl font-black break-all ${deliveryBoy?.kycStatus === 'verified' && formData.upiId ? 'bg-emerald-50/30 text-emerald-600 border border-emerald-100/50' : 'bg-rose-50/30 text-rose-600'}`}>
                            {formData.upiId || 'No UPI ID Connected'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-2xl p-4 mt-2 ${deliveryBoy?.kycStatus === 'verified' ? 'bg-emerald-50/50' : 'bg-indigo-50'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest leading-none mb-2 ${deliveryBoy?.kycStatus === 'verified' ? 'text-emerald-700' : 'text-indigo-600'}`}>
                      {deliveryBoy?.kycStatus === 'verified' ? 'Active Settlement Policy' : 'Payout Policy'}
                    </p>
                    <p className={`text-[11px] font-bold leading-relaxed ${deliveryBoy?.kycStatus === 'verified' ? 'text-emerald-700/80' : 'text-indigo-700/80'}`}>
                      {deliveryBoy?.kycStatus === 'verified' 
                        ? 'Your banking details are verified. All earnings will be settled to this account as per the cycle.' 
                        : 'By submitting, you agree that your bank details are correct. Inaccurate data may delay your earnings settlements.'}
                    </p>
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
            className="flex flex-col gap-3 pt-4"
          >
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-3 w-full py-4 bg-white border-2 border-rose-100 text-rose-600 rounded-[24px] font-black uppercase text-[10px] tracking-widest hover:bg-rose-50 transition-all active:scale-95 shadow-sm"
            >
              <FiLogOut size={16} />
              Sign Out from Account
            </button>
            <p className="text-[9px] font-black text-slate-400 text-center uppercase tracking-[0.2em] opacity-60">CLOSH DELIVERY PARTNER • v2.0.4</p>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
};

export default DeliveryProfile;
