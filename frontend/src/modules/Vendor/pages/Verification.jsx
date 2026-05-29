import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FiArrowLeft, FiCheck } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { verifyVendorOTP, resendVendorOTP } from '../services/vendorService';
import toast from 'react-hot-toast';
import logo from '../../../assets/animations/lottie/logo-removebg.png';

const VendorVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const OTP_LENGTH = 6;
  const [codes, setCodes] = useState(Array(OTP_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef([]);

  const phone = location.state?.phone || '';
  const [resendCooldown, setResendCooldown] = useState(0);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index, value) => {
    // Only allow single digit
    if (value.length > 1) return;

    const newCodes = [...codes];
    newCodes[index] = value;
    setCodes(newCodes);

    // Auto-focus next input
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !codes[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (pastedData.length === OTP_LENGTH && /^\d+$/.test(pastedData)) {
      const newCodes = pastedData.split('');
      setCodes(newCodes);
      inputRefs.current[OTP_LENGTH - 1]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const verificationCode = codes.join('');

    if (verificationCode.length !== OTP_LENGTH) {
      toast.error('Please enter the complete verification code');
      return;
    }

    setIsLoading(true);
    try {
      await verifyVendorOTP(phone, verificationCode);
      toast.success('Phone number verified! Your account is pending admin approval.');
      navigate('/vendor/login');
    } catch {
      // Error toast is shown by api.js interceptor
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !phone) return;
    try {
      await resendVendorOTP(phone);
      toast.success('OTP resent! Please check your phone.');
      // Start 30 second cooldown
      setResendCooldown(30);
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch {
      // api.js shows toast
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col md:flex-row overflow-hidden">
      {/* Left Side: Branding */}
      <div className="hidden md:flex md:w-1/2 items-center justify-center p-12 bg-[#0f172a] relative border-r border-white/5">
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
            <h2 className="text-3xl font-black text-gray-900 mb-2 uppercase tracking-tight">Verify Phone</h2>
            <p className="text-gray-500 font-medium">
              We've sent a verification code to <br />
              <span className="font-semibold text-gray-900">
                {phone ? `+91 ${phone}` : 'your registered number'}
              </span>
            </p>
          </div>

          {/* Verification Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Code Inputs */}
            <div className="flex justify-between gap-2 mb-8">
              {codes.map((code, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={code}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="w-12 h-14 text-center text-xl font-bold bg-gray-50 border border-gray-200 rounded-xl focus:border-[#0f172a] focus:ring-1 focus:ring-[#0f172a] focus:outline-none transition-all text-gray-900"
                  required
                />
              ))}
            </div>

            {/* Resend Code */}
            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className="text-sm text-[#0f172a] hover:underline font-black disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed uppercase tracking-wider"
              >
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Didn't receive the code? Resend"}
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || codes.some(code => !code)}
              className="w-full bg-[#0f172a] text-white py-4 rounded-2xl font-black text-base hover:bg-slate-800 transition-all duration-300 shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                'Verifying...'
              ) : (
                <>
                  <FiCheck />
                  Verify Phone Number
                </>
              )}
            </button>

            {/* Back to Login */}
            <div className="text-center pt-4">
              <Link
                to="/vendor/login"
                className="text-gray-500 text-sm font-medium hover:text-[#0f172a] inline-flex items-center gap-2"
              >
                <FiArrowLeft />
                Back to Login
              </Link>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default VendorVerification;

