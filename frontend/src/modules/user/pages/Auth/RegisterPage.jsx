import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Lock, Phone, ArrowRight, X, ShieldCheck, Home, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

const RegisterPage = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: ''
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

        if (!formData.name || !formData.email || !formData.phone) {
            setError('Please fill in all required fields');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            const result = await register(
                formData.name,
                formData.email,
                formData.phone
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
                    <h2 className="text-3xl font-bold  text-gray-900 mb-2">Create Account</h2>
                    <p className="text-gray-500 font-medium text-[14px] leading-relaxed">Join us and start shopping</p>
                </div>

                <form className="space-y-4 relative z-10" onSubmit={handleSubmit}>
                    <div className="relative group">
                        <label className="absolute -top-2.5 left-4 bg-white px-2 text-[12px] font-semibold text-gray-500 group-focus-within:text-black transition-colors z-10">
                            Full Name
                        </label>
                        <div className="flex items-center relative">
                            <User className="absolute left-4 text-gray-400 group-focus-within:text-black" size={18} />
                            <input
                                name="name"
                                type="text"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-black outline-none font-medium text-gray-900 transition-all placeholder:text-gray-400"
                                placeholder="John Doe"
                                required
                            />
                        </div>
                    </div>

                    <div className="relative group">
                        <label className="absolute -top-2.5 left-4 bg-white px-2 text-[12px] font-semibold text-gray-500 group-focus-within:text-black transition-colors z-10">
                            Email Address
                        </label>
                        <div className="flex items-center relative">
                            <Mail className="absolute left-4 text-gray-400 group-focus-within:text-black" size={18} />
                            <input
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-black outline-none font-medium text-gray-900 transition-all placeholder:text-gray-400"
                                placeholder="john@example.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="relative group">
                        <label className="absolute -top-2.5 left-4 bg-white px-2 text-[12px] font-semibold text-gray-500 group-focus-within:text-black transition-colors z-10">
                            Mobile Number
                        </label>
                        <div className="flex items-center relative">
                            <div className="absolute left-4 flex items-center gap-2 border-r border-gray-100 pr-3">
                                <span className="text-[14px] font-bold text-gray-900">+91</span>
                            </div>
                            <input
                                name="phone"
                                type="tel"
                                maxLength="10"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full pl-20 pr-4 py-4 bg-white border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-black outline-none font-medium text-gray-900 transition-all placeholder:text-gray-400"
                                placeholder="00000 00000"
                                required
                            />
                        </div>
                    </div>



                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[13px] font-medium border-2 border-red-100 animate-shake flex items-center gap-3">
                            <span className="shrink-0 text-lg">⚠️</span>
                            <p>{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-3 py-4 bg-black text-white rounded-2xl font-bold transition-all shadow-[0_10px_30px_-5px_rgba(0,0,0,0.3)] disabled:opacity-50"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-3 border-gray-300 border-t-black rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>Sign Up</span>
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>

                <p className="mt-8 text-center text-[14px] text-gray-500">
                    Already have an account? <Link to="/login" className="text-black font-bold hover:underline cursor-pointer">Login</Link>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;
