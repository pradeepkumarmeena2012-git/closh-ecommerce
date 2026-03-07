import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Lock, Phone, ArrowRight, X, ShieldCheck, Home, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

const RegisterPage = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        address: '',
        city: '',
        state: '',
        zipCode: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.email || !formData.password || !formData.phone) {
            setError('Please fill in all required fields');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            const addressData = formData.address ? {
                address: formData.address,
                city: formData.city,
                state: formData.state,
                zipCode: formData.zipCode
            } : null;

            const result = await register(
                formData.name,
                formData.email,
                formData.password,
                formData.phone,
                addressData
            );
            if (result.success) {
                toast.success('Registration successful! Please verify your mobile.');
                // Redirect to login to verify OTP
                navigate('/login', { state: { mobile: formData.phone } });
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#fafafa] py-12 px-4 sm:px-6 lg:px-8 relative">
            <button
                onClick={() => navigate(-1)}
                className="fixed top-8 right-8 p-3 bg-white border border-gray-100 rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all z-50 text-gray-400 hover:text-black"
            >
                <X size={24} strokeWidth={3} />
            </button>

            <div className="max-w-md w-full bg-white p-10 rounded-[40px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-gray-100 animate-fadeInUp relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#ffcc00]/10 rounded-full blur-3xl" />

                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl transform rotate-3">
                        <User className="text-[#ffcc00]" size={28} />
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-gray-900 mb-2">Create Account</h2>
                    <p className="text-gray-400 font-bold text-[13px] uppercase tracking-widest leading-relaxed">Join us and start shopping</p>
                </div>

                <form className="space-y-4 relative z-10" onSubmit={handleSubmit}>
                    <div className="relative group">
                        <label className="absolute -top-2.5 left-4 bg-white px-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] group-focus-within:text-black transition-colors z-10">
                            Full Name
                        </label>
                        <div className="flex items-center relative">
                            <User className="absolute left-4 text-gray-400 group-focus-within:text-black" size={18} />
                            <input
                                name="name"
                                type="text"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full pl-12 pr-4 py-4 bg-gray-50/50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-black outline-none font-bold text-gray-900 transition-all placeholder:text-gray-300"
                                placeholder="John Doe"
                                required
                            />
                        </div>
                    </div>

                    <div className="relative group">
                        <label className="absolute -top-2.5 left-4 bg-white px-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] group-focus-within:text-black transition-colors z-10">
                            Email Address
                        </label>
                        <div className="flex items-center relative">
                            <Mail className="absolute left-4 text-gray-400 group-focus-within:text-black" size={18} />
                            <input
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full pl-12 pr-4 py-4 bg-gray-50/50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-black outline-none font-bold text-gray-900 transition-all placeholder:text-gray-300"
                                placeholder="john@example.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="relative group">
                        <label className="absolute -top-2.5 left-4 bg-white px-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] group-focus-within:text-black transition-colors z-10">
                            Mobile Number
                        </label>
                        <div className="flex items-center relative">
                            <div className="absolute left-4 flex items-center gap-2 border-r border-gray-100 pr-3">
                                <span className="text-[14px] font-black text-gray-900">+91</span>
                            </div>
                            <input
                                name="phone"
                                type="tel"
                                maxLength="10"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full pl-20 pr-4 py-4 bg-gray-50/50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-black outline-none font-bold text-gray-900 transition-all placeholder:text-gray-300"
                                placeholder="00000 00000"
                                required
                            />
                        </div>
                    </div>

                    <div className="relative group">
                        <label className="absolute -top-2.5 left-4 bg-white px-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] group-focus-within:text-black transition-colors z-10">
                            Password
                        </label>
                        <div className="flex items-center relative">
                            <Lock className="absolute left-4 text-gray-400 group-focus-within:text-black" size={18} />
                            <input
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full pl-12 pr-4 py-4 bg-gray-50/50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-black outline-none font-bold text-gray-900 transition-all placeholder:text-gray-300"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <div className="relative group">
                        <label className="absolute -top-2.5 left-4 bg-white px-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] group-focus-within:text-black transition-colors z-10">
                            Security Check
                        </label>
                        <div className="flex items-center relative">
                            <ShieldCheck className="absolute left-4 text-gray-400 group-focus-within:text-black" size={18} />
                            <input
                                name="confirmPassword"
                                type="password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="w-full pl-12 pr-4 py-4 bg-gray-50/50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-black outline-none font-bold text-gray-900 transition-all placeholder:text-gray-300"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <div className="pt-4 pb-2">
                        <div className="w-full h-px bg-gray-100 mb-6 relative">
                            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-[9px] font-black text-gray-300 uppercase tracking-[0.3em]">Address (Optional)</span>
                        </div>
                        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6 ml-1">Bespoke Delivery Address</h3>
                        <div className="space-y-4">
                            <div className="relative group">
                                <label className="absolute -top-2.5 left-4 bg-white px-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] group-focus-within:text-black transition-colors z-10">
                                    Full Address
                                </label>
                                <div className="flex items-center relative">
                                    <Home className="absolute left-4 text-gray-400 group-focus-within:text-black" size={18} />
                                    <input
                                        name="address"
                                        type="text"
                                        value={formData.address}
                                        onChange={handleChange}
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50/50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-black outline-none font-bold text-gray-900 transition-all placeholder:text-gray-300 text-[13px]"
                                        placeholder="House No, Building, Street"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative group">
                                    <label className="absolute -top-2.5 left-4 bg-white px-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] group-focus-within:text-black transition-colors z-10">
                                        City
                                    </label>
                                    <input
                                        name="city"
                                        type="text"
                                        value={formData.city}
                                        onChange={handleChange}
                                        className="w-full px-5 py-4 bg-gray-50/50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-black outline-none font-bold text-gray-900 transition-all placeholder:text-gray-300 text-[13px]"
                                        placeholder="City"
                                    />
                                </div>
                                <div className="relative group">
                                    <label className="absolute -top-2.5 left-4 bg-white px-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] group-focus-within:text-black transition-colors z-10">
                                        Pincode
                                    </label>
                                    <input
                                        name="zipCode"
                                        type="text"
                                        value={formData.zipCode}
                                        onChange={handleChange}
                                        className="w-full px-5 py-4 bg-gray-50/50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-black outline-none font-bold text-gray-900 transition-all placeholder:text-gray-300 text-[13px]"
                                        placeholder="000000"
                                    />
                                </div>
                            </div>

                            <div className="relative group">
                                <label className="absolute -top-2.5 left-4 bg-white px-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] group-focus-within:text-black transition-colors z-10">
                                    State
                                </label>
                                <div className="flex items-center relative">
                                    <MapPin className="absolute left-4 text-gray-400 group-focus-within:text-black" size={18} />
                                    <input
                                        name="state"
                                        type="text"
                                        value={formData.state}
                                        onChange={handleChange}
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50/50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-black outline-none font-bold text-gray-900 transition-all placeholder:text-gray-300 text-[13px]"
                                        placeholder="State"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[13px] font-bold border-2 border-red-100 animate-shake flex items-center gap-3">
                            <span className="shrink-0 text-lg">⚠️</span>
                            <p>{error}</p>
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
                                Sign Up
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>

                <p className="mt-8 text-center text-[12px] font-bold text-gray-400 uppercase tracking-tight">
                    Already have an account? <Link to="/login" className="text-black font-black hover:underline cursor-pointer">Login</Link>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;
