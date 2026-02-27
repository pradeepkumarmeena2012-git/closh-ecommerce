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
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px] animate-fadeIn"
            onClick={handleBackdropClick}
        >
            <div className="bg-white w-full max-w-[400px] rounded-[32px] shadow-2xl relative overflow-hidden animate-scaleIn">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 z-20 w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors active:scale-95 text-gray-400 hover:text-black"
                >
                    <X size={18} strokeWidth={2.5} />
                </button>

                {/* Back Button (for OTP step) */}
                {step === 2 && (
                    <button
                        onClick={() => setStep(1)}
                        className="absolute top-6 left-6 z-20 w-8 h-8 hover:bg-gray-50 rounded-full flex items-center justify-center transition-colors text-gray-400 hover:text-black"
                    >
                        <ChevronLeft size={20} strokeWidth={2.5} />
                    </button>
                )}

                <div className="p-8 pt-10 text-center">
                    {/* Icon */}
                    <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl transform -rotate-3 group-hover:rotate-0 transition-transform">
                        <Phone className="text-[#ffcc00]" size={24} />
                    </div>

                    {/* Header */}
                    <h2 className="text-xl font-black uppercase tracking-tight text-gray-900 mb-2">
                        {step === 1 ? 'Login / Signup' : 'Verify OTP'}
                    </h2>
                    <p className="text-gray-400 font-bold text-[11px] uppercase tracking-widest max-w-[240px] mx-auto leading-relaxed mb-8">
                        {step === 1
                            ? 'Enter your mobile number to get started'
                            : `OTP sent to +91 ${mobileNumber}`}
                    </p>

                    {/* Form */}
                    <form onSubmit={step === 1 ? handleSendOTP : handleVerifyOTP} className="space-y-6">
                        {step === 1 ? (
                            <div className="relative text-left">
                                <label className="absolute -top-2 left-4 bg-white px-1 text-[9px] font-black text-gray-400 uppercase tracking-widest z-10">
                                    Mobile Number
                                </label>
                                <div className="flex items-center relative gap-3 bg-gray-50/50 border border-gray-100 rounded-2xl p-1 focus-within:bg-white focus-within:border-black focus-within:shadow-md transition-all">
                                    <div className="pl-4 pr-3 py-3 border-r border-gray-200">
                                        <span className="text-[14px] font-black text-gray-900">+91</span>
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
                                        className="w-full bg-transparent border-none outline-none text-[16px] font-bold placeholder:text-gray-300 placeholder:font-bold tracking-widest"
                                        placeholder="00000 00000"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="relative text-left">
                                <label className="absolute -top-2 left-4 bg-white px-1 text-[9px] font-black text-gray-400 uppercase tracking-widest z-10">
                                    Enter OTP
                                </label>
                                <div className="flex items-center relative bg-gray-50/50 border border-gray-100 rounded-2xl focus-within:bg-white focus-within:border-black focus-within:shadow-md transition-all">
                                    <div className="pl-4 py-4 text-gray-400">
                                        <ShieldCheck size={18} />
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
                                        className="w-full p-4 bg-transparent border-none outline-none text-[16px] font-black tracking-[0.5em] text-center pr-12"
                                        placeholder="••••••"
                                    />
                                </div>
                                <div className="flex justify-between items-center mt-3 px-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                        <Timer size={10} /> {resendTimer > 0 ? `${resendTimer}s` : 'Ready'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setResendTimer(30)}
                                        disabled={resendTimer > 0}
                                        className={`text-[10px] font-black text-black uppercase tracking-widest hover:underline ${resendTimer > 0 ? 'opacity-50' : ''}`}
                                    >
                                        Resend OTP
                                    </button>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 text-red-500 p-3 rounded-xl text-[11px] font-bold flex items-center gap-2 animate-pulse">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-black text-white rounded-[18px] font-black text-[12px] uppercase tracking-[0.2em] shadow-xl hover:bg-[#1a1a1a] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 group"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    {step === 1 ? 'Get OTP' : 'Verify & Login'}
                                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-gray-50">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed mb-4">
                            By continuing, you agree to our<br />
                            <span className="text-black cursor-pointer hover:underline">Terms of Service</span> & <span className="text-black cursor-pointer hover:underline">Privacy Policy</span>
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                            Having trouble? <span className="text-black font-black cursor-pointer hover:underline">Contact Support</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default LoginModal;
