import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Share2 } from 'lucide-react';
import { useAuthStore } from '../../../shared/store/authStore';

const Refer = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const referralCode = user?.referralCode || 'CLOTH250';
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join our store!',
                    text: `Use my referral code ${referralCode} to get ₹250 off your first order!`,
                    url: window.location.origin + '/register?ref=' + referralCode,
                });
            } catch { /* user cancelled */ }
        } else {
            handleCopy();
        }
    };

    const howItWorks = [
        { id: 1, title: 'Share Your Code', desc: `Invite friends by sharing your referral code: ${referralCode}` },
        { id: 2, title: 'Your Friend Signs Up', desc: 'They register using your code and receive their own shopping discount.' },
        { id: 3, title: 'They Place an Order', desc: 'Your friend completes a purchase of ₹1000 or more.' },
        { id: 4, title: 'You Earn Rewards', desc: 'You receive ₹250 once their order is confirmed.' },
    ];

    return (
        <div className="bg-[#fafafa] min-h-screen pb-20">
            {/* Header */}
            <div className="sticky top-0 bg-white z-40 border-b border-gray-100 px-4 py-4 flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-base font-black uppercase tracking-tight">Refer & Earn</h1>
            </div>

            <div className="container mx-auto px-4 py-6 max-w-2xl">
                {/* Stats */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex justify-center gap-16 mb-6">
                    <div className="text-center">
                        <p className="text-[13px] font-bold text-gray-400 mb-1">Total Earning</p>
                        <p className="text-2xl font-black text-gray-900">₹0</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[13px] font-bold text-gray-400 mb-1">Friend's Signup</p>
                        <p className="text-2xl font-black text-gray-900">0</p>
                    </div>
                </div>

                {/* Content Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-8">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🔥</span>
                        <h2 className="text-[19px] font-black text-gray-900">
                            Earn ₹250 for each friend you refer!
                        </h2>
                    </div>

                    <p className="text-[14px] text-gray-600 font-medium leading-relaxed">
                        Refer your friends and enjoy exclusive rewards! Once your friend signs up using your referral code,
                        they will receive a unique discount code. When they place their first order worth ₹999 or more,
                        your referral bonus gets activated.
                    </p>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <p className="text-gray-900 font-bold text-[14px] mb-1">🔒 Important Note</p>
                        <p className="text-gray-500 text-[13px]">Referral rewards will not be granted if the order is cancelled.</p>
                    </div>

                    {/* How it works */}
                    <div className="space-y-6 pt-4">
                        <h3 className="text-[14px] font-bold text-gray-400 uppercase tracking-widest">How It Works</h3>
                        <div className="space-y-8">
                            {howItWorks.map(step => (
                                <div key={step.id} className="relative flex gap-6">
                                    {step.id !== 4 && <div className="absolute left-[7px] top-5 w-[2px] h-[calc(100%+16px)] bg-gray-100" />}
                                    <div className="relative z-10 w-4 h-4 rounded-full bg-white border-2 border-gray-300 mt-1.5" />
                                    <div>
                                        <h4 className="text-[15px] font-black text-gray-900">{step.id}. {step.title}</h4>
                                        <p className="text-[13px] text-gray-500 font-medium">{step.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Referral Code & Actions */}
                    <div className="pt-6 space-y-4">
                        <div className="flex items-center justify-between bg-white border-2 border-dashed border-gray-200 p-4 rounded-2xl hover:border-black transition-all">
                            <span className="text-xl font-bold tracking-[0.2em] text-gray-900 pl-2 uppercase">{referralCode}</span>
                            <button onClick={handleCopy} className="flex items-center gap-2 text-blue-600 font-bold px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-all uppercase text-sm">
                                <Copy size={16} />
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                        <button onClick={handleShare} className="w-full bg-black text-white flex items-center justify-center gap-3 py-4 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg active:scale-[0.98]">
                            <Share2 size={20} />
                            <span>Invite Friends</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Refer;
