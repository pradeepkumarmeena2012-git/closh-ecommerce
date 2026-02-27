import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AccountLayout from '../../components/Profile/AccountLayout';
import { Camera } from 'lucide-react';

const ProfilePage = () => {
    const { user } = useAuth();
    const fileInputRef = useRef(null);

    // Form State with Local Storage Persistence
    const [formData, setFormData] = useState(() => {
        const savedData = localStorage.getItem('profileData');
        return savedData ? JSON.parse(savedData) : {
            firstName: 'Sagar',
            lastName: 'Paliwal',
            email: 'sagar@example.com',
            dob: '01/01/1970',
            gender: 'Male',
            ageRange: '18-24',
            profession: 'Information Technology',
            phone: '9669002380',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
        };
    });

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result;
                setFormData(prev => ({ ...prev, avatar: base64String }));
                // Update local storage with the new avatar
                const updatedData = { ...formData, avatar: base64String };
                localStorage.setItem('profileData', JSON.stringify(updatedData));
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    const handleSave = () => {
        setIsSaving(true);
        localStorage.setItem('profileData', JSON.stringify(formData));
        setTimeout(() => {
            setIsSaving(false);
            setSaveMessage('Profile updated successfully!');
            setTimeout(() => setSaveMessage(''), 3000);
        }, 800);
    };

    const genderOptions = ['Male', 'Female', 'Other'];
    const ageOptions = ['Below 18', '18-24', 'Above 24'];
    const professionOptions = [
        'Human Resource', 'Information Technology', 'Other',
        'Sales', 'Finance', 'Medical', 'Business', 'Management'
    ];

    if (!user) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 px-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
                    <h2 className="text-2xl font-bold mb-4">Account</h2>
                    <p className="text-gray-500 mb-8">Login to view your profile and manage orders</p>
                    <Link to="/login" className="block w-full py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all no-underline">
                        Login / Sign Up
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <AccountLayout>
            <div className="max-w-[500px] mx-auto">
                <div className="flex flex-col items-center mb-6">
                    <div className="relative group">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageChange}
                            accept="image/*"
                            className="hidden"
                        />
                        <div
                            onClick={triggerFileInput}
                            className="w-24 h-24 md:w-28 md:h-28 rounded-3xl bg-yellow-400 overflow-hidden relative shadow-inner cursor-pointer"
                        >
                            <img
                                src={formData.avatar}
                                alt="User Avatar"
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <Camera className="text-white" size={24} />
                            </div>
                        </div>
                        <button
                            onClick={triggerFileInput}
                            className="absolute -bottom-2 -right-2 bg-gray-800 text-white p-2 rounded-xl border-4 border-white shadow-md hover:bg-black transition-colors"
                        >
                            <Camera size={14} />
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        <div className="relative">
                            <input
                                type="text"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                className="w-full px-5 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-medium text-gray-800"
                                placeholder="First Name"
                            />
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                className="w-full px-5 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-medium text-gray-800"
                                placeholder="Last Name"
                            />
                        </div>
                        <div className="relative">
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-5 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-medium text-gray-800"
                                placeholder="Email"
                            />
                        </div>
                        <div className="relative">
                            <label className="absolute -top-2.5 left-4 bg-white px-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Date of Birth</label>
                            <input
                                type="text"
                                value={formData.dob}
                                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                className="w-full px-5 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-medium text-gray-800"
                                placeholder="01/01/1970"
                            />
                        </div>
                    </div>

                    <div className="space-y-5 pt-1">
                        <div>
                            <h4 className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Gender</h4>
                            <div className="flex flex-wrap gap-2">
                                {genderOptions.map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => setFormData({ ...formData, gender: opt })}
                                        className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${formData.gender === opt
                                            ? 'bg-gray-100 text-black border border-gray-200'
                                            : 'bg-gray-50 text-gray-400 border border-transparent hover:bg-gray-100'
                                            }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Your age range</h4>
                            <div className="flex flex-wrap gap-2">
                                {ageOptions.map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => setFormData({ ...formData, ageRange: opt })}
                                        className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${formData.ageRange === opt
                                            ? 'bg-gray-100 text-black border border-gray-200'
                                            : 'bg-gray-50 text-gray-400 border border-transparent hover:bg-gray-100'
                                            }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Your Profession</h4>
                            <div className="flex flex-wrap gap-2">
                                {professionOptions.map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => setFormData({ ...formData, profession: opt })}
                                        className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${formData.profession === opt
                                            ? 'bg-gray-100 text-black border border-gray-200'
                                            : 'bg-gray-50 text-gray-400 border border-transparent hover:bg-gray-100'
                                            }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="relative">
                            <label className="absolute -top-2.5 left-4 bg-white px-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Contact Number</label>
                            <div className="flex items-center gap-3 w-full px-5 py-3 border border-gray-200 rounded-xl bg-gray-50/50">
                                <div className="flex items-center gap-2 pr-3 border-r border-gray-200">
                                    <img
                                        src="https://flagcdn.com/w20/in.png"
                                        alt="India Flag"
                                        className="w-5 rounded-sm"
                                    />
                                    <span className="text-sm font-bold">+91</span>
                                </div>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="flex-1 bg-transparent border-none outline-none font-bold text-gray-800"
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="w-full py-4 border-2 border-black rounded-xl font-extrabold text-[15px] uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-sm disabled:opacity-50 disabled:bg-gray-200 disabled:border-gray-200"
                            >
                                {isSaving ? 'Saving...' : 'Edit'}
                            </button>
                            {saveMessage && (
                                <p className="text-center text-green-600 font-bold mt-4 animate-bounce">
                                    {saveMessage}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AccountLayout>
    );
};

export default ProfilePage;
