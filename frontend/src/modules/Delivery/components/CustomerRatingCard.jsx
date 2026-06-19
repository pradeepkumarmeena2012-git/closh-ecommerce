import React, { useState, useEffect } from 'react';
import { FiStar, FiUser, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useDeliveryAuthStore } from '../store/deliveryStore';

const CustomerRatingCard = ({ orderId, customerId, customerName }) => {
    const { submitCustomerRating, getMyReviewForOrder } = useDeliveryAuthStore();
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [existingReview, setExistingReview] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchReview = async () => {
            try {
                const res = await getMyReviewForOrder(orderId);
                if (res?.review) {
                    setExistingReview(res.review);
                    setRating(res.review.rating);
                    setComment(res.review.comment || '');
                }
            } catch (error) {
                console.error("Failed to fetch existing customer rating:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchReview();
    }, [orderId, getMyReviewForOrder]);

    const handleSubmit = async () => {
        if (!rating) {
            toast.error('Please select a rating first');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await submitCustomerRating(orderId, customerId, rating, comment);
            toast.success('Thank you for rating the customer!');
            setExistingReview(res?.data || res);
        } catch (error) {
            toast.error(error?.response?.data?.message || error?.message || 'Failed to submit rating');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return null;

    return (
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm mt-6 mb-6 w-full max-w-md mx-auto text-left">
            <h3 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 text-slate-400">
                <FiUser size={16} /> Rate Customer
            </h3>

            {existingReview ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <FiCheckCircle className="text-emerald-500" size={24} />
                        <div>
                            <p className="text-sm font-bold text-emerald-900">You rated {customerName}</p>
                            <div className="flex gap-1 mt-1">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <FiStar
                                        key={star}
                                        size={14}
                                        className={star <= existingReview.rating ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    {existingReview.comment && (
                        <p className="text-[11px] text-emerald-800 font-medium italic">"{existingReview.comment}"</p>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex justify-center gap-2 py-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                className="p-1 transition-transform hover:scale-110 active:scale-95"
                            >
                                <FiStar
                                    size={36}
                                    className={`transition-colors ${(hoverRating || rating) >= star ? "fill-amber-400 text-amber-400" : "fill-slate-100 text-slate-200 hover:fill-amber-200 hover:text-amber-200"}`}
                                />
                            </button>
                        ))}
                    </div>

                    <div className="space-y-3">
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Optional comment about the customer..."
                            rows={2}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[12px] font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all resize-none"
                        />
                        <button
                            onClick={handleSubmit}
                            disabled={!rating || isSubmitting}
                            className={`w-full h-12 rounded-2xl font-bold text-[11px] uppercase tracking-widest transition-all ${
                                !rating || isSubmitting
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95'
                            }`}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Rating'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerRatingCard;
