import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FiSearch,
  FiMapPin,
  FiTruck,
  FiPackage,
  FiCheckCircle,
  FiPhone,
  FiClock,
} from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../components/DataTable";
import Badge from "../../../../shared/components/Badge";
import { getAllOrders } from "../../services/adminService";
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default Leaflet marker icons in Webpack/Vite environments
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const riderIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
});

const customerIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1275/1275210.png',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
});

const ChangeView = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2) {
      map.setView(center);
    }
  }, [center, map]);
  return null;
};

const OrderTracking = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const response = await getAllOrders({ limit: 100 });
        const normalizedOrders = response.data.orders.map(order => ({
          ...order,
          id: order.orderId || order._id,
          customer: {
            name: order.userId?.name || 'Unknown',
            email: order.userId?.email || ''
          },
          date: order.createdAt
        }));
        setOrders(normalizedOrders);
      } catch (error) {
        console.error("Tracking fetch error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const filteredOrders = orders.filter(
    (order) =>
      (order.id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customer?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const orderId = searchParams.get("orderId");
    if (!orderId || orders.length === 0) return;
    const matched = orders.find((o) => o.id === orderId);
    if (matched) {
      setSelectedOrder(matched);
      setSearchQuery(orderId);
    }
  }, [orders, searchParams]);

  // Live polling: refresh order data every 10s when actively tracking a delivery
  useEffect(() => {
    const activeStatuses = ['shipped', 'out_for_delivery', 'delivered'];
    if (!selectedOrder || !activeStatuses.includes(selectedOrder.status)) return;

    const poll = setInterval(async () => {
      try {
        const response = await getAllOrders({ limit: 100 });
        const normalizedOrders = response.data.orders.map(order => ({
          ...order,
          id: order.orderId || order._id,
          customer: {
            name: order.userId?.name || order.shippingAddress?.name || 'Unknown',
            email: order.userId?.email || order.shippingAddress?.email || ''
          },
          date: order.createdAt
        }));
        setOrders(normalizedOrders);
        // Update selected order with freshed data
        const refreshed = normalizedOrders.find(o => o.id === selectedOrder.id);
        if (refreshed) setSelectedOrder(refreshed);
      } catch {
        // silently ignore polling errors
      }
    }, 10000);

    return () => clearInterval(poll);
  }, [selectedOrder?.id, selectedOrder?.status]);

  const getTrackingSteps = (status) => {
    const steps = [
      { label: "Order Placed", status: "completed", icon: FiCheckCircle },
      {
        label: "Processing",
        status:
          status === "processing" ||
            status === "shipped" ||
            status === "delivered"
            ? "completed"
            : "pending",
        icon: FiPackage,
      },
      {
        label: "Shipped",
        status:
          status === "shipped" || status === "delivered"
            ? "completed"
            : "pending",
        icon: FiTruck,
      },
      {
        label: "Delivered",
        status: status === "delivered" ? "completed" : "pending",
        icon: FiMapPin,
      },
    ];
    return steps;
  };

  const columns = [
    {
      key: "id",
      label: "Order ID",
      sortable: true,
      render: (value) => <span className="font-semibold">{value}</span>,
    },
    {
      key: "customer",
      label: "Customer",
      sortable: true,
      render: (value) => (
        <div>
          <p className="font-medium text-gray-800">{value.name}</p>
          <p className="text-xs text-gray-500">{value.email}</p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => <Badge variant={value}>{value}</Badge>,
    },
    {
      key: "date",
      label: "Order Date",
      sortable: true,
      render: (value) => new Date(value).toLocaleString(),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (_, row) => (
        <button
          onClick={() => setSelectedOrder(row)}
          className="px-3 py-1 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-semibold">
          Track
        </button>
      ),
    },
  ];

  const riderCoords = selectedOrder?.deliveryBoyId?.currentLocation?.coordinates;
  const riderPos = Array.isArray(riderCoords) && riderCoords.length === 2 && riderCoords[0] !== 0 ? [riderCoords[1], riderCoords[0]] : null;
  const customerPos = (() => {
    const coords = selectedOrder?.dropoffLocation?.coordinates;
    if (Array.isArray(coords) && coords.length === 2 && coords[0] !== 0) {
      return [coords[1], coords[0]];
    }
    return null;
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 lg:hidden">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            Order Tracking
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Monitor real-time delivery progress and rider location
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order ID or customer name..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">Loading orders...</div>
            ) : (
              <DataTable
                data={filteredOrders}
                columns={columns}
                pagination={true}
                itemsPerPage={10}
              />
            )}
          </div>
        </div>

        {selectedOrder && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 flex flex-col gap-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Tracking Progress</h3>
                <p className="text-xs font-semibold text-gray-400 uppercase  mt-1">Order #{selectedOrder.id}</p>
              </div>
              <Badge variant={selectedOrder.status}>{selectedOrder.status}</Badge>
            </div>

            {/* Live Map Section */}
            {(selectedOrder.status === 'shipped' || selectedOrder.status === 'out_for_delivery' || selectedOrder.status === 'delivered') && (
              <div className="h-64 sm:h-80 w-full rounded-2xl overflow-hidden shadow-inner border border-gray-100 relative bg-white">
                {riderPos ? (
                  <MapContainer center={riderPos} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OSM" />

                    {/* Rider Marker */}
                    <Marker position={riderPos} icon={riderIcon}>
                      <Popup>
                        <div className="text-xs font-bold text-center">
                          <p>{selectedOrder.deliveryBoyId?.name || 'Rider'}</p>
                          <p className="text-primary-600">Currently Active</p>
                        </div>
                      </Popup>
                    </Marker>

                    {/* Customer Marker */}
                    {customerPos && (
                      <Marker position={customerPos} icon={customerIcon}>
                        <Popup>
                          <div className="text-xs font-bold text-center">
                            <p>{selectedOrder.customer.name}</p>
                            <p className="text-gray-500 uppercase er">Delivery Location</p>
                          </div>
                        </Popup>
                      </Marker>
                    )}

                    <ChangeView center={riderPos} />
                  </MapContainer>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <FiTruck className="text-gray-400 text-xl" />
                    </div>
                    <p className="text-gray-500 font-bold text-sm italic">Waiting for rider live location...</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1  animate-pulse">Live Tracking Active</p>
                  </div>
                )}
                <div className="absolute top-3 left-3 z-[1000] bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-gray-100 shadow-sm flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                  <span className="text-[10px] font-bold uppercase  text-emerald-600">Live Status</span>
                </div>
              </div>
            )}

            {/* Info Cards */}
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-100">
                <p className="text-[10px] font-bold uppercase  text-gray-400 mb-2">Delivery Partner</p>
                {selectedOrder.deliveryBoyId ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 gradient-blue text-white rounded-lg flex items-center justify-center font-bold text-sm">
                      {selectedOrder.deliveryBoyId.name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 text-sm truncate">{selectedOrder.deliveryBoyId.name}</p>
                      <p className="text-xs text-blue-600 font-semibold">{selectedOrder.deliveryBoyId.phone}</p>
                    </div>
                    <a href={`tel:${selectedOrder.deliveryBoyId.phone}`} className="p-2 bg-white text-blue-600 rounded-lg shadow-sm border border-blue-50">
                      <FiPhone className="text-sm" />
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No delivery partner assigned yet</p>
                )}
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-100">
                <p className="text-[10px] font-bold uppercase  text-gray-400 mb-2">Customer Details</p>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-bold text-gray-800">{selectedOrder.customer.name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <FiMapPin className="text-[10px]" />
                    {selectedOrder.shippingAddress?.address || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              {getTrackingSteps(selectedOrder.status).map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={index} className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${step.status === "completed"
                      ? "bg-emerald-100 text-emerald-600 border-2 border-emerald-200"
                      : "bg-gray-100 text-gray-400 border border-gray-200 opacity-50"
                      }`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <p className={`text-sm font-bold ${step.status === "completed" ? "text-gray-800" : "text-gray-400 opacity-60"}`}>
                        {step.label}
                      </p>
                      {step.status === "completed" && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <FiClock className="text-[10px]" />
                          <p className="text-[10px] text-gray-500 font-bold uppercase ">Updated Successfully</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => navigate(`/admin/orders/${selectedOrder.id}`)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-gray-100 text-gray-400 rounded-2xl text-[10px] font-bold uppercase  hover:bg-white hover:text-black transition-all font-bold"
            >
              <FiPackage />
              Full Order Management
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default OrderTracking;
