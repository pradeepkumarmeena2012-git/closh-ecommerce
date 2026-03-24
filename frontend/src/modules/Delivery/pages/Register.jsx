import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiPhone, FiTruck, FiMapPin, FiFileText } from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useDeliveryAuthStore } from '../store/deliveryStore';
import logo from '../../../assets/animations/lottie/logo-removebg.png';

const DeliveryRegister = () => {
  const navigate = useNavigate();
  const { register, isLoading } = useDeliveryAuthStore();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    vehicleType: 'Bike',
    vehicleNumber: '',
    password: '',
    confirmPassword: '',
    drivingLicense: null,
    drivingLicenseBack: null,
    aadharCard: null,
    aadharCardBack: null,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (['drivingLicense', 'drivingLicenseBack', 'aadharCard', 'aadharCardBack'].includes(name)) {
      setFormData((prev) => ({ ...prev, [name]: files?.[0] || null }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!formData.drivingLicense || !formData.drivingLicenseBack || !formData.aadharCard || !formData.aadharCardBack) {
      toast.error('All document images (Front & Back) are required');
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
      const result = await register({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        vehicleType: formData.vehicleType,
        vehicleNumber: formData.vehicleNumber.trim(),
        password: formData.password,
        drivingLicense: formData.drivingLicense,
        drivingLicenseBack: formData.drivingLicenseBack,
        aadharCard: formData.aadharCard,
        aadharCardBack: formData.aadharCardBack,
      });
      toast.success(result.message || 'Registration submitted');
      navigate('/delivery/login', { replace: true });
    } catch (error) {
      toast.error(error.message || 'Registration failed');
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
          <h1 className="text-5xl font-black text-white mb-4 tracking-tighter uppercase">RIDE CLOSH</h1>
          <p className="text-xl text-slate-400 font-medium">Join the elite network of delivery partners.</p>
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
            <h2 className="text-3xl font-black text-gray-900 mb-2 uppercase tracking-tight">Partner Enrollment</h2>
            <p className="text-gray-500 font-medium">Complete your application to join the team</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-12">
            {/* Identity Info */}
            <div className="space-y-6">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] border-b pb-2">Primary Identity</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2 px-1">Full Operator Name</label>
                  <div className="relative">
                    <FiUser className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" required className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-gray-300 focus:outline-none text-gray-900" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2 px-1">Email Connection</label>
                  <div className="relative">
                    <FiMail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="partner@closh.com" required className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-gray-300 focus:outline-none text-gray-900" />
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicle Info */}
            <div className="space-y-6">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] border-b pb-2">Logistic Assets</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2 px-1">Vehicle Category</label>
                  <select name="vehicleType" value={formData.vehicleType} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-gray-300 focus:outline-none text-gray-900 font-medium">
                    <option value="Bike">Fast Bike</option>
                    <option value="Scooter">Scooter</option>
                    <option value="Car">Utility Car</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2 px-1">Registration Identifier</label>
                  <input type="text" name="vehicleNumber" value={formData.vehicleNumber} onChange={handleChange} placeholder="ABC-1234" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-gray-300 focus:outline-none text-gray-900" />
                </div>
              </div>
            </div>

            {/* Security */}
            <div className="space-y-6">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] border-b pb-2">Encryption (Password)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2 px-1">Secret Key</label>
                  <div className="relative">
                    <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" required className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-gray-300 focus:outline-none text-gray-900" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-900">{showPassword ? <FiEyeOff /> : <FiEye />}</button>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2 px-1">Re-Validate Key</label>
                  <div className="relative">
                    <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" required className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-gray-300 focus:outline-none text-gray-900" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-900">{showConfirmPassword ? <FiEyeOff /> : <FiEye />}</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Final Submission */}
            <div className="pt-6 space-y-6">
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6">
                <p className="text-sm font-medium text-indigo-900">
                  <span className="font-black uppercase text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full mr-2">Info</span> 
                  Registration approval is mandatory before system access. Dispatch will review within 24-48 hours.
                </p>
              </div>

              <button type="submit" disabled={isLoading} className="w-full bg-[#0f172a] text-white py-4 rounded-2xl font-black text-base hover:bg-slate-800 transition-all duration-300 shadow-xl active:scale-95 disabled:opacity-50">
                {isLoading ? 'Sending Request...' : 'Submit Application'}
              </button>

              <div className="text-center">
                <p className="text-sm font-medium text-gray-500">
                  Back to workspace?{' '}
                  <Link to="/delivery/login" className="text-[#0f172a] hover:underline font-black">
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

export default DeliveryRegister;
