import React, { useState, useEffect } from 'react';
import { Star, Truck, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useReviewsStore } from '../../../../shared/store/reviewsStore';

const DeliveryRatingCard = ({ orderId, deliveryBoyId, deliveryBoyName, deliveryBoyAvatar }) => {
    const { submitDeliveryReview, getMyOrderReviews } = useReviewsStore();
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [existingReview, setExistingReview] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchReview = async () => {
            try {
                const res = await getMyOrderReviews(orderId);
                if (res?.deliveryReview) {
                    setExistingReview(res.deliveryReview);
                    setRating(res.deliveryReview.rating);
                    setComment(res.deliveryReview.comment || '');
                }
            } catch (error) {
                console.error("Failed to fetch existing delivery review:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchReview();
    }, [orderId, getMyOrderReviews]);

    const handleSubmit = async () => {
        if (!rating) {
            toast.error('Please select a rating first');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await submitDeliveryReview(orderId, deliveryBoyId, rating, comment);
            toast.success('Thank you for rating your delivery experience!');
            setExistingReview(res?.data || res);
        } catch (error) {
            toast.error(error?.response?.data?.message || error?.message || 'Failed to submit rating');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return null;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6 shadow-sm mt-4">
            <h3 className="text-[10px] md:text-sm font-bold uppercase mb-4 flex items-center gap-2 text-gray-400">
                <Truck size={16} className="text-gray-400" /> Rate Your Delivery Experience
            </h3>

            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                {/* Rider Info */}
                <div className="flex items-center gap-4 shrink-0 bg-gray-50 px-5 py-4 rounded-xl border border-gray-100 w-full md:w-auto justify-center md:justify-start">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-indigo-500 border border-gray-200 overflow-hidden shadow-sm">
                        {deliveryBoyAvatar ? (
                            <img src={deliveryBoyAvatar} className="w-full h-full object-cover" alt="Rider" />
                        ) : <Truck size={24} />}
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Your Rider</p>
                        <h4 className="text-sm font-bold text-gray-900">{deliveryBoyName || 'Delivery Partner'}</h4>
                    </div>
                </div>

                {/* Rating Form / Display */}
                <div className="flex-1 w-full">
                    {existingReview ? (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex gap-4">
                            <div className="mt-1">
                                <CheckCircle2 className="text-emerald-500" size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-emerald-900 mb-2">You rated this delivery</p>
                                <div className="flex gap-1 mb-2">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <Star
                                            key={star}
                                            size={16}
                                            className={star <= existingReview.rating ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}
                                        />
                                    ))}
                                </div>
                                {existingReview.comment && (
                                    <p className="text-[11px] text-emerald-800 font-medium italic">"{existingReview.comment}"</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-center md:justify-start gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        className="p-1 transition-transform hover:scale-110 active:scale-95"
                                    >
                                        <Star
                                            size={32}
                                            className={`transition-colors ${(hoverRating || rating) >= star ? "fill-amber-400 text-amber-400" : "fill-gray-100 text-gray-200 hover:fill-amber-200 hover:text-amber-200"}`}
                                        />
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Leave a comment about the delivery (optional)..."
                                    rows={2}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[12px] font-medium focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all resize-none"
                                />
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleSubmit}
                                        disabled={!rating || isSubmitting}
                                        className={`px-6 py-2.5 rounded-xl font-bold text-[11px] uppercase transition-all shadow-md ${
                                            !rating || isSubmitting
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                                                : 'bg-black text-white hover:bg-gray-800 hover:shadow-lg active:scale-95'
                                        }`}
                                    >
                                        {isSubmitting ? 'Submitting...' : 'Submit Rating'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeliveryRatingCard;
