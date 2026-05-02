import React, { useEffect, useState, useCallback } from 'react';
import AccountLayout from '../../components/Profile/AccountLayout';
import { ShoppingBag, Package, Clock, ChevronRight, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOrderStore } from '../../../../shared/store/orderStore';
import toast from 'react-hot-toast';

const OrdersPage = () => {
    const navigate = useNavigate();
    const { orders, fetchUserOrders, isLoading } = useOrderStore();
    const [isManualRefreshing, setIsManualRefreshing] = useState(false);

    const handleRefreshOrders = useCallback(async () => {
        setIsManualRefreshing(true);
        try {
            await fetchUserOrders(1, 20);
            toast.success('Orders refreshed');
        } catch (err) {
            console.error("Failed to refresh orders:", err);
            toast.error('Failed to refresh orders');
        } finally {
            setIsManualRefreshing(false);
        }
    }, [fetchUserOrders]);

    useEffect(() => {
        fetchUserOrders().catch(err => console.error("Failed to fetch orders:", err));
    }, [fetchUserOrders]);

    // Listen for refresh event from AccountLayout
    useEffect(() => {
        const onRefresh = () => handleRefreshOrders();
        window.addEventListener('user-panel-refresh', onRefresh);
        return () => window.removeEventListener('user-panel-refresh', onRefresh);
    }, [handleRefreshOrders]);

    if (isLoading && orders.length === 0) {
        return (
            <AccountLayout>
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <div className="w-10 h-10 border-4 border-black/10 border-t-black rounded-full animate-spin mb-4" />
                    <p className="text-[10px] font-bold uppercase  text-gray-400">Loading your collection...</p>
                </div>
            </AccountLayout>
        );
    }

    return (
        <AccountLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold uppercase ">My Orders</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRefreshOrders}
                            disabled={isManualRefreshing || isLoading}
                            className="w-9 h-9 bg-gray-100 text-gray-500 rounded-xl flex items-center justify-center hover:bg-gray-200 hover:text-black active:scale-95 transition-all disabled:opacity-50 border border-gray-200"
                            title="Refresh orders"
                        >
                            <RefreshCw size={15} strokeWidth={2.5} className={isManualRefreshing ? 'animate-spin' : ''} />
                        </button>
                        <span className="text-[10px] font-bold bg-gray-100 px-3 py-1 rounded-full uppercase  text-gray-400">
                            {orders.length} Orders
                        </span>
                    </div>
                </div>

                {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[400px] text-center bg-white rounded-3xl p-8 border border-gray-100">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6">
                            <ShoppingBag size={32} className="text-gray-300" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">No orders found</h3>
                        <p className="text-gray-500 text-sm mb-8 max-w-xs mx-auto text-center font-bold uppercase  text-[10px] opacity-60">Looks like you haven't placed any orders yet.</p>
                        <button
                            onClick={() => navigate('/shop')}
                            className="px-8 py-4 bg-black text-white text-[12px] font-bold uppercase  rounded-2xl hover:bg-gray-800 transition-all shadow-xl active:scale-95"
                        >
                            Start Shopping
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {orders.map((order) => (
                            <div 
                                key={order.id} 
                                onClick={() => navigate(`/orders/${order.orderId || order.id}`)}
                                className="bg-white rounded-[24px] border border-gray-100 p-4 md:p-6 shadow-sm hover:shadow-md transition-all group cursor-pointer"
                            >
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-50">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded uppercase ">
                                                {order.status || 'Pending'}
                                            </span>
                                            {order.deliveryType && order.deliveryType !== 'standard' && (
                                                <span className="text-[10px] font-bold bg-[#ffcc00] text-black px-2 py-0.5 rounded uppercase ">
                                                    {order.deliveryType.replace(/_/g, ' ')}
                                                </span>
                                            )}
                                            <span className="text-xs font-bold text-gray-300">#{order.orderId || order.id}</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1 mt-2 uppercase ">
                                            <Clock size={12} /> Placed on {new Date(order.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <div className="text-left sm:text-right w-full sm:w-auto flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-end">
                                        <p className="text-sm font-bold text-black">₹{order.total}</p>
                                        <div className="group flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase  mt-0 sm:mt-1 group-hover:text-black transition-colors">
                                            View Details <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex gap-3 md:gap-4">
                                            <div className="w-16 h-20 bg-white rounded-xl overflow-hidden shrink-0 border border-gray-100">
                                                <img
                                                    src={item.image}
                                                    alt=""
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                    onError={(e) => e.target.src = 'https://placehold.co/400x600?text=Premium+Piece'}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0 py-1">
                                                <h4 className="text-sm font-bold text-gray-900 line-clamp-1 uppercase ">{item.name}</h4>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase  mt-1">
                                                    {item.brand} {item.variant?.size ? `• Size ${item.variant.size}` : ''} • Qty {item.quantity}
                                                </p>
                                                <p className="text-xs font-bold text-black mt-2">₹{item.price}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase ">
                                        <Package size={14} />
                                        <span className="truncate">Instant Delivery (60 Mins)</span>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/track-order/${order.orderId || order.id}`);
                                        }}
                                        className="px-6 py-2.5 bg-black text-white text-[10px] font-bold uppercase rounded-xl hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200 relative z-10"
                                    >
                                        Track
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AccountLayout>
    );
};

export default OrdersPage;
