import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Phone, ArrowRight, ShieldCheck, Timer, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const LoginModal = ({ isOpen, onClose, onSuccess }) => {
    const { loginWithOTP } = useAuth();
    const navigate = useNavigate();

    // State
    const [step, setStep] = useState(1); // 1: Mobile, 2: OTP
    const [mobileNumber, setMobileNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resendTimer, setResendTimer] = useState(0);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setMobileNumber('');
            setOtp('');
            setError('');
            setLoading(false);
        }
    }, [isOpen]);

    // Timer logic
    useEffect(() => {
        let interval;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    if (!isOpen) return null;

    const handleSendOTP = async (e) => {
        e.preventDefault();

        if (!mobileNumber) {
            setError('Mobile number is required');
            return;
        }

        if (mobileNumber.length !== 10) {
            setError('Please enter a valid 10-digit mobile number');
            return;
        }

        setError('');
        setLoading(true);

        // Mock OTP sending delay
        setTimeout(() => {
            setLoading(false);
            setStep(2);
            setResendTimer(30);
        }, 1500);
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();

        if (!otp || otp.length !== 6) {
            setError('Please enter the 6-digit OTP');
            return;
        }

        setError('');
        setLoading(true);

        try {
            // Mock delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            const result = await loginWithOTP(mobileNumber, otp);

            if (result.success) {
                if (onSuccess) onSuccess();
                onClose();
            } else {
                setError('Invalid OTP. Please try again.');
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-[#111111]/60 backdrop-blur-xl animate-fadeIn"
            onClick={handleBackdropClick}
        >
            <div className="bg-[#FAFAFA] w-full max-w-[420px] rounded-[36px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] relative overflow-hidden animate-scaleIn border border-white/40">

                {/* Decorative Top Glow */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50" />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 z-20 w-10 h-10 bg-white/50 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white transition-all duration-300 active:scale-95 text-[#878787] hover:text-[#111111] shadow-sm hover:shadow-md border border-gray-100"
                >
                    <X size={20} strokeWidth={2} />
                </button>

                {/* Back Button (for OTP step) */}
                {step === 2 && (
                    <button
                        onClick={() => setStep(1)}
                        className="absolute top-6 left-6 z-20 w-10 h-10 bg-white/50 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white transition-all duration-300 active:scale-95 text-[#878787] hover:text-[#111111] shadow-sm hover:shadow-md border border-gray-100"
                    >
                        <ChevronLeft size={22} strokeWidth={2} />
                    </button>
                )}

                <div className="p-10 pt-12 text-center">
                    {/* Icon */}
                    <div className="w-16 h-16 bg-[#111111] rounded-[20px] flex items-center justify-center mx-auto mb-8 shadow-[0_8px_16px_rgba(17,17,17,0.2)] transform -rotate-3 hover:rotate-0 hover:scale-105 transition-all duration-400 group relative">
                        <div className="absolute inset-0 bg-[#D4AF37] blur-xl opacity-20 rounded-[20px] group-hover:opacity-40 transition-opacity duration-400"></div>
                        <Phone className="text-[#D4AF37] relative z-10" size={28} strokeWidth={2} />
                    </div>

                    {/* Header */}
                    <h2 className="font-premium text-[28px] font-bold text-[#111111] mb-2 tracking-tight">
                        {step === 1 ? 'Welcome Back' : 'Security Check'}
                    </h2>
                    <p className="text-[#878787] text-[13px] font-medium max-w-[260px] mx-auto leading-relaxed mb-10">
                        {step === 1
                            ? 'Enter your mobile number to securely sign in or create an account'
                            : `We've sent a secure code to +91 ${mobileNumber}`}
                    </p>

                    {/* Form */}
                    <form onSubmit={step === 1 ? handleSendOTP : handleVerifyOTP} className="space-y-6">
                        {step === 1 ? (
                            <div className="relative text-left group">
                                <label className="absolute -top-2.5 left-4 bg-[#FAFAFA] px-2 text-[10px] font-bold text-[#878787] uppercase tracking-wider z-10 transition-colors group-focus-within:text-[#D4AF37]">
                                    Mobile Number
                                </label>
                                <div className="flex items-center relative gap-3 bg-white border border-gray-200 rounded-[20px] p-1.5 focus-within:border-[#D4AF37] focus-within:ring-4 focus-within:ring-[#D4AF37]/10 transition-all duration-300 shadow-sm hover:shadow-md">
                                    <div className="pl-4 pr-3 py-3 border-r border-gray-100 flex items-center justify-center">
                                        <span className="text-[15px] font-bold text-[#111111]">+91</span>
                                    </div>
                                    <input
                                        type="tel"
                                        maxLength="10"
                                        autoFocus
                                        value={mobileNumber}
                                        onChange={(e) => {
                                            setMobileNumber(e.target.value.replace(/\D/g, ''));
                                            if (error) setError('');
                                        }}
                                        className="w-full bg-transparent border-none outline-none text-[16px] font-semibold text-[#111111] placeholder:text-gray-300 placeholder:font-medium tracking-wide"
                                        placeholder="Enter your digits"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="relative text-left group">
                                <label className="absolute -top-2.5 left-4 bg-[#FAFAFA] px-2 text-[10px] font-bold text-[#878787] uppercase tracking-wider z-10 transition-colors group-focus-within:text-[#D4AF37]">
                                    Secure Code
                                </label>
                                <div className="flex items-center relative bg-white border border-gray-200 rounded-[20px] focus-within:border-[#D4AF37] focus-within:ring-4 focus-within:ring-[#D4AF37]/10 transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden">
                                    <div className="pl-5 py-4 text-[#878787] group-focus-within:text-[#D4AF37] transition-colors">
                                        <ShieldCheck size={20} strokeWidth={2} />
                                    </div>
                                    <input
                                        type="text"
                                        maxLength="6"
                                        autoFocus
                                        value={otp}
                                        onChange={(e) => {
                                            setOtp(e.target.value.replace(/\D/g, ''));
                                            if (error) setError('');
                                        }}
                                        className="w-full py-4 px-3 bg-transparent border-none outline-none text-[20px] font-bold tracking-[0.4em] text-[#111111] placeholder:text-gray-200"
                                        placeholder="••••••"
                                    />
                                </div>
                                <div className="flex justify-between items-center mt-4 px-2">
                                    <span className="text-[11px] font-medium text-[#878787] flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-full">
                                        <Timer size={12} /> {resendTimer > 0 ? `00:${resendTimer.toString().padStart(2, '0')}` : 'Ready'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setResendTimer(30)}
                                        disabled={resendTimer > 0}
                                        className={`text-[12px] font-bold text-[#111111] hover:text-[#D4AF37] transition-colors ${resendTimer > 0 ? 'opacity-40 cursor-not-allowed hover:text-[#111111]' : ''}`}
                                    >
                                        Send new code
                                    </button>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 text-red-600 p-3.5 rounded-[16px] text-[13px] font-medium flex items-center gap-2.5 animate-shake border border-red-100">
                                <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                                    <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                                </div>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || (step === 1 ? mobileNumber.length !== 10 : otp.length !== 6)}
                            className="w-full py-4 bg-[#111111] text-white rounded-[20px] font-premium font-bold text-[15px] tracking-wide shadow-[0_8px_20px_rgba(17,17,17,0.2)] hover:bg-[#1A1A1A] hover:shadow-[0_12px_24px_rgba(17,17,17,0.3)] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed group relative overflow-hidden mt-8"
                        >
                            {/* Button Shimmer Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />

                            {loading ? (
                                <div className="flex items-center gap-3">
                                    <div className="w-5 h-5 border-[2.5px] border-white/20 border-t-[#D4AF37] rounded-full animate-spin" />
                                    <span className="text-[#D4AF37]">Processing...</span>
                                </div>
                            ) : (
                                <>
                                    {step === 1 ? 'Continue Securely' : 'Verify Identity'}
                                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-[#D4AF37] group-hover:text-[#111111] transition-all duration-300">
                                        <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 pt-8 border-t border-gray-200/50 relative">
                        {/* Decorative OR text container, if we wanted one, otherwise just clean divider */}

                        <p className="text-[11px] font-medium text-[#878787] leading-relaxed mb-5">
                            By continuing, you acknowledge our<br />
                            <span className="text-[#111111] font-semibold cursor-pointer hover:text-[#D4AF37] transition-colors">Terms of Service</span> & <span className="text-[#111111] font-semibold cursor-pointer hover:text-[#D4AF37] transition-colors">Privacy Policy</span>
                        </p>
                        <p className="text-[12px] font-medium text-[#878787] bg-white inline-block px-4 py-2 rounded-full border border-gray-100 shadow-sm">
                            Need help? <span className="text-[#111111] font-bold cursor-pointer hover:text-[#D4AF37] transition-colors">Contact Support</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default LoginModal;
