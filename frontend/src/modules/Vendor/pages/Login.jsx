import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useVendorAuthStore } from "../store/vendorAuthStore";
import toast from 'react-hot-toast';
import logo from '../../../assets/animations/lottie/logo-removebg.png';

const VendorLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading } = useVendorAuthStore();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/vendor/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }
    try {
      await login(formData.email, formData.password, rememberMe);
      toast.success('Login successful!');
      const from = location.state?.from?.pathname || '/vendor/dashboard';
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(error.message || 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col md:flex-row overflow-hidden">
      {/* Left Side: Branding */}
      <div className="hidden md:flex md:w-1/2 items-center justify-center p-12 bg-[#0f172a] relative">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[32rem] h-[32rem] bg-blue-600/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 text-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-32 h-32 bg-white/5 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-white/10 shadow-2xl"
          >
            <img src={logo} alt="CLOSH" className="w-20 h-20 object-contain" />
          </motion.div>
          <h1 className="text-6xl font-black text-white mb-4 tracking-tighter uppercase">CLOSH</h1>
          <p className="text-xl text-slate-400 font-medium">Empowering local vendors, globally.</p>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center relative z-10 px-4 py-8 md:px-0">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-[2.5rem] p-8 md:p-12 w-full max-w-md shadow-2xl min-h-[80vh] md:min-h-0 flex flex-col justify-center"
        >
          {/* Mobile Logo */}
          <div className="md:hidden text-center mb-10">
            <div className="w-20 h-20 bg-[#0f172a] rounded-3xl flex items-center justify-center mx-auto mb-4">
              <img src={logo} alt="CLOSH" className="w-12 h-12 object-contain" />
            </div>
          </div>

          <div className="mb-10 text-center md:text-left">
            <h2 className="text-3xl font-black text-gray-900 mb-2 uppercase tracking-tight">Vendor Hub</h2>
            <p className="text-gray-500 font-medium">Access your store management center</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2 px-1">
                Workspace Email
              </label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="vendor@example.com"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-gray-300 focus:outline-none transition-all text-gray-900 placeholder:text-gray-400"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2 px-1">
                Account Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-gray-300 focus:outline-none transition-all text-gray-900 placeholder:text-gray-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-900"
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-[#0f172a] border-gray-200 rounded focus:ring-[#0f172a]"
                />
                <span className="ml-2 text-xs font-black text-gray-500 group-hover:text-gray-900 tracking-wider">Stay active</span>
              </label>
              <Link to="/vendor/forgot-password" size="sm" className="text-xs font-black text-gray-500 hover:text-gray-900 tracking-wider">
                Forgot access?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0f172a] text-white py-4 rounded-2xl font-black text-base hover:bg-slate-800 transition-all duration-300 shadow-xl active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Connecting...' : 'Login to Dashboard'}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default VendorLogin;
