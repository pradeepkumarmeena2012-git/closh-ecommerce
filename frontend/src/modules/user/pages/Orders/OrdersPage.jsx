import React from 'react';
import AccountLayout from '../../components/Profile/AccountLayout';
import { ShoppingBag, ChevronRight, Package, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const OrdersPage = () => {
    const navigate = useNavigate();

    // Get local user orders and master admin orders
    const localUserOrders = JSON.parse(localStorage.getItem('userOrders') || '[]');
    const adminOrders = JSON.parse(localStorage.getItem('admin-orders') || '[]');

    // Merge to get latest status
    const orders = localUserOrders.map(userOrder => {
        const adminOrder = adminOrders.find(ao => ao.id === userOrder.id);
        return adminOrder ? { ...userOrder, status: adminOrder.status } : userOrder;
    });

    return (
        <AccountLayout>
            <div className="space-y-6">
                <h2 className="text-xl font-black uppercase tracking-tight mb-6">My Orders</h2>

                {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[400px] text-center bg-white rounded-3xl p-8 border border-gray-100">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                            <ShoppingBag size={32} className="text-gray-300" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">No orders found</h3>
                        <p className="text-gray-500 text-sm mb-8 max-w-xs mx-auto">Looks like you haven't placed any orders yet.</p>
                        <button
                            onClick={() => navigate('/shop')}
                            className="px-8 py-4 bg-black text-white text-[12px] font-black uppercase tracking-widest rounded-2xl hover:bg-gray-800 transition-all shadow-xl active:scale-95"
                        >
                            Start Shopping
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {orders.map((order) => (
                            <div key={order.id} className="bg-white rounded-[24px] border border-gray-100 p-4 md:p-6 shadow-sm hover:shadow-md transition-all group">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-50">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-[10px] font-black bg-black text-white px-2 py-0.5 rounded uppercase tracking-wider">
                                                {order.status}
                                            </span>
                                            <span className="text-xs font-bold text-gray-400">#{order.id}</span>
                                        </div>
                                        <p className="text-xs font-bold text-gray-500 flex items-center gap-1 mt-2">
                                            <Clock size={12} /> Placed on {order.date}
                                        </p>
                                    </div>
                                    <div className="text-left sm:text-right w-full sm:w-auto flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-end">
                                        <p className="text-sm font-black text-black">Total: ₹{order.total}</p>
                                        <button
                                            onClick={() => navigate(`/orders/${order.id}`)}
                                            className="text-[10px] font-bold text-[#ffcc00] uppercase tracking-widest mt-0 sm:mt-1 hover:text-black transition-colors"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex gap-3 md:gap-4">
                                            <div className="w-16 h-20 bg-gray-50 rounded-xl overflow-hidden shrink-0 border border-gray-100">
                                                <img src={item.image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            </div>
                                            <div className="flex-1 min-w-0 py-1">
                                                <h4 className="text-sm font-bold text-gray-900 line-clamp-1">{item.name}</h4>
                                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mt-1">
                                                    {item.brand} • Size {item.selectedSize} • Qty {item.quantity}
                                                </p>
                                                <p className="text-xs font-black text-black mt-2">₹{item.discountedPrice}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-xs font-bold text-green-600">
                                        <Package size={14} />
                                        <span className="truncate">Expected Delivery by {new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/track-order/${order.id}`)}
                                        className="px-4 py-2 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-100 transition-colors shrink-0"
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
