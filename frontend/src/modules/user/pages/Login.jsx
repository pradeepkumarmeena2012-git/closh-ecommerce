import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiPhone } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../../shared/store/authStore';
import { useCartStore } from '../../../shared/store/useStore';
import { useWishlistStore } from '../../../shared/store/wishlistStore';
import {
  clearPostLoginRedirect,
  consumePostLoginAction,
  getPostLoginRedirect,
} from '../../../shared/utils/postLoginAction';
import { isValidEmail } from '../../../shared/utils/helpers';
import toast from 'react-hot-toast';
import MobileLayout from '../components/Layout/MobileLayout';
import PageTransition from '../../../shared/components/PageTransition';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiMail, FiPhone, FiUser, FiKey } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../../shared/store/authStore';
import {
  clearPostLoginRedirect,
  consumePostLoginAction,
  getPostLoginRedirect,
} from '../../../shared/utils/postLoginAction';
import { isValidEmail } from '../../../shared/utils/helpers';
import toast from 'react-hot-toast';
import MobileLayout from '../components/Layout/MobileLayout';
import PageTransition from '../../../shared/components/PageTransition';
import { useCartStore } from '../../../shared/store/useStore';
import { useWishlistStore } from '../../../shared/store/wishlistStore';

const MobileLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { checkPhone, loginOtp, registerOtp, verifyOTP, isLoading } = useAuthStore();

  const [step, setStep] = useState('phone'); // 'phone' | 'register-details' | 'otp'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm();

  const storedFrom = getPostLoginRedirect();
  const from = location.state?.from?.pathname || storedFrom || '/home';

  const replayPendingAction = () => {
    const action = consumePostLoginAction();
    if (!action?.type) return;

    if (action.type === 'cart:add' && action.payload) {
      useCartStore.getState().addItem(action.payload);
      return;
    }

    if (action.type === 'wishlist:add' && action.payload) {
      useWishlistStore.getState().addItem(action.payload);
    }
  };

  const handlePhoneSubmit = async (data) => {
    try {
      const res = await checkPhone(data.phone);
      setPhoneNumber(data.phone);
      if (res.exists) {
        setUserEmail(res.email);
        await loginOtp(data.phone);
        toast.success(`OTP sent to your email!`);
        setStep('otp');
      } else {
        toast('Please enter your name and email to proceed.', { icon: '👋' });
        setStep('register-details');
      }
    } catch (error) {
      toast.error(error.message || 'Verification failed. Please try again.');
    }
  };

  const handleRegisterDetailsSubmit = async (data) => {
    try {
      await registerOtp(data.name, data.email, phoneNumber);
      setUserEmail(data.email);
      toast.success('Details saved! OTP sent to your email.');
      setStep('otp');
    } catch (error) {
      toast.error(error.message || 'Registration failed. Please try again.');
    }
  };

  const handleOtpSubmit = async (data) => {
    try {
      await verifyOTP(userEmail, data.otp);
      replayPendingAction();
      toast.success('Successfully logged in!');
      clearPostLoginRedirect();
      navigate(from === '/login' ? '/home' : from, { replace: true });
    } catch (error) {
      toast.error(error.message || 'Invalid OTP. Please try again.');
    }
  };

  return (
    <PageTransition>
      <MobileLayout showBottomNav={false} showCartBar={false}>
        <div className="w-full min-h-[90vh] flex flex-col items-center justify-center px-5 pt-8 pb-12">
          
          <div className="w-20 h-20 bg-gray-50 rounded-full flex flex-col items-center justify-center mb-6 border border-gray-100 shadow-sm">
            <h1 className="text-2xl font-black text-gray-900 tracking-tighter">CLOSH</h1>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-sm"
          >
            <div className="bg-white rounded-[24px] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
              
              {/* Header Title Adaptive */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2 font-poppins text-center tracking-tight">
                  {step === 'phone' ? 'Login or Sign up' 
                    : step === 'register-details' ? 'Welcome to Closh' 
                    : 'Verify OTP'}
                </h2>
                <p className="text-[13px] text-gray-500 text-center font-medium">
                  {step === 'phone' ? 'We will check if you have an account' 
                    : step === 'register-details' ? 'Just a few details to get you started'
                    : `Enter the code sent to ${userEmail || phoneNumber}`}
                </p>
              </div>

              <div className="relative">
                <AnimatePresence mode="wait">

                  {/* STEP 1: Phone */}
                  {step === 'phone' && (
                    <motion.form 
                      key="phone-step"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      onSubmit={handleSubmit(handlePhoneSubmit)} 
                      className="space-y-6"
                    >
                      <div>
                        <div className="relative flex items-center bg-gray-50 border-2 border-transparent focus-within:border-black rounded-[18px] transition-all duration-300 shadow-inner">
                          <FiPhone className="absolute left-4 text-gray-400 text-lg" />
                          <input
                            type="tel"
                            maxLength={10}
                            {...register('phone', {
                              required: 'Mobile number is required',
                              pattern: {
                                value: /^[0-9]{10}$/,
                                message: 'Please enter a valid 10-digit number',
                              },
                            })}
                            className="w-full bg-transparent pl-12 pr-4 py-4 focus:outline-none text-[15px] font-semibold text-gray-900 placeholder:font-medium placeholder:text-gray-400"
                            placeholder="Enter 10-digit mobile number"
                          />
                        </div>
                        {errors.phone && (
                          <p className="mt-2 ml-1 text-[12px] font-semibold text-red-500">{errors.phone.message}</p>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-black hover:bg-gray-900 text-white py-4 rounded-[18px] font-bold text-[15px] transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.1)] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-wider"
                      >
                        {isLoading ? 'Wait...' : 'Continue'}
                      </button>
                    </motion.form>
                  )}

                  {/* STEP 2: Name & Email for Registration */}
                  {step === 'register-details' && (
                    <motion.form 
                      key="register-details-step"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      onSubmit={handleSubmit(handleRegisterDetailsSubmit)} 
                      className="space-y-5"
                    >
                      <div>
                        <div className="relative flex items-center bg-gray-50 border-2 border-transparent focus-within:border-black rounded-[18px] transition-all duration-300">
                          <FiUser className="absolute left-4 text-gray-400 text-lg" />
                          <input
                            type="text"
                            {...register('name', { required: 'Full name is required' })}
                            className="w-full bg-transparent pl-12 pr-4 py-3.5 focus:outline-none text-[15px] font-semibold text-gray-900 placeholder:text-gray-400 placeholder:font-medium"
                            placeholder="Full Name"
                          />
                        </div>
                        {errors.name && <p className="mt-1.5 ml-1 text-[12px] font-semibold text-red-500">{errors.name.message}</p>}
                      </div>

                      <div>
                        <div className="relative flex items-center bg-gray-50 border-2 border-transparent focus-within:border-black rounded-[18px] transition-all duration-300">
                          <FiMail className="absolute left-4 text-gray-400 text-lg" />
                          <input
                            type="email"
                            {...register('email', {
                              required: 'Email is required',
                              validate: (value) => isValidEmail(value) || 'Valid email required',
                            })}
                            className="w-full bg-transparent pl-12 pr-4 py-3.5 focus:outline-none text-[15px] font-semibold text-gray-900 placeholder:text-gray-400 placeholder:font-medium"
                            placeholder="Email Address"
                          />
                        </div>
                        {errors.email && <p className="mt-1.5 ml-1 text-[12px] font-semibold text-red-500">{errors.email.message}</p>}
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full mt-2 bg-black text-white py-4 rounded-[18px] font-bold text-[15px] transition-all active:scale-95 uppercase tracking-wider disabled:opacity-50"
                      >
                        {isLoading ? 'Sending...' : 'Send OTP'}
                      </button>
                    </motion.form>
                  )}

                  {/* STEP 3: OTP Verification */}
                  {step === 'otp' && (
                    <motion.form 
                      key="otp-step"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      onSubmit={handleSubmit(handleOtpSubmit)} 
                      className="space-y-6"
                    >
                      <div>
                        <div className="relative flex items-center bg-gray-50 border-2 border-transparent focus-within:border-black rounded-[18px] transition-all duration-300 shadow-inner">
                          <FiKey className="absolute left-4 text-gray-400 text-lg" />
                          <input
                            type="text"
                            maxLength={6}
                            {...register('otp', {
                              required: 'OTP is required',
                              minLength: { value: 6, message: 'OTP must be 6 digits' }
                            })}
                            className="w-full bg-transparent pl-12 pr-4 py-4 focus:outline-none text-[18px] font-black text-center tracking-[0.3em] text-gray-900 placeholder:font-medium placeholder:tracking-normal placeholder:text-gray-400 placeholder:text-[15px]"
                            placeholder="Enter 6-digit OTP"
                          />
                        </div>
                        {errors.otp && (
                          <p className="mt-2 text-center text-[12px] font-semibold text-red-500">{errors.otp.message}</p>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-black hover:bg-gray-900 text-white py-4 rounded-[18px] font-bold text-[15px] transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.1)] active:scale-95 disabled:opacity-50 uppercase tracking-wider"
                      >
                        {isLoading ? 'Verifying...' : 'Verify & Login'}
                      </button>
                      
                      <div className="text-center pt-2">
                         <button 
                           type="button" 
                           onClick={() => setStep('phone')}
                           className="text-[12px] font-bold text-gray-500 hover:text-black border-b border-gray-300 pb-0.5"
                         >
                           Change mobile number
                         </button>
                      </div>
                    </motion.form>
                  )}

                </AnimatePresence>
              </div>

              {/* Secure statement */}
              {step === 'phone' && (
                <div className="mt-8 text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Secure seamlessly via OTP
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </MobileLayout>
    </PageTransition>
  );
};

export default MobileLogin;
