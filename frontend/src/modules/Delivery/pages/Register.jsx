import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiUser, FiPhone, FiTruck, FiCamera, FiChevronRight, FiChevronLeft, FiCheck, FiFileText, FiShield, FiUpload, FiNavigation, FiMapPin, FiCreditCard } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useDeliveryAuthStore } from '../store/deliveryStore';
import { compressImage } from '@shared/utils/imageHelper';
import logo from '../../../assets/animations/lottie/logo-removebg.png';

const STEPS = [
  { id: 1, title: 'Personal Info', icon: FiUser },
  { id: 2, title: 'Documents', icon: FiFileText },
  { id: 3, title: 'Vehicle & Account', icon: FiTruck },
  { id: 4, title: 'Bank Details', icon: FiCreditCard },
];

// ✅ Defined OUTSIDE to prevent remount on every parent re-render
const DocUploadCard = ({ name, label, previews = {}, fileInputRefs, handleChange }) => {
  const handleCardClick = () => {
    fileInputRefs.current[name]?.click();
  };

  return (
    <div className="relative cursor-pointer group" onClick={handleCardClick}>
      <input
        ref={(el) => (fileInputRefs.current[name] = el)}
        type="file"
        name={name}
        accept="image/*"
        onChange={handleChange}
        onClick={(e) => e.stopPropagation()}
        className="hidden"
      />
      {previews[name] ? (
        <div className="relative w-full h-36 sm:h-40 rounded-2xl overflow-hidden border-2 border-emerald-400 shadow-md">
          <img src={previews[name]} alt={label} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
            <FiUpload className="text-white" size={20} />
            <span className="text-white text-[10px] font-bold">Change</span>
          </div>
          <div className="absolute top-2 right-2 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center shadow">
            <FiCheck className="text-white" size={15} />
          </div>
        </div>
      ) : (
        <div className="w-full h-36 sm:h-40 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-2 group-hover:border-indigo-400 group-hover:bg-indigo-50/60 transition-all">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
            <FiCamera className="text-gray-400 group-hover:text-indigo-500" size={20} />
          </div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tap to Upload</span>
        </div>
      )}
      <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider text-center mt-2">{label}</p>
    </div>
  );
};

const DeliveryRegister = () => {
  const navigate = useNavigate();
  const { register, sendRegistrationOtp, verifyRegistrationOtp, isLoading } = useDeliveryAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const fileInputRefs = useRef({});

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    emergencyContact: '',
    aadharNumber: '',
    email: '',
    address: '',
    vehicleType: 'Bike',
    vehicleNumber: '',
    // password: '', // Removed
    // confirmPassword: '', // Removed
    drivingLicense: null,
    drivingLicenseBack: null,
    aadharCard: null,
    aadharCardBack: null,
    // Bank Details
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
  });
  
  const [phoneOtp, setPhoneOtp] = useState('');
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [showOtpField, setShowOtpField] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const [previews, setPreviews] = useState({});
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);

  const fetchLiveAddress = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setIsFetchingAddress(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          if (data?.display_name) {
            setFormData((prev) => ({ ...prev, address: data.display_name }));
            toast.success('Live address fetched!');
          } else {
            toast.error('Could not fetch address. Please enter manually.');
          }
        } catch {
          toast.error('Failed to fetch address. Try again.');
        } finally {
          setIsFetchingAddress(false);
        }
      },
      (err) => {
        setIsFetchingAddress(false);
        toast.error('Location access denied: ' + err.message);
      },
      { timeout: 10000 }
    );
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (['drivingLicense', 'drivingLicenseBack', 'aadharCard', 'aadharCardBack'].includes(name)) {
      const file = files?.[0] || null;
      if (file) {
        const toastId = toast.loading(`Processing document...`);
        compressImage(file, { maxWidth: 1280, quality: 0.7 })
          .then(base64 => {
            // Convert base64 back to Blob so multer can receive it as a file
            const byteString = atob(base64.split(',')[1]);
            const mimeType = base64.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
            const blob = new Blob([ab], { type: mimeType });
            const compressedFile = new File([blob], file.name || `${name}.jpg`, { type: mimeType });

            setFormData((prev) => ({ ...prev, [name]: compressedFile }));
            setPreviews((prev) => ({ ...prev, [name]: base64 })); // base64 only for <img> preview
            toast.success('Ready!', { id: toastId });
          })
          .catch(() => {
            // fallback: use original file
            setFormData((prev) => ({ ...prev, [name]: file }));
            const url = URL.createObjectURL(file);
            setPreviews((prev) => ({ ...prev, [name]: url }));
            toast.dismiss(toastId);
          });
      }
      return;
    }
    if (['aadharNumber', 'phone', 'emergencyContact'].includes(name)) {
      const numericValue = value.replace(/\D/g, '');
      setFormData((prev) => ({ ...prev, [name]: numericValue }));
      
      // If phone number changes, reset verification
      if (name === 'phone') {
        setIsPhoneVerified(false);
        setShowOtpField(false);
      }
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSendOtp = async () => {
    if (!formData.phone || !/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      toast.error('Enter a valid email address first');
      return;
    }
    setIsSendingOtp(true);
    try {
      await sendRegistrationOtp(formData.phone, formData.email);
      setShowOtpField(true);
      toast.success('OTP sent successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!phoneOtp || phoneOtp.length !== 6) {
      toast.error('Enter 6-digit OTP');
      return;
    }
    setIsVerifyingOtp(true);
    try {
      await verifyRegistrationOtp(formData.phone, phoneOtp);
      setIsPhoneVerified(true);
      setShowOtpField(false);
      toast.success('Mobile number verified!');
    } catch (error) {
      toast.error(error.message || 'Invalid OTP');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.name.trim()) { toast.error('Full name is required'); return false; }
        if (!formData.email.trim()) { toast.error('Email address is required'); return false; }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email.trim())) { toast.error('Enter a valid email address'); return false; }
        if (!formData.phone.trim()) { toast.error('Mobile number is required'); return false; }
        if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) { toast.error('Enter a valid 10-digit mobile number'); return false; }
        if (!isPhoneVerified) { toast.error('Please verify your mobile number first'); return false; }
        if (formData.emergencyContact && !/^\d{10}$/.test(formData.emergencyContact.replace(/\D/g, ''))) { toast.error('Enter a valid emergency contact number'); return false; }
        if (!formData.aadharNumber.trim()) { toast.error('Aadhaar number is required'); return false; }
        if (formData.aadharNumber.length !== 12) { toast.error('Aadhaar number must be exactly 12 digits'); return false; }
        return true;
      case 2:
        if (!formData.drivingLicense) { toast.error('Driving License (Front) is required'); return false; }
        if (!formData.drivingLicenseBack) { toast.error('Driving License (Back) is required'); return false; }
        if (!formData.aadharCard) { toast.error('Aadhaar Card (Front) is required'); return false; }
        if (!formData.aadharCardBack) { toast.error('Aadhaar Card (Back) is required'); return false; }
        return true;
      case 3:
        if (!formData.vehicleNumber.trim()) { toast.error('Vehicle number is required'); return false; }
        if (!formData.address.trim()) { toast.error('Full address is required'); return false; }
        return true;
      case 4:
        if (!formData.bankName.trim()) { toast.error('Bank name is required'); return false; }
        if (!formData.accountHolderName.trim()) { toast.error('Account holder name is required'); return false; }
        if (!formData.accountNumber.trim()) { toast.error('Account number is required'); return false; }
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode.trim().toUpperCase())) { toast.error('Enter a valid IFSC code (e.g. SBIN0001234)'); return false; }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) setCurrentStep((s) => Math.min(s + 1, 4));
  };

  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (currentStep !== 4) return;
    if (!validateStep(4)) return;
    try {
      const result = await register({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        emergencyContact: formData.emergencyContact.trim(),
        aadharNumber: formData.aadharNumber.trim(),
        address: formData.address.trim(),
        vehicleType: formData.vehicleType,
        vehicleNumber: formData.vehicleNumber.trim(),
        drivingLicense: formData.drivingLicense,
        drivingLicenseBack: formData.drivingLicenseBack,
        aadharCard: formData.aadharCard,
        aadharCardBack: formData.aadharCardBack,
        bankName: formData.bankName.trim(),
        accountNumber: formData.accountNumber.trim(),
        ifscCode: formData.ifscCode.trim().toUpperCase(),
        accountHolderName: formData.accountHolderName.trim(),
      });
      toast.success(result.message || 'Registration submitted successfully!');
      navigate('/delivery/login', { replace: true });
    } catch (error) {
      toast.error(error.message || 'Registration failed');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
      e.preventDefault();
      if (currentStep < 4) {
        nextStep();
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col md:flex-row overflow-hidden">
      {/* Left Side: Branding - Desktop Only */}
      <div className="hidden md:flex md:w-2/5 items-center justify-center p-12 bg-[#0f172a] relative border-r border-white/5">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[32rem] h-[32rem] bg-blue-600/10 rounded-full blur-3xl" />
        <div className="relative z-10 text-center">
          <div className="w-32 h-32 bg-white/5 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-white/10 shadow-2xl">
            <img src={logo} alt="CLOSH" className="w-20 h-20 object-contain" />
          </div>
          <h1 className="text-5xl font-black text-white mb-4 tracking-tighter uppercase">RIDE CLOSH</h1>
          <p className="text-xl text-slate-400 font-medium">Join the elite network of delivery partners.</p>
        </div>
      </div>

      {/* Right Side: Multi-Step Form */}
      <div className="w-full md:w-3/5 flex items-center justify-center relative z-10 px-0 sm:px-4 py-0 sm:py-8 md:px-0">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white sm:rounded-[2.5rem] p-6 sm:p-8 md:p-12 w-full max-w-3xl shadow-2xl min-h-screen sm:min-h-0 sm:max-h-[90vh] overflow-y-auto no-scrollbar relative z-10"
        >
          <style dangerouslySetInnerHTML={{ __html: `
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `}} />

          {/* Mobile Logo */}
          <div className="md:hidden text-center mb-6">
            <div className="w-16 h-16 bg-[#0f172a] rounded-2xl flex items-center justify-center mx-auto mb-3">
              <img src={logo} alt="CLOSH" className="w-10 h-10 object-contain" />
            </div>
            <h1 className="text-lg font-black text-gray-900 uppercase tracking-tight">Partner Enrollment</h1>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = currentStep > step.id;
                const isCurrent = currentStep === step.id;
                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 ${
                          isCompleted
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200'
                            : isCurrent
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110'
                            : 'bg-gray-50 border-gray-200 text-gray-400'
                        }`}
                      >
                        {isCompleted ? <FiCheck size={18} /> : <Icon size={18} />}
                      </div>
                      <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider mt-2 ${isCurrent ? 'text-indigo-600' : isCompleted ? 'text-emerald-500' : 'text-gray-400'}`}>
                        {step.title}
                      </span>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div className={`flex-1 h-[3px] mx-2 sm:mx-4 rounded-full transition-all duration-500 ${isCompleted ? 'bg-emerald-400' : 'bg-gray-100'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="hidden md:block mb-6">
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
              {STEPS[currentStep - 1].title}
            </h2>
            <p className="text-gray-500 text-sm font-medium mt-1">Step {currentStep} of 3</p>
          </div>

          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
            <AnimatePresence mode="wait">
              {/* STEP 1: Personal Info */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  <div>
                    <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2 px-1">Full Name *</label>
                    <div className="relative">
                      <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Enter your full name" required className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 focus:outline-none text-gray-900" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2 px-1">Email Address *</label>
                    <div className="relative">
                      <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="partner@email.com" required className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 focus:outline-none text-gray-900" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2 px-1">Mobile Number *</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1 group w-full">
                        <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                        <input 
                          type="tel" 
                          name="phone" 
                          value={formData.phone} 
                          onChange={handleChange} 
                          placeholder="Mobile number" 
                          required 
                          maxLength={10} 
                          className={`w-full pl-12 ${isPhoneVerified ? 'pr-12' : 'pr-4'} py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100/30 focus:outline-none text-gray-900 font-bold text-sm sm:text-base transition-all`} 
                          disabled={isPhoneVerified}
                        />
                        {isPhoneVerified && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-0">
                            <FiCheck className="text-emerald-500" size={18} />
                            <FiCheck className="text-emerald-500 -ml-2.5" size={18} />
                          </div>
                        )}
                      </div>
                      {!isPhoneVerified && (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={isSendingOtp || !formData.phone || formData.phone.length !== 10}
                          className="w-full sm:w-auto px-6 py-3.5 bg-[#4F46E5] text-white rounded-2xl text-[11px] font-black uppercase tracking-wider hover:bg-indigo-700 disabled:opacity-40 transition-all flex-shrink-0 shadow-lg shadow-indigo-200/50 active:scale-95"
                        >
                          {isSendingOtp ? 'Processing...' : 'Verify Number'}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {showOtpField && !isPhoneVerified && (
                    <motion.div
                      initial={{ height: 0, opacity: 0, y: -10 }}
                      animate={{ height: 'auto', opacity: 1, y: 0 }}
                      className="bg-indigo-50/40 p-4 sm:p-5 rounded-2xl border border-indigo-100/50 space-y-3.5 shadow-inner"
                    >
                      <label className="block text-[10px] font-black text-indigo-900 uppercase tracking-[0.15em] mb-1">Enter OTP Authorization Code</label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={phoneOtp}
                          onChange={(e) => setPhoneOtp(e.target.value)}
                          placeholder="••••••"
                          maxLength={6}
                          className="w-full sm:flex-1 px-4 py-3 bg-white border border-indigo-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-200/40 text-center font-black tracking-[0.4em] text-lg sm:text-xl text-indigo-950 placeholder:tracking-normal placeholder:font-medium placeholder:text-gray-300"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          disabled={isVerifyingOtp || phoneOtp.length !== 6}
                          className="w-full sm:w-auto px-8 py-3.5 bg-[#0f172a] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-40 transition-all active:scale-95 shadow-xl shadow-slate-200/50"
                        >
                          {isVerifyingOtp ? 'Processing...' : 'Confirm OTP'}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  <div>
                    <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2 px-1">Emergency Contact</label>
                    <div className="relative">
                      <FiShield className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="tel" name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} placeholder="Emergency contact number" maxLength={10} className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 focus:outline-none text-gray-900" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2 px-1">Aadhaar Number</label>
                    <div className="relative">
                      <FiFileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" name="aadharNumber" value={formData.aadharNumber} onChange={handleChange} placeholder="12-digit Aadhaar number" maxLength={12} className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 focus:outline-none text-gray-900" />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Document Upload */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] border-b pb-2 mb-4">Driving License</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <DocUploadCard name="drivingLicense" label="License Front" previews={previews} fileInputRefs={fileInputRefs} handleChange={handleChange} />
                      <DocUploadCard name="drivingLicenseBack" label="License Back" previews={previews} fileInputRefs={fileInputRefs} handleChange={handleChange} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] border-b pb-2 mb-4">Aadhaar Card</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <DocUploadCard name="aadharCard" label="Aadhaar Front" previews={previews} fileInputRefs={fileInputRefs} handleChange={handleChange} />
                      <DocUploadCard name="aadharCardBack" label="Aadhaar Back" previews={previews} fileInputRefs={fileInputRefs} handleChange={handleChange} />
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                    <p className="text-xs font-medium text-amber-800">
                      <span className="font-black uppercase text-[9px] bg-amber-500 text-white px-2 py-0.5 rounded-full mr-2">Note</span>
                      Upload clear photos. Blurry images will be rejected.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Vehicle & Account */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2 px-1">Vehicle Type</label>
                      <select name="vehicleType" value={formData.vehicleType} onChange={handleChange} className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:border-indigo-300 focus:outline-none text-gray-900 font-medium">
                        <option value="Bike">Bike</option>
                        <option value="Scooter">Scooter</option>
                        <option value="Car">Car</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2 px-1">Vehicle Number</label>
                      <input type="text" name="vehicleNumber" value={formData.vehicleNumber} onChange={handleChange} placeholder="MH-12-AB-1234" className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:border-indigo-300 focus:outline-none text-gray-900" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2 px-1">Address</label>
                    <div className="relative">
                      <FiMapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Your full address"
                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:border-indigo-300 focus:outline-none text-gray-900"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={fetchLiveAddress}
                      disabled={isFetchingAddress}
                      className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all disabled:opacity-50 active:scale-95"
                    >
                      <FiNavigation className={isFetchingAddress ? 'animate-pulse' : ''} size={14} />
                      {isFetchingAddress ? 'Fetching your location...' : 'Use My Current Location'}
                    </button>
                  </div>

                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4">
                    <p className="text-xs font-medium text-indigo-900">
                      <span className="font-black uppercase text-[9px] bg-indigo-600 text-white px-2 py-0.5 rounded-full mr-2">Info</span>
                      Approval takes 24-48 hours. You will receive an email notification.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: Bank Details */}
              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-2">
                    <p className="text-xs font-medium text-indigo-800">
                      <span className="font-black uppercase text-[9px] bg-indigo-600 text-white px-2 py-0.5 rounded-full mr-2">Secure</span>
                      Your bank details are encrypted and used only for earnings withdrawal.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2 px-1">Bank Name *</label>
                    <div className="relative">
                      <FiCreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="text"
                        name="bankName"
                        value={formData.bankName}
                        onChange={handleChange}
                        placeholder="e.g. State Bank of India"
                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 focus:outline-none text-gray-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2 px-1">Account Holder Name *</label>
                    <div className="relative">
                      <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="text"
                        name="accountHolderName"
                        value={formData.accountHolderName}
                        onChange={handleChange}
                        placeholder="Name as per bank account"
                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 focus:outline-none text-gray-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2 px-1">Account Number *</label>
                    <input
                      type="text"
                      name="accountNumber"
                      value={formData.accountNumber}
                      onChange={handleChange}
                      placeholder="Enter account number"
                      maxLength={20}
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 focus:outline-none text-gray-900 font-mono tracking-widest"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2 px-1">IFSC Code *</label>
                    <input
                      type="text"
                      name="ifscCode"
                      value={formData.ifscCode.toUpperCase()}
                      onChange={(e) => setFormData(prev => ({ ...prev, ifscCode: e.target.value.toUpperCase() }))}
                      placeholder="e.g. SBIN0001234"
                      maxLength={11}
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 focus:outline-none text-gray-900 font-mono tracking-widest uppercase"
                    />
                  </div>

                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                    <p className="text-xs font-medium text-amber-800">
                      <span className="font-black uppercase text-[9px] bg-amber-500 text-white px-2 py-0.5 rounded-full mr-2">Note</span>
                      Approval takes 24-48 hours after submission. You will receive a confirmation email.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 gap-3 sm:gap-4">
              {currentStep > 1 ? (
                <button type="button" onClick={prevStep} className="flex items-center gap-2 px-4 sm:px-6 py-3.5 bg-gray-100 text-gray-700 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm hover:bg-gray-200 active:scale-95 transition-all">
                  <FiChevronLeft size={18} /> Back
                </button>
              ) : (
                <div />
              )}

              {currentStep < 4 ? (
                <button type="button" onClick={nextStep} className="flex items-center gap-2 px-6 sm:px-8 py-3.5 bg-[#0f172a] text-white rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm hover:bg-slate-800 active:scale-95 transition-all shadow-xl">
                  Next <FiChevronRight size={18} />
                </button>
              ) : (
                <button type="submit" disabled={isLoading} className="flex items-center gap-2 px-6 sm:px-8 py-3.5 bg-emerald-600 text-white rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm hover:bg-emerald-700 active:scale-95 transition-all shadow-xl disabled:opacity-50">
                  {isLoading ? 'Submitting...' : 'Submit Application'}
                </button>
              )}
            </div>

            <div className="text-center mt-6">
              <p className="text-sm font-medium text-gray-500">
                Already have an account?{' '}
                <Link to="/delivery/login" className="text-[#0f172a] hover:underline font-black">Login</Link>
              </p>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default DeliveryRegister;
