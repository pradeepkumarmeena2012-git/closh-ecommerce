import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiPhone } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useDeliveryAuthStore } from '../store/deliveryStore';
import toast from 'react-hot-toast';
import PageTransition from '../../../shared/components/PageTransition';
import logo from '../../../assets/animations/lottie/logo-removebg.png';

const DeliveryLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sendOtp, verifyOtpAndLogin, isAuthenticated, isLoading } = useDeliveryAuthStore();
  
  const [formData, setFormData] = useState({
    phone: '',
    otp: '',
  });
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    const hasDeliveryToken = Boolean(localStorage.getItem('delivery-token'));
    if (isAuthenticated && hasDeliveryToken) {
      const from = location.state?.from?.pathname || '/delivery/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!formData.phone || formData.phone.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    try {
      await sendOtp(formData.phone);
      setStep('otp');
      setTimer(60);
      toast.success('OTP sent successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to send OTP');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 'phone') {
      return handleSendOtp(e);
    }
    if (!formData.otp || formData.otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    try {
      await verifyOtpAndLogin(formData.phone, formData.otp);
      toast.success('Login successful!');
    } catch (error) {
      toast.error(error.message || 'Invalid OTP');
    }
  };

  return (
    <PageTransition>
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
            <p className="text-xl text-slate-400 font-medium">Fast. Reliable. Elite. Delivery Network.</p>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-1/2 flex items-center justify-center relative z-10 px-4 py-8 md:px-0">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-3xl md:rounded-[2.5rem] p-8 md:p-12 w-full max-w-sm shadow-2xl min-h-[85vh] md:min-h-0 flex flex-col justify-center"
          >
            {/* Mobile Logo */}
            <div className="md:hidden text-center mb-10">
              <div className="w-20 h-20 bg-[#0f172a] rounded-3xl flex items-center justify-center mx-auto mb-4">
                <img src={logo} alt="CLOSH" className="w-12 h-12 object-contain" />
              </div>
            </div>

            <div className="mb-10 text-center md:text-left">
              <h2 className="text-3xl font-black text-gray-900 mb-2 uppercase tracking-tight">Partner Login</h2>
              <p className="text-gray-500 font-medium">Log in using your mobile number</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {step === 'phone' ? (
                <div>
                  <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2 px-1">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <FiPhone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="10-digit number"
                      maxLength={10}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-gray-300 focus:outline-none transition-all text-gray-900 placeholder:text-gray-400 font-bold"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest">
                      Enter OTP
                    </label>
                    <button 
                      type="button" 
                      onClick={() => setStep('phone')}
                      className="text-[10px] font-black text-indigo-600 uppercase tracking-wider hover:underline"
                    >
                      Change Number
                    </button>
                  </div>
                  <div className="relative">
                    <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      name="otp"
                      value={formData.otp}
                      onChange={handleChange}
                      placeholder="6-digit OTP"
                      maxLength={6}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-gray-300 focus:outline-none transition-all text-gray-900 tracking-[0.5em] font-black placeholder:text-gray-400 placeholder:tracking-normal"
                      required
                      autoFocus
                    />
                  </div>
                  {timer > 0 ? (
                    <p className="mt-3 text-[10px] font-bold text-gray-400 uppercase text-center tracking-wider">
                      Resend OTP in {timer}s
                    </p>
                  ) : (
                    <button 
                      type="button"
                      onClick={handleSendOtp}
                      className="mt-3 w-full text-[10px] font-black text-indigo-600 uppercase text-center tracking-wider hover:underline"
                    >
                      Resend OTP Now
                    </button>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#0f172a] text-white py-4 rounded-2xl font-black text-base hover:bg-slate-800 transition-all duration-300 shadow-xl active:scale-95 disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : step === 'phone' ? 'Get OTP' : 'Verify & Login'}
              </button>
            </form>

            <div className="text-center pt-8">
              <p className="text-sm font-medium text-gray-500">
                New delivery partner?{' '}
                <Link to="/delivery/register" className="text-[#0f172a] hover:underline font-black">
                  Apply Now
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};

export default DeliveryLogin;
