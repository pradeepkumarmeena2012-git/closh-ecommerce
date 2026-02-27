import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Phone, ArrowRight, ShieldCheck, ChevronLeft, Timer, X } from 'lucide-react';

const LoginPage = () => {
    const [step, setStep] = useState(1); // 1: Mobile, 2: OTP
    const [mobileNumber, setMobileNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);

    const { loginWithOTP } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        let interval;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    const handleSendOTP = async (e) => {
        e.preventDefault();

        if (!mobileNumber) {
            setError('Mobile number is required to proceed');
            return;
        }

        if (mobileNumber.length !== 10) {
            setError('Please enter a valid 10-digit mobile number');
            return;
        }

        setError('');
        setIsLoading(true);

        // Mock OTP sending
        setTimeout(() => {
            setIsLoading(false);
            setStep(2);
            setResendTimer(30);
            // Auto-fill OTP for easy testing if needed, but let's keep it manual
        }, 1500);
    };

    const handleResendOTP = async () => {
        setError('');
        setIsLoading(true);

        // Mock OTP sending
        setTimeout(() => {
            setIsLoading(false);
            setResendTimer(30);
        }, 1500);
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();

        if (!otp) {
            setError('Please enter the OTP sent to your phone');
            return;
        }

        if (otp.length !== 6) {
            setError('Please enter the 6-digit OTP');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            const success = await loginWithOTP(mobileNumber, otp);
            if (success) {
                navigate('/profile');
            } else {
                setError('Invalid OTP. Please try again.');
            }
        } catch (err) {
            setError('Authentication failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#fafafa] py-12 px-4 sm:px-6 lg:px-8 relative">
            {/* Global Close Button */}
            <button
                onClick={() => navigate(-1)}
                className="fixed top-8 right-8 p-3 bg-white border border-gray-100 rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all z-50 text-gray-400 hover:text-black"
            >
                <X size={24} strokeWidth={3} />
            </button>

            <div className="max-w-md w-full bg-white p-10 rounded-[40px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-gray-100 animate-fadeInUp relative overflow-hidden">

                {/* Decorative Background Element */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#ffcc00]/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-black/5 rounded-full blur-3xl" />

                {/* Back Button for OTP Step */}
                {step === 2 && (
                    <button
                        onClick={() => { setStep(1); setError(''); }}
                        className="absolute top-8 left-8 p-2 hover:bg-gray-50 rounded-xl transition-all text-gray-400 hover:text-black"
                    >
                        <ChevronLeft size={20} strokeWidth={3} />
                    </button>
                )}

                {/* Header */}
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl transform -rotate-3 group-hover:rotate-0 transition-transform">
                        <Phone className="text-[#ffcc00]" size={28} />
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-gray-900 mb-2">
                        {step === 1 ? 'Login / Signup' : 'Verify OTP'}
                    </h2>
                    <p className="text-gray-400 font-bold text-[13px] uppercase tracking-widest max-w-[240px] mx-auto leading-relaxed">
                        {step === 1
                            ? 'Enter your mobile number to get started'
                            : `OTP sent to +91 ${mobileNumber}`}
                    </p>
                </div>

                {/* Form */}
                <form className="space-y-6 relative z-10" onSubmit={step === 1 ? handleSendOTP : handleVerifyOTP} noValidate>
                    <div className="space-y-4">
                        {step === 1 ? (
                            <div className="relative group">
                                <label className="absolute -top-2.5 left-4 bg-white px-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] group-focus-within:text-black transition-colors z-10">
                                    Mobile Number
                                </label>
                                <div className="flex items-center relative">
                                    <div className="absolute left-4 flex items-center gap-2 border-r border-gray-100 pr-3">
                                        <span className="text-[14px] font-black text-gray-900">+91</span>
                                    </div>
                                    <input
                                        type="tel"
                                        maxLength="10"
                                        value={mobileNumber}
                                        onChange={(e) => {
                                            setMobileNumber(e.target.value.replace(/\D/g, ''));
                                            if (error) setError('');
                                        }}
                                        className={`w-full pl-20 pr-4 py-5 bg-gray-50/50 border-2 rounded-2xl focus:bg-white outline-none font-black text-gray-900 transition-all placeholder:text-gray-300 tracking-widest ${error ? 'border-red-500 bg-red-50/10' : 'border-gray-100 focus:border-black'}`}
                                        placeholder="00000 00000"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="relative group">
                                <label className="absolute -top-2.5 left-4 bg-white px-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] group-focus-within:text-black transition-colors z-10">
                                    Enter 6-Digit OTP
                                </label>
                                <div className="flex items-center relative">
                                    <ShieldCheck className="absolute left-4 text-[#ffcc00]" size={20} />
                                    <input
                                        type="text"
                                        maxLength="6"
                                        autoFocus
                                        value={otp}
                                        onChange={(e) => {
                                            setOtp(e.target.value.replace(/\D/g, ''));
                                            if (error) setError('');
                                        }}
                                        className={`w-full pl-12 pr-4 py-5 bg-gray-50/50 border-2 rounded-2xl focus:bg-white outline-none font-black text-gray-900 transition-all placeholder:text-gray-300 tracking-[0.5em] ${error ? 'border-red-500 bg-red-50/10' : 'border-gray-100 focus:border-black'}`}
                                        placeholder="••••••"
                                    />
                                </div>
                                <div className="flex justify-between items-center mt-3 px-1">
                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Timer size={12} /> {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Ready to resend'}
                                    </span>
                                    {resendTimer === 0 && (
                                        <button
                                            type="button"
                                            onClick={handleResendOTP}
                                            disabled={isLoading}
                                            className={`text-[11px] font-black text-black uppercase tracking-widest hover:underline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {isLoading ? 'Sending...' : 'Resend OTP'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="bg-white text-gray-900 p-4 rounded-2xl text-[13px] font-bold border-2 border-black/5 animate-shake flex items-center gap-4 shadow-xl ring-4 ring-red-500/10">
                            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-red-200">
                                <Phone size={18} className="text-white" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500 mb-0.5">Alert</p>
                                <p className="leading-tight">{error}</p>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-3 py-5 bg-black text-white rounded-2xl font-black uppercase tracking-widest hover:bg-gray-800 active:scale-[0.98] transition-all shadow-[0_10px_30px_-5px_rgba(0,0,0,0.3)] disabled:opacity-50"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                {step === 1 ? 'Get OTP' : 'Verify & Continue'}
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>

                {/* Terms */}
                <p className="mt-8 text-center text-[11px] font-bold text-gray-400 leading-relaxed uppercase tracking-widest">
                    By continuing, you agree to our <br />
                    <span className="text-black hover:underline cursor-pointer">Terms of Service</span> & <span className="text-black hover:underline cursor-pointer">Privacy Policy</span>
                </p>

                {/* Support Info */}
                <div className="mt-10 pt-8 border-t border-gray-50 text-center">
                    <p className="text-[12px] font-bold text-gray-400 uppercase tracking-tight">
                        Having trouble? <span className="text-black font-black hover:underline cursor-pointer">Contact Support</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
