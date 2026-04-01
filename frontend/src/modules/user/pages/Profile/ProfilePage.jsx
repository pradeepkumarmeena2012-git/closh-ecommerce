import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AccountLayout from '../../components/Profile/AccountLayout';
import { Camera, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const ProfilePage = () => {
    const { user, updateProfile, uploadProfileAvatar } = useAuth();
    const fileInputRef = useRef(null);

    // Form State initialized from user context
    const [formData, setFormData] = useState({
        firstName: user?.firstName || user?.name?.split(' ')[0] || '',
        lastName: user?.lastName || user?.name?.split(' ').slice(1).join(' ') || '',
        email: user?.email || '',
        dob: user?.dob || '',
        gender: user?.gender || '',
        phone: user?.phone || '',
        avatar: user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
    });

    // Update formData when user object changes
    useEffect(() => {
        if (user) {
            setFormData({
                firstName: user.firstName || user.name?.split(' ')[0] || '',
                lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
                email: user.email || '',
                dob: user.dob || '',
                gender: user.gender || '',
                phone: user.phone || '',
                avatar: user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
            });
        }
    }, [user]);

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                // Local preview immediately
                const reader = new FileReader();
                reader.onloadend = () => {
                    setFormData(prev => ({ ...prev, avatar: reader.result }));
                };
                reader.readAsDataURL(file);

                await uploadProfileAvatar(file);
                toast.success('Avatar updated successfully');
            } catch (error) {
                toast.error('Failed to update avatar');
            }
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updatePayload = {
                name: `${formData.firstName} ${formData.lastName}`.trim(),
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email, // Added email here
                dob: formData.dob,
                gender: formData.gender,
                phone: formData.phone
            };

            await updateProfile(updatePayload);
            setSaveMessage('Profile Updated');
            setTimeout(() => setSaveMessage(''), 3000);
        } catch (error) {
            console.error("Profile update error:", error);
            const msg = error.response?.data?.errors?.[0]?.message || error.response?.data?.message || error.message || 'Failed to update profile';
            toast.error(msg);
        } finally {
            setIsSaving(false);
        }
    };

    const genderOptions = ['Male', 'Female', 'Other'];

    if (!user) {
        return (
        <div className="min-h-[80vh] flex items-center justify-center bg-white px-4">
                <div className="bg-white p-10 rounded-[32px] shadow-sm w-full max-w-md text-center border border-gray-100">
                    <h2 className="text-[28px] font-bold text-gray-900 mb-4 ">Account</h2>
                    <p className="text-[13px] text-gray-500 mb-8">Login to view your profile and manage orders</p>
                    <Link to="/login" className="block w-full py-4 bg-black text-white rounded-full text-[14px] font-semibold hover:bg-gray-100 hover:text-black transition-all no-underline shadow-lg">
                        Login / Sign Up
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <AccountLayout>
            <div className="max-w-[800px] mx-auto bg-white min-h-screen pb-20">

                {/* Header & Avatar Section */}
                <div className="flex flex-col items-center mb-5 pt-1 px-4">
                    <div className="relative group cursor-pointer mb-3" onClick={triggerFileInput}>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageChange}
                            accept="image/*"
                            className="hidden"
                        />
                        <div className="w-24 h-24 md:w-36 md:h-36 rounded-full p-[4px] bg-gradient-to-tr from-[#FF5722]/20 to-[#FF5722]/5 shadow-sm group-hover:shadow-lg transition-all duration-500">
                            <div className="w-full h-full rounded-full bg-white overflow-hidden relative border-4 border-white">
                                <img
                                    src={formData.avatar}
                                    alt="User Avatar"
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                                />
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center">
                                    <Camera className="text-white w-8 h-8" strokeWidth={1.5} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <h2 className="text-[22px] md:text-[32px] font-bold text-gray-900 leading-tight">{formData.firstName} {formData.lastName}</h2>
                    <div className="flex items-center gap-2 mt-1 px-4 py-1 bg-gray-50 rounded-full border border-gray-100">
                        <Check size={14} className="text-[#FF5722]" strokeWidth={3} />
                        <span className="text-[12px] font-bold text-gray-500">Premium Member</span>
                    </div>
                </div>

                {/* Form Fields Section */}
                <div className="space-y-3 px-4 text-gray-900">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        <div className="relative group">
                            <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] md:text-[11px] font-bold text-gray-400 z-10 transition-colors group-focus-within:text-[#FF5722]">First Name</label>
                            <input
                                type="text"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                className="w-full px-4 py-2.5 md:py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-1 focus:ring-[#FF5722] focus:border-[#FF5722] outline-none transition-all font-semibold text-[13px] md:text-[14px] text-gray-900"
                                placeholder="First Name"
                            />
                        </div>
                        <div className="relative group">
                            <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] md:text-[11px] font-bold text-gray-400 z-10 transition-colors group-focus-within:text-[#FF5722]">Last Name</label>
                            <input
                                type="text"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                className="w-full px-4 py-2.5 md:py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-1 focus:ring-[#FF5722] focus:border-[#FF5722] outline-none transition-all font-semibold text-[13px] md:text-[14px] text-gray-900"
                                placeholder="Last Name"
                            />
                        </div>
                    </div>

                    <div className="relative group">
                        <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] md:text-[11px] font-bold text-gray-400 z-10 transition-colors group-focus-within:text-[#FF5722]">Email Address</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-2.5 md:py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-1 focus:ring-[#FF5722] focus:border-[#FF5722] outline-none transition-all font-semibold text-[13px] md:text-[14px] text-gray-900"
                            placeholder="Email"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        <div className="relative group">
                            <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] md:text-[11px] font-bold text-gray-400 z-10 transition-colors group-focus-within:text-[#FF5722]">Mobile Number</label>
                            <div className="flex items-center gap-2 w-full px-4 py-2.5 md:py-3 bg-gray-50 border border-gray-100 rounded-xl focus-within:ring-1 focus-within:ring-[#FF5722] focus-within:border-[#FF5722] transition-all">
                                <div className="flex items-center gap-2 pr-3 border-r border-gray-200">
                                    <img src="https://flagcdn.com/w20/in.png" alt="India" className="w-5 rounded-[2px] shadow-sm" />
                                    <span className="text-[13px] md:text-[14px] font-bold text-gray-600">+91</span>
                                </div>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="flex-1 bg-transparent border-none outline-none font-semibold text-[13px] md:text-[14px] text-gray-900"
                                    placeholder="Phone Number"
                                />
                            </div>
                        </div>
                        <div className="relative group">
                            <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] md:text-[11px] font-bold text-gray-400 z-10 transition-colors group-focus-within:text-[#FF5722]">Date of Birth</label>
                            <input
                                type="text"
                                value={formData.dob}
                                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                className="w-full px-4 py-2.5 md:py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-1 focus:ring-[#FF5722] focus:border-[#FF5722] outline-none transition-all font-semibold text-[13px] md:text-[14px] text-gray-900"
                                placeholder="DD/MM/YYYY"
                            />
                        </div>
                    </div>

                    {/* Gender Selection */}
                    <div className="pt-1">
                        <h4 className="text-[10px] md:text-[11px] font-semibold text-gray-400 mb-2.5 ml-1">Gender Identification</h4>
                        <div className="flex flex-wrap gap-2">
                            {genderOptions.map(opt => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, gender: opt })}
                                    className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all duration-300 border ${formData.gender === opt
                                        ? 'bg-black text-white border-black shadow-sm'
                                        : 'bg-gray-50 text-gray-500 border-gray-100 hover:border-gray-200'
                                        }`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 md:space-y-6">
                        {/* Save Action */}
                        <div className="pt-2 pb-4 relative">
                            {saveMessage && (
                                <div className="absolute -top-2 left-0 w-full flex justify-center">
                                    <span className="bg-[#FF5722]/10 text-[#FF5722] border border-[#FF5722]/20 px-4 py-1.5 rounded-full text-[11px] font-semibold animate-fade-in-up">
                                        {saveMessage}
                                    </span>
                                </div>
                            )}
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="group relative w-full py-3.5 bg-black text-white rounded-xl overflow-hidden disabled:opacity-70 transition-transform active:scale-95 shadow-md shadow-gray-200"
                            >
                                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                                <span className="relative font-bold text-[13px] md:text-[14px]">
                                    {isSaving ? 'Updating Profile...' : 'Save Profile Details'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </AccountLayout>
    );
};

export default ProfilePage;
