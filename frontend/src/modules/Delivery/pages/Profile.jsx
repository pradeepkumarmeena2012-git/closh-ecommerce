import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDeliveryAuthStore } from '../store/deliveryStore';
import { FiUser, FiMail, FiPhone, FiTruck, FiEdit2, FiSave, FiX, FiLogOut, FiCheckCircle, FiCreditCard } from 'react-icons/fi';
import PageTransition from '../../../shared/components/PageTransition';
import toast from 'react-hot-toast';
import { formatPrice } from '../../../shared/utils/helpers';

const DeliveryProfile = () => {
  const navigate = useNavigate();
  const { deliveryBoy, updateProfile, fetchProfile, fetchProfileSummary, isLoading, logout } = useDeliveryAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [profileMetrics, setProfileMetrics] = useState({
    totalDeliveries: 0,
    completedToday: 0,
    earnings: 0,
  });
  const [formData, setFormData] = useState({
    name: deliveryBoy?.name || '',
    email: deliveryBoy?.email || '',
    phone: deliveryBoy?.phone || '',
    vehicleType: deliveryBoy?.vehicleType || '',
    vehicleNumber: deliveryBoy?.vehicleNumber || '',
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
        });
      } catch {
        setProfileMetrics({
          totalDeliveries: Number(profile?.totalDeliveries || 0),
          completedToday: 0,
          earnings: 0,
        });
      }
    } catch {
      setLoadFailed(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    setFormData({
      name: deliveryBoy?.name || '',
      email: deliveryBoy?.email || '',
      phone: deliveryBoy?.phone || '',
      vehicleType: deliveryBoy?.vehicleType || '',
      vehicleNumber: deliveryBoy?.vehicleNumber || '',
    });
  }, [deliveryBoy]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!formData.email?.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!formData.phone?.trim()) {
      toast.error('Phone is required');
      return;
    }
    try {
      await updateProfile({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        vehicleType: formData.vehicleType?.trim() || '',
        vehicleNumber: formData.vehicleNumber?.trim() || '',
      });
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch {
      // Error toast handled by API interceptor.
    }
  };

  const handleCancel = () => {
    setFormData({
      name: deliveryBoy?.name || '',
      email: deliveryBoy?.email || '',
      phone: deliveryBoy?.phone || '',
      vehicleType: deliveryBoy?.vehicleType || '',
      vehicleNumber: deliveryBoy?.vehicleNumber || '',
    });
    setIsEditing(false);
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/delivery/login');
  };

  const stats = [
    { label: 'Total Deliveries', value: Number(profileMetrics.totalDeliveries || 0), icon: FiTruck, bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' },
    { label: 'Completed Today', value: Number(profileMetrics.completedToday || 0), icon: FiCheckCircle, bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
    { label: 'Rating', value: Number(deliveryBoy?.rating || 0).toFixed(1), icon: FiUser, bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
    { label: 'Earnings', value: formatPrice(Number(profileMetrics.earnings || 0)), icon: FiCreditCard, bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
  ];

  return (
    <PageTransition>
      <div className="px-4 pt-4 pb-6 space-y-6">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-[28px] p-6 text-white shadow-xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
          <div className="flex items-center justify-between mb-6 relative z-10">
            <h1 className="text-2xl font-black tracking-tight">Account</h1>
            <div className="flex gap-2">
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="p-2.5 bg-white/20 rounded-xl hover:bg-white/30 backdrop-blur-md transition-all">
                  <FiEdit2 size={18} />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={isLoading} className="p-2.5 bg-emerald-500 rounded-xl hover:bg-emerald-600 shadow-lg transition-all">
                    <FiSave size={18} />
                  </button>
                  <button onClick={handleCancel} className="p-2.5 bg-white/20 rounded-xl hover:bg-white/30 backdrop-blur-md transition-all">
                    <FiX size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-5 relative z-10">
            <div className="w-20 h-20 shrink-0 aspect-square bg-white/20 rounded-full flex items-center justify-center text-4xl font-black backdrop-blur-md border border-white/20 shadow-inner">
              {deliveryBoy?.name?.charAt(0) || 'D'}
            </div>
            <div>
              <p className="text-xl font-black tracking-tight">
                {isEditing ? (formData.name || 'Your Name') : (deliveryBoy?.name || 'Delivery Boy')}
              </p>
              <div className="flex items-center gap-1.5 mt-1 text-primary-100/80">
                <FiMail size={12} />
                <p className="text-xs font-bold">
                  {isEditing ? (formData.email || 'your@email.com') : (deliveryBoy?.email || 'email@example.com')}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`${stat.bg} ${stat.border} border rounded-[24px] p-4 shadow-sm relative overflow-hidden group`}
              >
                <div className="relative z-10">
                  <div className={`w-8 h-8 ${stat.bg.replace('50', '100')} rounded-lg flex items-center justify-center mb-3 text-lg ${stat.text}`}>
                    <Icon />
                  </div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className={`text-2xl font-black ${stat.text.replace('600', '700')}`}>{stat.value}</p>
                </div>
                <div className={`absolute -right-2 -bottom-2 opacity-5 scale-150 transform group-hover:rotate-12 transition-transform ${stat.text}`}>
                  <Icon size={60} />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Profile Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-4 shadow-sm space-y-4"
        >
          <h2 className="text-lg font-bold text-gray-800 mb-4">Personal Information</h2>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <FiUser />
              Full Name
            </label>
            {isEditing ? (
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none"
              />
            ) : (
              <p className="px-4 py-3 bg-white rounded-xl text-gray-800">{formData.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <FiMail />
              Email Address
            </label>
            {isEditing ? (
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none"
              />
            ) : (
              <p className="px-4 py-3 bg-white rounded-xl text-gray-800">{formData.email}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <FiPhone />
              Phone Number
            </label>
            {isEditing ? (
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none"
              />
            ) : (
              <p className="px-4 py-3 bg-white rounded-xl text-gray-800">{formData.phone}</p>
            )}
          </div>
        </motion.div>

        {/* Vehicle Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-4 shadow-sm space-y-4"
        >
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FiTruck />
            Vehicle Information
          </h2>

          {/* Vehicle Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Vehicle Type</label>
            {isEditing ? (
              <select
                name="vehicleType"
                value={formData.vehicleType}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none"
              >
                <option value="Bike">Bike</option>
                <option value="Car">Car</option>
                <option value="Scooter">Scooter</option>
                <option value="Van">Van</option>
              </select>
            ) : (
              <p className="px-4 py-3 bg-white rounded-xl text-gray-800">{formData.vehicleType}</p>
            )}
          </div>

          {/* Vehicle Number */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Vehicle Number</label>
            {isEditing ? (
              <input
                type="text"
                name="vehicleNumber"
                value={formData.vehicleNumber}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none"
              />
            ) : (
              <p className="px-4 py-3 bg-white rounded-xl text-gray-800">{formData.vehicleNumber}</p>
            )}
          </div>
        </motion.div>

        {/* Logout Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <button
            onClick={handleLogout}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-colors"
          >
            <FiLogOut className="text-xl" />
            <span>Logout</span>
          </button>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default DeliveryProfile;

