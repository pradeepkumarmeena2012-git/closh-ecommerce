import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AccountLayout from '../../components/Profile/AccountLayout';
import { Tag, ChevronDown, ChevronUp, Percent, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../../shared/utils/api';

const OffersPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const fromPayment = location.state?.from === 'payment';
    const [promoCodes, setPromoCodes] = useState([]);
    const [expandedTerms, setExpandedTerms] = useState({});

    useEffect(() => {
        const fetchPromoCodes = async () => {
            try {
                const response = await api.get('/coupons/available');
                const data = response.data?.data || response.data || [];
                setPromoCodes(data);
            } catch (err) {
                console.error("Failed to fetch coupons:", err);
            }
        };
        fetchPromoCodes();
    }, []);

    const toggleTerms = (id) => {
        setExpandedTerms(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleBack = () => {
        if (fromPayment) {
            navigate('/payment');
        } else {
            navigate('/account');
        }
    };

    return (
        <AccountLayout hideHeader={fromPayment}>
            {fromPayment && (
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={handleBack}
                        className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-lg"
                    >
                        <ArrowLeft size={20} strokeWidth={3} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold uppercase  text-gray-900">Available Offers</h2>
                        <p className="text-[11px] font-bold text-gray-400 uppercase ">Select a code for your order</p>
                    </div>
                </div>
            )}

            {!fromPayment && (
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                        <Tag size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold uppercase  text-gray-900">Available Offers</h2>
                        <p className="text-[11px] font-bold text-gray-400 uppercase ">Apply active promo codes for extra savings</p>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                {promoCodes.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        {promoCodes.map((promo) => (
                            <div key={promo._id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                                                <Percent size={24} strokeWidth={3} />
                                            </div>
                                            <div className="border-2 border-dashed border-gray-300 rounded-lg px-4 py-1.5 bg-white flex flex-col items-center">
                                                <span className="font-bold text-lg text-gray-900 uppercase">{promo.code}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            {fromPayment ? (
                                                <button
                                                    onClick={() => {
                                                        navigate('/payment', { state: { ...location.state, appliedCode: promo.code } });
                                                        toast.success(`Applying ${promo.code}...`);
                                                    }}
                                                    className="bg-emerald-600 text-white px-8 py-2.5 rounded-xl font-bold text-[12px] hover:bg-emerald-700 transition-all uppercase shadow-lg active:scale-95"
                                                >
                                                    Apply
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(promo.code);
                                                        toast.success('Code copied!');
                                                    }}
                                                    className="bg-black text-white px-8 py-2.5 rounded-xl font-bold text-[12px] hover:bg-gray-800 transition-all uppercase shadow-lg active:scale-95"
                                                >
                                                    Copy
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <h3 className="text-[16px] font-bold text-gray-900 uppercase ">
                                            {promo.type === 'percentage' ? `${promo.discount || promo.value}% OFF` : `₹${promo.discount || promo.value} OFF`} ON MINIMUM PURCHASE: ₹{promo.minOrderValue || promo.minPurchase || 0}
                                        </h3>
                                        <p className="text-gray-500 text-[13px] font-medium leading-relaxed">
                                            {promo.type === 'percentage'
                                                ? `Get ${promo.discount || promo.value}% off on your order. Max discount up to ₹${promo.maxDiscount || 'unlimited'}.`
                                                : `Get a flat ₹${promo.discount || promo.value} discount on your order.`
                                            }
                                        </p>
                                        <p className="text-emerald-600 text-[13px] font-bold pt-2 flex items-center gap-1.5">
                                            <Tag size={14} /> Valid until {new Date(promo.endDate || promo.expiryDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="border-t border-gray-50 bg-[#fafafa]/50">
                                    <button
                                        onClick={() => toggleTerms(promo._id)}
                                        className="w-full py-3.5 flex items-center justify-center gap-2 text-gray-500 text-[12px] font-bold uppercase  hover:text-gray-900 transition-all"
                                    >
                                        Terms & Conditions {expandedTerms[promo._id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </button>

                                    {expandedTerms[promo._id] && (
                                        <div className="px-6 pb-6 animate-fadeInUp">
                                            <ul className="space-y-2 text-[12px] text-gray-500 list-disc pl-4 font-medium italic">
                                                <li>Minimum purchase of ₹{promo.minOrderValue || promo.minPurchase || 0} required.</li>
                                                <li>Offer valid until {new Date(promo.endDate).toLocaleDateString()}.</li>
                                                <li>{promo.usageLimit === -1 ? 'Unlimited usage per user.' : `Limited to ${promo.usageLimit} uses.`}</li>
                                                <li>Offer cannot be clubbed with other coupon codes.</li>
                                                <li>CLOSH reserves the right to withdraw the offer without prior notice.</li>
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-[32px] p-12 border-2 border-dashed border-gray-100 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6">
                            <Tag size={40} className="text-gray-200" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 uppercase  mb-2">No active offers</h3>
                        <p className="text-gray-400 text-[13px] font-medium max-w-[250px]">Check back later for exciting discounts and promo codes!</p>
                    </div>
                )}
            </div>
        </AccountLayout>
    );
};

export default OffersPage;
