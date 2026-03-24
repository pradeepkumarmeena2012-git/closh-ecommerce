import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useAdminAuthStore } from '../store/adminStore';
import adminMenu from '../config/adminMenu.json';
import toast from 'react-hot-toast';
import logo from '../../../assets/animations/lottie/logo-removebg.png';

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading, admin } = useAdminAuthStore();

  const getRedirectPath = (adminData) => {
    if (!adminData) return '/admin/dashboard';
    if (adminData.role === 'superadmin') return '/admin/dashboard';
    if (adminData.permissions?.includes('dashboard_view')) return '/admin/dashboard';
    for (const item of adminMenu) {
      if (!item.permission || adminData.permissions?.includes(item.permission)) {
        return item.route;
      }
    }
    return '/admin/dashboard';
  };

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    if (isAuthenticated && admin) {
      const path = getRedirectPath(admin);
      navigate(path, { replace: true });
    }
  }, [isAuthenticated, admin, navigate]);

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
      const result = await login(formData.email, formData.password, rememberMe);
      toast.success('Login successful!');
      if (result && result.admin) {
        navigate(getRedirectPath(result.admin), { replace: true });
      } else {
        navigate('/admin/dashboard', { replace: true });
      }
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
          <p className="text-xl text-slate-400 font-medium">Ultimate Admin Control Center</p>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center relative z-10 px-4 py-8 md:px-0">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-3xl md:rounded-[2.5rem] p-8 md:p-12 w-full max-w-md shadow-2xl min-h-[80vh] md:min-h-0 flex flex-col justify-center"
        >
          {/* Mobile Logo */}
          <div className="md:hidden text-center mb-10">
            <div className="w-20 h-20 bg-[#0f172a] rounded-3xl flex items-center justify-center mx-auto mb-4">
              <img src={logo} alt="CLOSH" className="w-12 h-12 object-contain" />
            </div>
            <h1 className="text-2xl font-black text-[#0f172a] uppercase tracking-tight">CLOSH ADMIN</h1>
          </div>

          <div className="mb-10 text-center md:text-left">
            <h2 className="text-3xl font-black text-gray-900 mb-2 uppercase tracking-tight">System Login</h2>
            <p className="text-gray-500 font-medium">Secure access to internal infrastructure</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2 px-1">
                Admin Identifier (Email)
              </label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="admin@closh.com"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-gray-300 focus:outline-none transition-all text-gray-900 placeholder:text-gray-400"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2 px-1">
                Access Token (Password)
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
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-[#0f172a] border-gray-200 rounded focus:ring-[#0f172a]"
                />
                <span className="text-xs font-black text-gray-500 group-hover:text-gray-900 uppercase tracking-wider transition-colors">Remember Session</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0f172a] text-white py-4 rounded-2xl font-black text-base hover:bg-slate-800 transition-all duration-300 shadow-xl active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Authorizing...' : 'Establish Connection'}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-10 p-6 bg-gray-50 rounded-[2rem] border border-gray-100/50">
            <p className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-3 px-1">Master Credentials:</p>
            <div className="space-y-1 px-1">
              <p className="text-sm font-medium text-gray-700">User: <span className="text-gray-900 font-bold">admin@closh.com</span></p>
              <p className="text-sm font-medium text-gray-700">Token: <span className="text-gray-900 font-bold">admin123</span></p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminLogin;
