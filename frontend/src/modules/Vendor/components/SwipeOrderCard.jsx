import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { FiPackage, FiArrowRight, FiCheckCircle, FiClock } from 'react-icons/fi';
import { formatPrice } from '../../../shared/utils/helpers';
import { useVendorAuthStore } from '../store/vendorAuthStore';
import toast from 'react-hot-toast';

const SwipeOrderCard = ({ order, onStatusUpdate }) => {
    const { updateOrderStatus, vendor } = useVendorAuthStore();
    const [isUpdating, setIsUpdating] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const constraintsRef = useRef(null);

    const x = useMotionValue(0);
    const background = useTransform(
        x,
        [0, 200],
        ['rgba(79, 70, 229, 0.1)', 'rgba(16, 185, 129, 0.2)']
    );
    const opacity = useTransform(x, [0, 150], [1, 0]);
    const successOpacity = useTransform(x, [150, 200], [0, 1]);

    const vendorId = vendor?.id || vendor?._id;
    const currentVendorId = vendorId?.toString();
    const vendorItem = order.vendorItems?.find(
        (vi) => (vi.vendorId?.toString() === currentVendorId) || (vi.vendorId === currentVendorId)
    );

    const currentStatus = (vendorItem?.status ?? order.status ?? 'pending').toLowerCase();
    const displayAmount = vendorItem?.subtotal ?? order.totalAmount ?? order.total ?? 0;
    const orderId = order.orderId ?? order._id;

    const handleDragEnd = async (event, info) => {
        if (info.offset.x >= 180 && !isUpdating) {
            setIsUpdating(true);
            try {
                const nextStatus = currentStatus === 'pending' ? 'ready_for_pickup' : (currentStatus === 'ready_for_pickup' ? 'delivered' : 'ready_for_pickup');
                const res = await updateOrderStatus(orderId, nextStatus);
                if (res.success) {
                    setIsSuccess(true);
                    toast.success(`Order marked as ${nextStatus.replace(/_/g, ' ')}!`);
                    if (onStatusUpdate) onStatusUpdate(orderId, nextStatus);
                }
            } catch (err) {
                toast.error(err?.response?.data?.message || 'Failed to update status');
                x.set(0); // Reset swipe
            } finally {
                setIsUpdating(false);
            }
        } else {
            x.set(0); // Reset if not far enough
        }
    };

    if (isSuccess) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between"
            >
                <div className="flex items-center gap-3">
                    <div className="bg-green-500 p-2 rounded-full">
                        <FiCheckCircle className="text-white" />
                    </div>
                    <div>
                        <p className="font-bold text-green-800">{orderId}</p>
                        <p className="text-xs text-green-600 uppercase font-bold tracking-wider">Status Updated!</p>
                    </div>
                </div>
                <span className="text-green-700 font-bold">{formatPrice(displayAmount)}</span>
            </motion.div>
        );
    }

    const nextActionLabel = currentStatus === 'pending' ? 'Accept Order' : (currentStatus === 'ready_for_pickup' ? 'Mark Delivered' : 'Mark Ready');

    return (
        <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="p-4 pb-12">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <p className="font-bold text-gray-800">{orderId}</p>
                        <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-gray-900">{formatPrice(displayAmount)}</p>
                        <div className="flex items-center gap-1 justify-end text-orange-500">
                            <FiPackage className="text-xs" />
                            <span className="text-[10px] uppercase font-bold tracking-tight">{currentStatus.replace(/_/g, ' ')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Swipe Track */}
            <div
                ref={constraintsRef}
                className="absolute bottom-2 left-2 right-2 h-10 bg-gray-50 rounded-lg overflow-hidden border border-dashed border-gray-200"
            >
                <motion.div
                    style={{ background }}
                    className="absolute inset-0 flex items-center px-4"
                >
                    <motion.p
                        style={{ opacity }}
                        className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mx-auto"
                    >
                        Swipe to {nextActionLabel} <FiArrowRight />
                    </motion.p>
                    <motion.p
                        style={{ opacity: successOpacity }}
                        className="text-[10px] font-bold text-green-600 uppercase tracking-widest flex items-center gap-2 mx-auto absolute inset-0 flex items-center justify-center p-0"
                    >
                        Confirmed! <FiCheckCircle />
                    </motion.p>
                </motion.div>

                <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: 200 }}
                    style={{ x }}
                    onDragEnd={handleDragEnd}
                    className="absolute left-1 top-1 bottom-1 w-16 bg-white rounded-md shadow-sm border border-gray-200 flex items-center justify-center cursor-grab active:cursor-grabbing z-10"
                >
                    {isUpdating ? (
                        <div className="w-4 h-4 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
                    ) : (
                        <FiArrowRight className="text-indigo-600" />
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default SwipeOrderCard;
