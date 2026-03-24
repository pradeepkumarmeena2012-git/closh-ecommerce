import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiPhone, FiShoppingBag, FiMapPin } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useVendorAuthStore } from "../store/vendorAuthStore";
import toast from 'react-hot-toast';
import logo from '../../../assets/animations/lottie/logo-removebg.png';

const VendorRegister = () => {
  const navigate = useNavigate();
  const { register: registerVendor, isLoading } = useVendorAuthStore();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    storeName: '',
    storeDescription: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA',
    },
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData({
        ...formData,
        address: { ...formData.address, [addressField]: value },
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || !formData.password || !formData.storeName) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    try {
      const result = await registerVendor({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        phone: formData.phone.trim(),
        storeName: formData.storeName.trim(),
        storeDescription: formData.storeDescription.trim(),
        address: formData.address,
      });
      toast.success(result.message || 'Registration successful!');
      navigate('/vendor/verification', { state: { email: formData.email } });
    } catch (error) {
      toast.error(error.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col md:flex-row overflow-hidden">
      {/* Left Side: Branding */}
      <div className="hidden md:flex md:w-2/5 items-center justify-center p-12 bg-[#0f172a] relative border-r border-white/5">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[32rem] h-[32rem] bg-blue-600/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 text-center">
          <div className="w-32 h-32 bg-white/5 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-white/10 shadow-2xl">
            <img src={logo} alt="CLOSH" className="w-20 h-20 object-contain" />
          </div>
          <h1 className="text-5xl font-black text-white mb-4 tracking-tighter uppercase">JOIN CLOSH</h1>
          <p className="text-xl text-slate-400 font-medium">Start your journey as an elite vendor.</p>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="w-full md:w-3/5 flex items-center justify-center relative z-10 px-4 py-8 md:px-0">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white md:rounded-[2.5rem] p-8 md:p-12 w-full max-w-3xl shadow-2xl md:max-h-[90vh] overflow-y-auto no-scrollbar relative z-10 min-h-[90vh] md:min-h-0"
        >
          <style dangerouslySetInnerHTML={{ __html: `
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `}} />
          
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-3xl font-black text-gray-900 mb-2 uppercase tracking-tight">Become a Vendor</h2>
            <p className="text-gray-500 font-medium">Build your digital presence starting here</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Section: Identity */}
            <div className="space-y-6">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] border-b pb-2">Business Identity</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2">Vendor Name</label>
                  <div className="relative">
                    <FiUser className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" required className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-gray-300 text-gray-900" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2">Display Store Name</label>
                  <div className="relative">
                    <FiShoppingBag className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input type="text" name="storeName" value={formData.storeName} onChange={handleChange} placeholder="Elite Fashion Hub" required className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-gray-300 text-gray-900" />
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Contact */}
            <div className="space-y-6">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] border-b pb-2">Contact Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2">Official Email</label>
                  <div className="relative">
                    <FiMail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="vendor@example.com" required className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-gray-300 text-gray-900" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2">Phone Number</label>
                  <div className="relative">
                    <FiPhone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+12-34567890" required className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-gray-300 text-gray-900" />
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Address */}
            <div className="space-y-6">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] border-b pb-2">HQ Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2">Street Address</label>
                  <div className="relative">
                    <FiMapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input type="text" name="address.street" value={formData.address.street} onChange={handleChange} placeholder="123 Business Lane" className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-gray-300 text-gray-900" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2">City</label>
                  <input type="text" name="address.city" value={formData.address.city} onChange={handleChange} placeholder="New York" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-gray-300 text-gray-900" />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2">Zip Code</label>
                  <input type="text" name="address.zipCode" value={formData.address.zipCode} onChange={handleChange} placeholder="10001" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-gray-300 text-gray-900" />
                </div>
              </div>
            </div>

            {/* Section: Security */}
            <div className="space-y-6 text-gray-900">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] border-b pb-2 text-gray-900">Security Credentials</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2">Secret Code (Pass)</label>
                  <div className="relative">
                    <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" required className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-gray-300 text-gray-900" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-900">{showPassword ? <FiEyeOff /> : <FiEye />}</button>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2">Confirm Identity</label>
                  <div className="relative">
                    <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" required className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-gray-300 text-gray-900" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-900">{showConfirmPassword ? <FiEyeOff /> : <FiEye />}</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Submission */}
            <div className="pt-6 space-y-6">
              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6">
                <p className="text-sm font-medium text-blue-900 leading-relaxed">
                  <span className="font-black uppercase text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full mr-2">Policy</span> 
                  Verification email will be dispatched post-registration. Account activation requires subsequent administrative review.
                </p>
              </div>

              <button type="submit" disabled={isLoading} className="w-full bg-[#0f172a] text-white py-4 rounded-2xl font-black text-base hover:bg-slate-800 transition-all duration-300 shadow-xl active:scale-95 disabled:opacity-50">
                {isLoading ? 'Processing Registration...' : 'Complete Vendor Onboarding'}
              </button>

              <div className="text-center">
                <p className="text-sm font-medium text-gray-500">
                  Part of our elite already?{' '}
                  <Link to="/vendor/login" className="text-[#0f172a] hover:underline font-black">
                    Secure Login
                  </Link>
                </p>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default VendorRegister;
