import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiArrowLeft, FiCheck, FiMail, FiRefreshCw } from "react-icons/fi";
import toast from "react-hot-toast";
import { useVendorAuthStore } from "../store/vendorAuthStore";
import logo from '../../../assets/animations/lottie/logo-removebg.png';

const OTP_LENGTH = 6;

const VendorForgotPassword = () => {
  const navigate = useNavigate();
  const { forgotPassword, verifyResetOtp, isLoading } = useVendorAuthStore();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState("request");
  const [codes, setCodes] = useState(Array(OTP_LENGTH).fill(""));
  const inputRefs = useRef([]);

  useEffect(() => {
    if (step === "verify" && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [step]);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email.");
      return;
    }

    try {
      const result = await forgotPassword(email.trim().toLowerCase());
      if (result?.phone) {
        setPhone(result.phone);
      }
      toast.success("If the email exists, reset OTP has been sent.");
      setStep("verify");
    } catch {
      // Global api interceptor shows toast
    }
  };

  const handleCodeChange = (index, value) => {
    if (value.length > 1 || (value && !/^\d$/.test(value))) return;
    const next = [...codes];
    next[index] = value;
    setCodes(next);
    if (value && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !codes[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(pasted)) return;
    setCodes(pasted.split(""));
    inputRefs.current[OTP_LENGTH - 1]?.focus();
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otp = codes.join("");
    if (otp.length !== OTP_LENGTH) {
      toast.error("Please enter the full OTP.");
      return;
    }

    try {
      await verifyResetOtp(email.trim().toLowerCase(), otp);
      toast.success("OTP verified. Please set your new password.");
      navigate(
        `/vendor/reset-password?email=${encodeURIComponent(
          email.trim().toLowerCase()
        )}`
      );
    } catch {
      // Global api interceptor shows toast
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
          className="bg-white rounded-[2.5rem] p-6 sm:p-8 md:p-12 w-full max-w-md shadow-2xl min-h-[80vh] md:min-h-0 flex flex-col justify-center"
        >
          {/* Mobile Logo */}
          <div className="md:hidden text-center mb-10">
            <div className="w-20 h-20 bg-[#0f172a] rounded-3xl flex items-center justify-center mx-auto mb-4">
              <img src={logo} alt="CLOSH" className="w-12 h-12 object-contain" />
            </div>
          </div>

          <div className="mb-10 text-center md:text-left">
            <h2 className="text-3xl font-black text-gray-900 mb-2 uppercase tracking-tight">Forgot Password</h2>
            <p className="text-gray-500 font-medium">
              {step === "request"
                ? "Enter your vendor account email to receive an OTP."
                : `Enter the OTP sent to ${
                    phone 
                      ? phone.replace(/^(\+?\d{2})(\d{3})(\d{3})(\d+)$/, '$1$2***$4')
                      : 'your registered contact'
                  }`}
            </p>
          </div>

          {step === "request" ? (
            <form onSubmit={handleRequestOtp} className="space-y-6">
              <div>
                <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2 px-1">
                  Email Address
                </label>
                <div className="relative">
                  <FiMail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vendor@example.com"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-gray-300 focus:outline-none transition-all text-gray-900 placeholder:text-gray-400"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#0f172a] text-white py-4 rounded-2xl font-black text-base hover:bg-slate-800 transition-all duration-300 shadow-xl active:scale-95 disabled:opacity-50"
              >
                {isLoading ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-3 px-1">
                  Verification Code
                </label>
                <div className="flex justify-between gap-1 sm:gap-2">
                  {codes.map((code, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={code}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold bg-gray-50 border border-gray-200 rounded-xl focus:border-[#0f172a] focus:ring-1 focus:ring-[#0f172a] focus:outline-none transition-all"
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={isLoading}
                  className="text-xs font-black text-gray-500 hover:text-gray-900 tracking-wider inline-flex items-center gap-2 disabled:text-gray-300"
                >
                  <FiRefreshCw />
                  Resend OTP
                </button>
                <button
                  type="button"
                  onClick={() => setStep("request")}
                  className="text-xs font-black text-gray-500 hover:text-gray-900 tracking-wider"
                >
                  Change Email
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading || codes.some((c) => !c)}
                className="w-full bg-[#0f172a] text-white py-4 rounded-2xl font-black text-base hover:bg-slate-800 transition-all duration-300 shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? "Verifying..." : <><FiCheck /> Verify OTP</>}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/vendor/login"
              className="text-gray-500 text-sm font-medium hover:text-[#0f172a] inline-flex items-center gap-2"
            >
              <FiArrowLeft />
              Back to Login
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default VendorForgotPassword;
