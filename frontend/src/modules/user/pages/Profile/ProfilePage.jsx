import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AccountLayout from '../../components/Profile/AccountLayout';
import { Camera, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const ProfilePage = () => {
    const { user, updateProfile } = useAuth();
    const fileInputRef = useRef(null);

    // Form State initialized from user context
    const [formData, setFormData] = useState({
        firstName: user?.firstName || user?.name?.split(' ')[0] || '',
        lastName: user?.lastName || user?.name?.split(' ').slice(1).join(' ') || '',
        email: user?.email || '',
        dob: user?.dob || '',
        gender: user?.gender || '',
        ageRange: user?.ageRange || '',
        stylePreference: user?.stylePreference || '',
        preferredFit: user?.preferredFit || '',
        phone: user?.phone || '',
        avatar: user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
    });

    // Update formData when user object changes
    React.useEffect(() => {
        if (user) {
            setFormData({
                firstName: user.firstName || user.name?.split(' ')[0] || '',
                lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
                email: user.email || '',
                dob: user.dob || '',
                gender: user.gender || '',
                ageRange: user.ageRange || '',
                stylePreference: user.stylePreference || '',
                preferredFit: user.preferredFit || '',
                phone: user.phone || '',
                avatar: user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
            });
        }
    }, [user]);

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                // Actually upload if we had an upload function in useAuth
                // For now, keep the local preview logic but we should call the store
                const reader = new FileReader();
                reader.onloadend = () => {
                    setFormData(prev => ({ ...prev, avatar: reader.result }));
                };
                reader.readAsDataURL(file);
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
                dob: formData.dob,
                gender: formData.gender,
                ageRange: formData.ageRange,
                stylePreference: formData.stylePreference,
                preferredFit: formData.preferredFit,
                phone: formData.phone
            };

            await updateProfile(updatePayload);
            setSaveMessage('Profile Updated');
            setTimeout(() => setSaveMessage(''), 3000);
        } catch (error) {
            toast.error(error.message || 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    const genderOptions = ['Male', 'Female', 'Other'];
    const ageOptions = ['Below 18', '18-24', 'Above 24'];
    const styleOptions = [
        'Minimalist', 'Streetwear', 'Luxury',
        'Casual', 'Formal', 'Bohemian', 'Vintage', 'Athleisure'
    ];
    const fitOptions = ['Slim', 'Tailored', 'Regular', 'Oversized'];

    if (!user) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center bg-[#111111] px-4">
                <div className="bg-[#1a1a1a] p-10 rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.5)] w-full max-w-md text-center border border-white/5">
                    <h2 className="text-[28px] font-premium font-black text-[#FAFAFA] mb-4 tracking-tight">Account</h2>
                    <p className="text-[13px] font-premium text-white/50 mb-8 tracking-wide">Login to view your bespoke profile and manage orders</p>
                    <Link to="/login" className="block w-full py-4 bg-[#D4AF37] text-black rounded-full text-[13px] font-black uppercase tracking-widest hover:bg-[#FAFAFA] transition-all no-underline shadow-[0_10px_30px_rgba(212,175,55,0.2)]">
                        Login / Sign Up
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <AccountLayout>
            <div className="max-w-[500px] mx-auto bg-[#111111] min-h-screen pb-20">

                {/* Header & Avatar Section */}
                <div className="flex flex-col items-center mb-10 pt-4">
                    <div className="relative group cursor-pointer mb-5" onClick={triggerFileInput}>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageChange}
                            accept="image/*"
                            className="hidden"
                        />
                        <div className="w-28 h-28 md:w-32 md:h-32 rounded-full p-[3px] bg-gradient-to-tr from-[#111111] via-[#D4AF37] to-[#111111] shadow-[0_10px_30px_rgba(212,175,55,0.15)] group-hover:shadow-[0_15px_40px_rgba(212,175,55,0.3)] transition-all duration-500">
                            <div className="w-full h-full rounded-full bg-[#111111] overflow-hidden relative border-4 border-[#1a1a1a]">
                                <img
                                    src={formData.avatar}
                                    alt="User Avatar"
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                                />
                                <div className="absolute inset-0 bg-[#111111]/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center">
                                    <Camera className="text-[#D4AF37] w-8 h-8" strokeWidth={1.5} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <h2 className="text-[24px] font-premium font-black text-[#FAFAFA] tracking-tight">{formData.firstName} {formData.lastName}</h2>
                    <div className="flex items-center gap-1.5 mt-1.5 opacity-80">
                        <Check size={12} className="text-[#D4AF37]" strokeWidth={3} />
                        <span className="text-[10px] font-premium font-black text-[#D4AF37] uppercase tracking-[0.2em]">Member Since 2024</span>
                    </div>
                </div>

                {/* Form Fields Section */}
                <div className="space-y-5 px-4 text-[#FAFAFA]">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 gap-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative group">
                                <label className="absolute -top-2.5 left-4 bg-[#111111] px-2 text-[9px] font-premium font-black text-white/40 uppercase tracking-[0.15em] z-10 transition-colors group-focus-within:text-[#D4AF37]">First Name</label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-[#1a1a1a] border border-white/10 rounded-[16px] focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none transition-all font-premium font-medium text-[14px] text-[#FAFAFA] shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
                                    placeholder="First Name"
                                />
                            </div>
                            <div className="relative group">
                                <label className="absolute -top-2.5 left-4 bg-[#111111] px-2 text-[9px] font-premium font-black text-white/40 uppercase tracking-[0.15em] z-10 transition-colors group-focus-within:text-[#D4AF37]">Last Name</label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-[#1a1a1a] border border-white/10 rounded-[16px] focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none transition-all font-premium font-medium text-[14px] text-[#FAFAFA]"
                                    placeholder="Last Name"
                                />
                            </div>
                        </div>

                        <div className="relative group">
                            <label className="absolute -top-2.5 left-4 bg-[#111111] px-2 text-[9px] font-premium font-black text-white/40 uppercase tracking-[0.15em] z-10 transition-colors group-focus-within:text-[#D4AF37]">Email Address</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-5 py-3.5 bg-[#1a1a1a] border border-white/10 rounded-[16px] focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none transition-all font-premium font-medium text-[14px] text-[#FAFAFA]"
                                placeholder="Email"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative group">
                                <label className="absolute -top-2.5 left-4 bg-[#111111] px-2 text-[9px] font-premium font-black text-white/40 uppercase tracking-[0.15em] z-10 transition-colors group-focus-within:text-[#D4AF37]">Mobile Number</label>
                                <div className="flex items-center gap-3 w-full px-5 py-3.5 bg-[#1a1a1a] border border-white/10 rounded-[16px] focus-within:ring-1 focus-within:ring-[#D4AF37] focus-within:border-[#D4AF37] transition-all">
                                    <div className="flex items-center gap-2 pr-3 border-r border-white/10">
                                        <img src="https://flagcdn.com/w20/in.png" alt="India" className="w-4 rounded-sm shadow-sm" />
                                        <span className="text-[13px] font-premium font-black text-white/60">+91</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="flex-1 bg-transparent border-none outline-none font-premium font-medium text-[14px] text-[#FAFAFA]"
                                    />
                                </div>
                            </div>
                            <div className="relative group">
                                <label className="absolute -top-2.5 left-4 bg-[#111111] px-2 text-[9px] font-premium font-black text-white/40 uppercase tracking-[0.15em] z-10 transition-colors group-focus-within:text-[#D4AF37]">Date of Birth</label>
                                <input
                                    type="text"
                                    value={formData.dob}
                                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-[#1a1a1a] border border-white/10 rounded-[16px] focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none transition-all font-premium font-medium text-[14px] text-[#FAFAFA]"
                                    placeholder="DD/MM/YYYY"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="w-full h-px bg-white/10 my-6"></div>

                    {/* Chips Sections */}
                    <div className="space-y-7">
                        {/* Preferred Fit */}
                        <div>
                            <h4 className="text-[10px] font-premium font-black text-white/40 uppercase tracking-[0.2em] mb-3 ml-1">Preferred Fit (Bespoke)</h4>
                            <div className="flex flex-wrap gap-2.5">
                                {fitOptions.map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => setFormData({ ...formData, preferredFit: opt })}
                                        className={`px-5 py-2 rounded-full text-[12px] font-premium font-bold transition-all duration-300 ${formData.preferredFit === opt
                                            ? 'bg-[#D4AF37] text-black shadow-[0_8px_20px_rgba(212,175,55,0.2)] scale-105'
                                            : 'bg-[#1a1a1a] text-white/60 border border-white/5 hover:border-[#D4AF37]/50 hover:text-white hover:-translate-y-0.5'
                                            }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Gender */}
                        <div>
                            <h4 className="text-[10px] font-premium font-black text-white/40 uppercase tracking-[0.2em] mb-3 ml-1">Gender Identification</h4>
                            <div className="flex flex-wrap gap-2.5">
                                {genderOptions.map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => setFormData({ ...formData, gender: opt })}
                                        className={`px-5 py-2 rounded-full text-[12px] font-premium font-bold transition-all duration-300 ${formData.gender === opt
                                            ? 'bg-[#D4AF37] text-black shadow-[0_8px_20px_rgba(212,175,55,0.2)] scale-105'
                                            : 'bg-[#1a1a1a] text-white/60 border border-white/5 hover:border-[#D4AF37]/50 hover:text-white hover:-translate-y-0.5'
                                            }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Age Range */}
                        <div>
                            <h4 className="text-[10px] font-premium font-black text-white/40 uppercase tracking-[0.2em] mb-3 ml-1">Age Demographics</h4>
                            <div className="flex flex-wrap gap-2.5">
                                {ageOptions.map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => setFormData({ ...formData, ageRange: opt })}
                                        className={`px-5 py-2 rounded-full text-[12px] font-premium font-bold transition-all duration-300 ${formData.ageRange === opt
                                            ? 'bg-[#D4AF37] text-black shadow-[0_8px_20px_rgba(212,175,55,0.2)] scale-105'
                                            : 'bg-[#1a1a1a] text-white/60 border border-white/5 hover:border-[#D4AF37]/50 hover:text-white hover:-translate-y-0.5'
                                            }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Style Preference */}
                        <div>
                            <h4 className="text-[10px] font-premium font-black text-white/40 uppercase tracking-[0.2em] mb-3 ml-1">Style Preference</h4>
                            <div className="flex flex-wrap gap-2.5">
                                {styleOptions.map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => setFormData({ ...formData, stylePreference: opt })}
                                        className={`px-4 py-2 rounded-full text-[11px] font-premium font-bold transition-all duration-300 ${formData.stylePreference === opt
                                            ? 'bg-[#D4AF37] text-black shadow-[0_8px_20px_rgba(212,175,55,0.2)] scale-105'
                                            : 'bg-[#1a1a1a] text-white/60 border border-white/5 hover:border-[#D4AF37]/50 hover:text-white hover:-translate-y-0.5'
                                            }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Save Action */}
                        <div className="pt-8 pb-4 relative">
                            {saveMessage && (
                                <div className="absolute -top-2 left-0 w-full flex justify-center">
                                    <span className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 px-4 py-1.5 rounded-full text-[10px] font-premium font-black tracking-[0.15em] uppercase animate-fade-in-up">
                                        {saveMessage}
                                    </span>
                                </div>
                            )}
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="group relative w-full py-4 bg-[#D4AF37] text-[#111111] rounded-full overflow-hidden disabled:opacity-70 transition-transform active:scale-95 shadow-[0_15px_30px_rgba(212,175,55,0.2)] hover:shadow-[0_15px_35px_rgba(212,175,55,0.3)]"
                            >
                                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-shimmer" />
                                <span className="relative font-premium font-black text-[13px] uppercase tracking-widest group-hover:text-black transition-colors">
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
