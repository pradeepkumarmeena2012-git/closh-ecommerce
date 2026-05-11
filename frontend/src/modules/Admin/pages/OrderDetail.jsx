import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FiArrowLeft,
  FiEdit,
  FiCheck,
  FiX,
  FiPhone,
  FiMapPin,
  FiCreditCard,
  FiTruck,
  FiCalendar,
  FiTag,
  FiPackage,
  FiClock,
  FiMail,
  FiCamera,
  FiPrinter
} from 'react-icons/fi';
import { motion } from 'framer-motion';
import Badge from '../../../shared/components/Badge';
import AnimatedSelect from '../components/AnimatedSelect';
import { formatCurrency, formatDateTime } from '../utils/adminHelpers';
import { getOrderById, updateOrderStatus } from '../services/adminService';
import { formatVariantLabel } from '../../../shared/utils/variant';
import toast from 'react-hot-toast';
import { IMAGE_BASE_URL } from '../../../shared/utils/constants';

const getFullImageUrl = (image) => {
    if (!image) return null;
    if (image.startsWith('http') || image.startsWith('data:')) return image;
    const cleanImage = image.startsWith('/') ? image : `/${image}`;
    return `${IMAGE_BASE_URL}${cleanImage}`;
};

const OrderDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState('');

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrderData = async () => {
      setIsLoading(true);
      try {
        const response = await getOrderById(id);
        const o = response.data;

        // Normalize data to match UI structure
        const normalizedOrder = {
          ...o,
          id: o.orderId || o._id,
          customer: {
            name: o.userId?.name || 'Unknown',
            email: o.userId?.email || '',
            phone: o.userId?.phone || ''
          },
          date: o.createdAt
        };

        setOrder(normalizedOrder);
        setStatus(o.status);
      } catch (error) {
        console.error("Fetch order detail error:", error);
        toast.error('Order not found');
        navigate('/admin/orders/all-orders');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderData();
  }, [id, navigate]);

  const handleStatusUpdate = async () => {
    try {
      await updateOrderStatus(id, status);
      setOrder({ ...order, status });
      setIsEditing(false);
      toast.success('Order status updated successfully');
    } catch (error) {
      console.error("Status update error:", error);
    }
  };

  if (isLoading || !order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const statusOptions = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];

  // Handle items - could be a number or an array
  const itemsCount = Array.isArray(order.items) ? order.items.length : (typeof order.items === 'number' ? order.items : 0);
  const itemsArray = Array.isArray(order.items) ? order.items : [];

  // Calculate order breakdown
  const subtotal = order.subtotal ?? (order.total * 0.95);
  const shipping = order.shipping ?? (order.total * 0.05);
  const tax = order.tax ?? 0;
  const discount = order.discount ?? 0;

  // Get payment method display name
  const getPaymentMethodName = (method) => {
    if (!method) return 'N/A';
    const methods = {
      card: 'Credit/Debit Card',
      cash: 'Cash on Delivery',
      upi: 'UPI',
      wallet: 'Digital Wallet',
      bank: 'Bank Transfer'
    };
    return methods[method.toLowerCase()] || method;
  };

  // Resolve product image safely from the order payload
  const getProductImage = (item) => {
    if (item.image) {
      return getFullImageUrl(item.image);
    }
    if (item.productId?.images?.[0]) {
      return getFullImageUrl(item.productId.images[0]);
    }

    // Return placeholder
    return 'https://via.placeholder.com/100x100?text=Product';
  };

  const [showInvoice, setShowInvoice] = useState(false);

  const handlePrint = () => {
    const printContent = document.getElementById('printable-invoice');
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  const InvoiceModal = () => {
    if (!showInvoice) return null;

    // Get primary vendor details from the first item
    const firstVendor = order.vendorItems?.[0]?.vendorId || {};

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-8"
        >
          {/* Action Bar */}
          <div className="p-4 bg-gray-50 border-b flex justify-between items-center no-print">
            <h3 className="font-bold text-gray-800">Order Invoice</h3>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-bold"
              >
                <FiPrinter /> Print Invoice
              </button>
              <button
                onClick={() => setShowInvoice(false)}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-bold"
              >
                Close
              </button>
            </div>
          </div>

          {/* Printable Area */}
          <div id="printable-invoice" className="p-8 sm:p-12 bg-white text-gray-800 font-sans">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-8 mb-12">
              <div className="space-y-2">
                <h1 className="text-4xl font-black text-primary-600 tracking-tighter">CLOSH</h1>
                <div className="text-sm text-gray-500 space-y-1">
                  <p className="font-bold text-gray-800">CLOSH OFFICIAL PVT LTD</p>
                  <p>123, Fashion Hub, Sector 5, New Delhi - 110001</p>
                  <p>GSTIN: 07AAAAA0000A1Z5</p>
                  <p>Phone: +91 98765 43210</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">INVOICE</h2>
                <p className="text-gray-500 text-sm">#{order.id}</p>
                <p className="text-gray-500 text-sm">Date: {new Date(order.date).toLocaleDateString()}</p>
                <div className="mt-4 inline-block">
                    <Badge variant={order.paymentStatus === 'paid' ? 'delivered' : 'pending'}>
                        {order.paymentStatus?.toUpperCase() || 'PENDING'}
                    </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12 py-8 border-y border-gray-100">
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Billed From (Vendor)</h3>
                <div className="space-y-1">
                    <p className="font-bold text-lg text-gray-900">{firstVendor.storeName || order.vendorItems?.[0]?.vendorName || 'Closh Partner'}</p>
                    <p className="text-sm text-gray-600 leading-relaxed max-w-xs">{firstVendor.shopAddress || 'Address details in order file'}</p>
                    {firstVendor.gstNumber && <p className="text-sm font-semibold text-gray-700">GST: {firstVendor.gstNumber}</p>}
                    {firstVendor.phone && <p className="text-sm text-gray-500">Tel: {firstVendor.phone}</p>}
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Billed To (Customer)</h3>
                <div className="space-y-1">
                    <p className="font-bold text-lg text-gray-900">{order.shippingAddress?.name || order.customer?.name}</p>
                    <p className="text-sm text-gray-600 leading-relaxed max-w-xs">{order.shippingAddress?.address}, {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.zipCode}</p>
                    <p className="text-sm text-gray-500">Phone: {order.shippingAddress?.phone || order.customer?.phone}</p>
                    <p className="text-sm text-gray-500">Email: {order.customer?.email}</p>
                </div>
              </div>
            </div>

            <table className="w-full mb-12">
              <thead>
                <tr className="border-b-2 border-gray-900">
                  <th className="py-4 text-left text-xs font-black text-gray-400 uppercase tracking-wider">Product Description</th>
                  <th className="py-4 text-right text-xs font-black text-gray-400 uppercase tracking-wider">Price</th>
                  <th className="py-4 text-center text-xs font-black text-gray-400 uppercase tracking-wider">Qty</th>
                  <th className="py-4 text-right text-xs font-black text-gray-400 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {itemsArray.map((item, idx) => (
                  <tr key={idx} className="group">
                    <td className="py-6">
                      <p className="font-bold text-gray-900">{item.name}</p>
                      {formatVariantLabel(item.variant) && (
                        <p className="text-xs text-gray-400 mt-1">{formatVariantLabel(item.variant)}</p>
                      )}
                    </td>
                    <td className="py-6 text-right font-medium text-gray-600">{formatCurrency(item.price)}</td>
                    <td className="py-6 text-center font-bold text-gray-900">{item.quantity}</td>
                    <td className="py-6 text-right font-bold text-gray-900">{formatCurrency(item.price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end">
              <div className="w-full max-w-xs space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-bold text-gray-900">{formatCurrency(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Discount ({order.couponCode || 'PROMO'})</span>
                    <span className="font-bold text-green-600">-{formatCurrency(discount)}</span>
                  </div>
                )}
                {tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Estimated Tax</span>
                    <span className="font-bold text-gray-900">{formatCurrency(tax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Shipping & Handling</span>
                  <span className="font-bold text-gray-900">{formatCurrency(shipping)}</span>
                </div>
                <div className="pt-4 border-t-2 border-gray-900 flex justify-between items-center">
                  <span className="text-lg font-black text-gray-900 uppercase">Grand Total</span>
                  <span className="text-2xl font-black text-primary-600">{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>

            <div className="mt-20 pt-12 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400 font-medium">Thank you for shopping with Closh! This is a computer-generated invoice.</p>
              <div className="flex justify-center gap-8 mt-6 grayscale opacity-30">
                <div className="h-8 w-8 bg-gray-400 rounded-full"></div>
                <div className="h-8 w-24 bg-gray-400 rounded-lg"></div>
                <div className="h-8 w-8 bg-gray-400 rounded-full"></div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <InvoiceModal />
      {/* Compact Header */}
      <div className="flex items-center justify-between bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiArrowLeft className="text-lg text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-2 lg:hidden">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{order.id}</h1>
              {order.orderType && order.orderType !== 'standard' && (
                <span className={`px-2 py-0.5 ${order.orderType === 'try_and_buy' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-blue-50 text-blue-700 border-blue-100'} text-[10px] font-bold rounded-lg border uppercase er shadow-sm animate-pulse`}>
                  {order.orderType.replace(/_/g, ' ')}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">{formatDateTime(order.date)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleStatusUpdate}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <FiCheck className="text-sm" />
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setStatus(order.status);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                <FiX className="text-sm" />
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowInvoice(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-bold"
              >
                <FiPrinter className="text-sm" />
                Generate Invoice
              </button>
              <Badge variant={order.status}>{order.status}</Badge>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
              >
                <FiEdit className="text-sm" />
                Edit
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Order Overview Card */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            {isEditing ? (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Order Status
                </label>
                <AnimatedSelect
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  options={statusOptions.map((option) => ({
                    value: option,
                    label: option.charAt(0).toUpperCase() + option.slice(1),
                  }))}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Total</p>
                  <p className="font-bold text-gray-800 text-lg">{formatCurrency(order.total)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Items</p>
                  <p className="font-semibold text-gray-800">{itemsCount}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Payment</p>
                  <p className="text-xs font-semibold text-gray-800 capitalize">
                    {getPaymentMethodName(order.paymentMethod)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Payment Status</p>
                  <Badge variant={order.paymentStatus === 'paid' ? 'delivered' : order.paymentStatus === 'pending' ? 'pending' : 'cancelled'} className="text-xs">
                    {order.paymentStatus || (order.paymentMethod === 'cash' ? 'Pending' : 'Paid')}
                  </Badge>
                </div>
                {(order.paymentMethod === 'cod' || order.paymentMethod === 'cash') && (
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Cash Settlement</p>
                    <Badge variant={order.isCashSettled ? 'delivered' : 'pending'} className="text-[10px] font-bold uppercase">
                      {order.isCashSettled ? 'Settled to Office' : 'Pending Settlement'}
                    </Badge>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Vendor Settlement</p>
                  {(() => {
                    const commissions = order.commissions || [];
                    if (commissions.length === 0) return <span className="text-[10px] font-bold text-gray-400">N/A</span>;
                    const allPaid = commissions.every(c => c.status === 'paid');
                    const somePaid = commissions.some(c => c.status === 'paid');
                    const anyCancelled = commissions.some(c => c.status === 'cancelled');
                    
                    if (allPaid) return <Badge variant="delivered" className="text-[10px] font-bold uppercase">Settled</Badge>;
                    if (anyCancelled) return <Badge variant="cancelled" className="text-[10px] font-bold uppercase">Cancelled</Badge>;
                    if (somePaid) return <Badge variant="pending" className="text-[10px] font-bold uppercase">Partially Settled</Badge>;
                    return <Badge variant="pending" className="text-[10px] font-bold uppercase">Pending Settlement</Badge>;
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Return Requests Section */}
          {order.returnRequests && order.returnRequests.length > 0 && (
            <div className="bg-rose-50 rounded-lg p-4 shadow-sm border border-rose-100 mb-6">
              <h2 className="text-sm font-bold text-rose-800 mb-3 flex items-center gap-1.5">
                <FiPackage className="text-rose-600 text-base" />
                Return Requests
              </h2>
              <div className="space-y-3">
                {order.returnRequests.map((req) => (
                  <div key={req._id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-rose-100">
                    <div>
                      <p className="text-xs font-bold text-gray-800">
                        Request #{String(req._id).slice(-6).toUpperCase()} - {req.reason}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        Requested on {new Date(req.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={req.status === 'completed' ? 'delivered' : req.status === 'rejected' ? 'cancelled' : 'pending'} className="text-[10px] font-bold uppercase">
                        {req.status}
                      </Badge>
                      <button
                        onClick={() => navigate(`/admin/return-requests/${req._id}`)}
                        className="text-xs font-bold text-rose-600 hover:underline"
                      >
                        View Detail
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Order Items */}
          {itemsArray.length > 0 && (
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <FiPackage className="text-primary-600 text-base" />
                Order Items ({itemsCount})
              </h2>
              <div className="space-y-2">
                {itemsArray.map((item) => (
                  <div key={item.id || item.name} className="flex items-center gap-3 p-2.5 bg-white rounded-lg">
                    <img
                      src={getProductImage(item)}
                      alt={item.name || 'Product'}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/100x100?text=Product';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800 truncate">{item.name || 'Unknown Product'}</p>
                      <p className="text-xs text-gray-600">
                        {formatCurrency(item.price || 0)} x {item.quantity || 1}
                      </p>
                      {formatVariantLabel(item.variant) && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {formatVariantLabel(item.variant)}
                        </p>
                      )}
                    </div>
                    <p className="font-bold text-sm text-gray-800">
                      {formatCurrency((item.price || 0) * (item.quantity || 1))}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer & Shipping Combined Card */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer Info */}
              <div>
                <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                  <FiMail className="text-primary-600 text-base" />
                  Customer
                </h2>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="font-semibold text-sm text-gray-800">{order.customer?.name || order.shippingAddress?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-semibold text-xs text-gray-800 break-all">{order.customer?.email || order.shippingAddress?.email || 'N/A'}</p>
                  </div>
                  {(order.customer?.phone || order.shippingAddress?.phone) && (
                    <div>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <FiPhone className="text-xs" />
                        Phone
                      </p>
                      <p className="font-semibold text-sm text-gray-800">{order.customer?.phone || order.shippingAddress?.phone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Shipping Address */}
              {order.shippingAddress && (
                <div>
                  <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                    <FiMapPin className="text-primary-600 text-base" />
                    Shipping Address
                  </h2>
                  <div className="space-y-1.5 text-xs">
                    <p className="font-semibold text-gray-800">{order.shippingAddress.name || 'N/A'}</p>
                    {order.shippingAddress.address && (
                      <p className="text-gray-700">{order.shippingAddress.address}</p>
                    )}
                    {(order.shippingAddress.city || order.shippingAddress.state || order.shippingAddress.zipCode) && (
                      <p className="text-gray-700">
                        {[
                          order.shippingAddress.city,
                          order.shippingAddress.state,
                          order.shippingAddress.zipCode
                        ].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {order.shippingAddress.country && (
                      <p className="text-gray-700">{order.shippingAddress.country}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Special Instructions (Try & Buy / Check & Buy) */}
            {order.deliveryType && order.deliveryType !== 'standard' && (
              <div className={`mt-4 p-3 rounded-lg border-l-4 ${order.deliveryType === 'try_and_buy' ? 'bg-orange-50 border-orange-500' : 'bg-blue-50 border-blue-500'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <FiClock className={order.deliveryType === 'try_and_buy' ? 'text-orange-600' : 'text-blue-600'} />
                  <h2 className="text-sm font-bold uppercase text-gray-800">
                    {order.deliveryType.replace(/_/g, ' ')} Instruction
                  </h2>
                </div>
                <p className="text-xs text-gray-600 font-medium">
                  {order.deliveryType === 'try_and_buy'
                    ? "Rider will wait for the customer to try the clothes. Returns may be handled on the spot."
                    : "Rider will allow the customer to inspect the package before finalizing the delivery."}
                </p>
              </div>
            )}
          </div>

          {/* Tracking & Delivery Compact */}
          {(order.trackingNumber || order.deliveredDate || order.deliveredAt) && (
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                <FiTruck className="text-primary-600 text-base" />
                Tracking & Delivery
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {order.trackingNumber && (
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Tracking Number</p>
                    <p className="font-semibold text-xs text-gray-800 font-mono">{order.trackingNumber}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                    <FiClock className="text-xs" />
                    Delivery Type
                  </p>
                  <p className="font-semibold text-xs text-primary-600 uppercase">Instant (60 Mins)</p>
                </div>
                {(order.deliveredDate || order.deliveredAt) && (
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                      <FiPackage className="text-xs" />
                      Delivered
                    </p>
                    <p className="font-semibold text-xs text-gray-800">
                      {formatDateTime(order.deliveredDate || order.deliveredAt)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Proof & Verification Gallery */}
          {(order.readyPhoto || order.pickupPhoto || order.deliveryPhoto || order.openBoxPhoto || 
            order.deliveryFlow?.pickupPhoto || order.deliveryFlow?.deliveryProofPhoto || order.deliveryFlow?.openBoxPhoto) && (
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                <FiCamera className="text-primary-600 text-base" />
                Proof & Verification Photos
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {order.readyPhoto && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Package Ready</p>
                    <div className="relative aspect-video bg-gray-50 rounded-lg overflow-hidden border border-gray-200 group">
                      <img
                        src={getFullImageUrl(order.readyPhoto)}
                        alt="Ready Proof"
                        className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                        onClick={() => window.open(getFullImageUrl(order.readyPhoto), '_blank')}
                      />
                    </div>
                  </div>
                )}
                {(order.pickupPhoto || order.deliveryFlow?.pickupPhoto) && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Pickup Proof</p>
                    <div className="relative aspect-video bg-gray-50 rounded-lg overflow-hidden border border-gray-200 group">
                      <img
                        src={getFullImageUrl(order.pickupPhoto || order.deliveryFlow?.pickupPhoto)}
                        alt="Pickup Proof"
                        className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                        onClick={() => window.open(getFullImageUrl(order.pickupPhoto || order.deliveryFlow?.pickupPhoto), '_blank')}
                      />
                    </div>
                  </div>
                )}
                {(order.deliveryPhoto || order.deliveryFlow?.deliveryProofPhoto) && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Delivery Proof</p>
                    <div className="relative aspect-video bg-gray-50 rounded-lg overflow-hidden border border-gray-200 group">
                      <img
                        src={getFullImageUrl(order.deliveryPhoto || order.deliveryFlow?.deliveryProofPhoto)}
                        alt="Delivery Proof"
                        className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                        onClick={() => window.open(getFullImageUrl(order.deliveryPhoto || order.deliveryFlow?.deliveryProofPhoto), '_blank')}
                      />
                    </div>
                  </div>
                )}
                {(order.openBoxPhoto || order.deliveryFlow?.openBoxPhoto) && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Open Box Proof</p>
                    <div className="relative aspect-video bg-gray-50 rounded-lg overflow-hidden border border-gray-200 group">
                      <img
                        src={getFullImageUrl(order.openBoxPhoto || order.deliveryFlow?.openBoxPhoto)}
                        alt="Open Box Proof"
                        className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                        onClick={() => window.open(getFullImageUrl(order.openBoxPhoto || order.deliveryFlow?.openBoxPhoto), '_blank')}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Order Summary */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <h2 className="text-sm font-bold text-gray-800 mb-3">Order Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span className="flex items-center gap-1">
                    <FiTag className="text-xs" />
                    Discount
                    {order.couponCode && (
                      <span className="text-xs bg-green-100 px-1.5 py-0.5 rounded">({order.couponCode})</span>
                    )}
                  </span>
                  <span className="font-semibold">-{formatCurrency(discount)}</span>
                </div>
              )}
              {tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-semibold">{formatCurrency(tax)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span className="font-semibold">{formatCurrency(shipping)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between">
                <span className="font-bold text-gray-800">Total</span>
                <span className="font-bold text-lg text-gray-800">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Order Timeline */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
              <FiCalendar className="text-primary-600 text-base" />
              Timeline
            </h2>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800">Order Placed</p>
                  <p className="text-xs text-gray-500">{formatDateTime(order.date)}</p>
                </div>
              </div>
              {order.status === 'processing' && (
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800">Processing</p>
                    <p className="text-xs text-gray-500">Being prepared</p>
                  </div>
                </div>
              )}
              {order.status === 'shipped' && (
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800">Shipped</p>
                    {order.shippedDate && (
                      <p className="text-xs text-gray-500">{formatDateTime(order.shippedDate)}</p>
                    )}
                  </div>
                </div>
              )}
              {order.status === 'delivered' && (
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800">Delivered</p>
                    {(order.deliveredDate || order.deliveredAt) && (
                      <p className="text-xs text-gray-500">{formatDateTime(order.deliveredDate || order.deliveredAt)}</p>
                    )}
                  </div>
                </div>
              )}
              {order.status === 'cancelled' && (
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800">Cancelled</p>
                    {(order.cancelledDate || order.cancelledAt) && (
                      <p className="text-xs text-gray-500">{formatDateTime(order.cancelledDate || order.cancelledAt)}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <h2 className="text-sm font-bold text-gray-800 mb-3">Quick Actions</h2>
            <div className="space-y-1.5">
              {order.trackingNumber && (
                <button
                  onClick={() => navigate(`/admin/orders/order-tracking?orderId=${order.id}`)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-xs font-semibold"
                >
                  <FiTruck className="text-sm" />
                  Track Order
                </button>
              )}
              {order.customer?.email && (
                <button
                  onClick={() => window.location.href = `mailto:${order.customer.email}`}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-xs font-semibold"
                >
                  <FiMail className="text-sm" />
                  Email Customer
                </button>
              )}
              {(order.customer?.phone || order.shippingAddress?.phone) && (
                <button
                  onClick={() => window.location.href = `tel:${order.customer?.phone || order.shippingAddress?.phone}`}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-xs font-semibold"
                >
                  <FiPhone className="text-sm" />
                  Call Customer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default OrderDetail;

