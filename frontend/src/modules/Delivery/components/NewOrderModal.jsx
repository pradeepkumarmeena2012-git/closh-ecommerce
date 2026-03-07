import { motion, AnimatePresence } from 'framer-motion';
import { FiMapPin, FiPackage, FiClock, FiX } from 'react-icons/fi';
import { formatPrice } from '../../../shared/utils/helpers';
import SwipeToAccept from './SwipeToAccept';
import { createPortal } from 'react-dom';

const NewOrderModal = ({ order, isOpen, onClose, onAccept, isAccepting }) => {
    return createPortal(
        <AnimatePresence>
            {isOpen && order && (
                <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Bottom Sheet Modal Content */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="relative bg-white rounded-t-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col z-[10000]"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-green-600 to-green-700 p-4 text-white relative flex-shrink-0">
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                            >
                                <FiX size={20} />
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                    <FiPackage className="text-xl" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold">New Order Request</h2>
                                    <p className="text-green-100 text-sm">Order #{order.id}</p>
                                </div>
                            </div>
                        </div>

                        {/* Content Container */}
                        <div className="p-5 overflow-y-auto overflow-x-hidden">

                            {/* Earnings & Time */}
                            <div className="flex justify-between items-center bg-green-50 rounded-2xl p-4 mb-5 border border-green-100">
                                <div className="text-center flex-1">
                                    <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider mb-1">Earning</p>
                                    <p className="text-xl font-black text-green-800">{formatPrice(order.deliveryFee || 0)}</p>
                                </div>
                                <div className="w-px h-8 bg-green-200"></div>
                                <div className="text-center flex-1">
                                    <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider mb-1">Est. Time</p>
                                    <p className="text-lg font-bold text-green-800">{order.estimatedTime || 'N/A'}</p>
                                </div>
                                <div className="w-px h-8 bg-green-200"></div>
                                <div className="text-center flex-1">
                                    <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider mb-1">Distance</p>
                                    <p className="text-lg font-bold text-green-800">{order.distance || 'N/A'}</p>
                                </div>
                            </div>

                            {/* Locations */}
                            <div className="relative pl-6 mb-6">
                                <div className="absolute left-[11px] top-3 bottom-8 w-px bg-gray-200 border-l border-dashed border-gray-400"></div>

                                {/* Pickup */}
                                <div className="relative mb-6">
                                    <div className="absolute -left-[27px] top-1 w-4 h-4 bg-orange-100 border border-orange-500 rounded-full flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                                    </div>
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Pickup From</h3>
                                    <p className="font-bold text-gray-800 text-sm">{order.vendorName || 'Vendor'}</p>
                                    <p className="text-xs text-gray-600">{order.vendorAddress || 'Address unavailable'}</p>
                                </div>

                                {/* Dropoff */}
                                <div className="relative">
                                    <div className="absolute -left-[27px] top-1 w-4 h-4 bg-green-100 border border-green-500 rounded-full flex items-center justify-center">
                                        <FiMapPin size={10} className="text-green-600" />
                                    </div>
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Deliver To</h3>
                                    <p className="font-bold text-gray-800 text-sm">{order.customer || 'Customer'}</p>
                                    <p className="text-xs text-gray-600">{order.address || 'Address unavailable'}</p>
                                </div>
                            </div>

                            <div className="mb-4">
                                <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Order Value: {formatPrice(order.total || 0)}</p>
                            </div>

                            {/* Swipe to Accept */}
                            <div className="pt-2 pb-6">
                                <SwipeToAccept
                                    onAccept={() => onAccept(order.id)}
                                    isLoading={isAccepting}
                                />
                            </div>

                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default NewOrderModal;
