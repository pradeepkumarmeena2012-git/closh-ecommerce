import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FiUser,
    FiShoppingBag,
    FiMail,
    FiPhone,
    FiMapPin,
    FiCalendar,
    FiInfo,
    FiGrid,
    FiPackage,
    FiTrendingUp,
    FiCheckCircle,
    FiClock,
    FiXCircle,
    FiSearch,
    FiFileText,
    FiDownload
} from "react-icons/fi";
import { useVendorStore } from "../../store/vendorStore";
import { getAllProducts, getAllOrders, getVendorDocuments, updateVendorDocumentStatus } from "../../services/adminService";
import Badge from "../../../../shared/components/Badge";
import DataTable from "../../components/DataTable";
import { formatPrice } from "../../../../shared/utils/helpers";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const VendorExplorer = () => {
    const navigate = useNavigate();
    const { vendors, initialize } = useVendorStore();
    const [selectedVendorId, setSelectedVendorId] = useState(null);
    const [vendorProducts, setVendorProducts] = useState([]);
    const [vendorOrders, setVendorOrders] = useState([]);
    const [vendorDocuments, setVendorDocuments] = useState([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    const [isLoadingOrders, setIsLoadingOrders] = useState(false);
    const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
    const [activeSubTab, setActiveSubTab] = useState("profile"); // profile, products, orders, documents
    const [vendorSearch, setVendorSearch] = useState("");

    useEffect(() => {
        initialize();
    }, [initialize]);

    // Set initial selected vendor
    useEffect(() => {
        if (vendors.length > 0 && !selectedVendorId) {
            setSelectedVendorId(vendors[0].id || vendors[0]._id);
        }
    }, [vendors, selectedVendorId]);

    // Fetch products for selected vendor
    useEffect(() => {
        if (selectedVendorId) {
            loadVendorProducts(selectedVendorId);
            loadVendorOrders(selectedVendorId);
            loadVendorDocuments(selectedVendorId);
        }
    }, [selectedVendorId]);

    const loadVendorDocuments = async (vendorId) => {
        setIsLoadingDocuments(true);
        try {
            const response = await getVendorDocuments(vendorId);
            const docs = response.data || [];
            setVendorDocuments(docs.map(d => ({
                ...d,
                id: d._id,
                date: d.createdAt || d.uploadedAt
            })));
        } catch (error) {
            setVendorDocuments([]);
        } finally {
            setIsLoadingDocuments(false);
        }
    };

    const handleDocumentStatusUpdate = async (documentId, newStatus) => {
        try {
            const response = await updateVendorDocumentStatus(selectedVendorId, documentId, newStatus);
            if (response.success) {
                toast.success(`Document ${newStatus} successfully.`);
                setVendorDocuments(prev => prev.map(doc =>
                    doc.id === documentId ? { ...doc, status: newStatus } : doc
                ));
            }
        } catch (error) {
            toast.error(error.message || `Failed to update document status to ${newStatus}`);
        }
    };

    const loadVendorProducts = async (vendorId) => {
        setIsLoadingProducts(true);
        try {
            const response = await getAllProducts({ vendorId, limit: 1000 });
            const products = response.data?.products || response.data || [];
            setVendorProducts(products.map(p => ({
                ...p,
                id: p._id,
                stockStatus: p.stock || (p.stockQuantity > 5 ? "in_stock" : p.stockQuantity > 0 ? "low_stock" : "out_of_stock")
            })));
        } catch (error) {
            setVendorProducts([]);
        } finally {
            setIsLoadingProducts(false);
        }
    };

    const loadVendorOrders = async (vendorId) => {
        setIsLoadingOrders(true);
        try {
            const response = await getAllOrders({ vendorId, limit: 1000 });
            const orders = response.data?.orders || response.data || [];
            setVendorOrders(orders.map(o => ({
                ...o,
                id: o.orderId || o._id,
                date: o.createdAt
            })));
        } catch (error) {
            setVendorOrders([]);
        } finally {
            setIsLoadingOrders(false);
        }
    };

    const selectedVendor = useMemo(() => {
        return vendors.find(v => String(v.id || v._id) === String(selectedVendorId));
    }, [vendors, selectedVendorId]);

    const filteredVendors = useMemo(() => {
        if (!vendorSearch) return vendors;
        return vendors.filter(v =>
            (v.storeName || v.name || "").toLowerCase().includes(vendorSearch.toLowerCase())
        );
    }, [vendors, vendorSearch]);

    const productColumns = [
        {
            key: "name",
            label: "Product",
            sortable: true,
            render: (value, row) => (
                <div className="flex items-center gap-3">
                    <img
                        src={row.image || row.images?.[0] || "https://placehold.co/40x40?text=P"}
                        alt={value}
                        className="w-10 h-10 object-cover rounded-lg border border-gray-200"
                    />
                    <div>
                        <span className="font-semibold text-gray-800 block text-sm">{value}</span>
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">
                            {row.categoryId?.name || "No Category"}
                        </span>
                    </div>
                </div>
            )
        },
        {
            key: "price",
            label: "Selling Price",
            sortable: true,
            render: (value) => <span className="font-bold text-gray-900">{formatPrice(value)}</span>
        },
        {
            key: "stockQuantity",
            label: "Stock",
            sortable: true,
            render: (value) => (
                <span className={`font-semibold ${value <= 5 ? "text-red-600" : "text-gray-700"}`}>
                    {value}
                </span>
            )
        },
        {
            key: "approvalStatus",
            label: "Approval",
            sortable: true,
            render: (value) => {
                let variant = "warning";
                let icon = <FiClock size={12} />;
                if (value === "approved") { variant = "success"; icon = <FiCheckCircle size={12} />; }
                if (value === "rejected") { variant = "error"; icon = <FiXCircle size={12} />; }

                return (
                    <Badge variant={variant} className="flex items-center gap-1">
                        {icon}
                        {String(value || "pending").toUpperCase()}
                    </Badge>
                );
            },
        },
    ];

    const orderColumns = [
        {
            key: "id",
            label: "Order ID",
            sortable: true,
        },
        {
            key: "date",
            label: "Date",
            sortable: true,
            render: (value) => new Date(value).toLocaleDateString(),
        },
        {
            key: "status",
            label: "Status",
            sortable: true,
            render: (value) => (
                <Badge
                    variant={
                        value === "delivered" ? "success" :
                            value === "pending" ? "warning" :
                                value === "cancelled" ? "error" : "info"
                    }
                >
                    {value?.toUpperCase()}
                </Badge>
            )
        },
        {
            key: "total",
            label: "Amount",
            sortable: true,
            render: (value) => <span className="font-bold">{formatPrice(value)}</span>
        },
        {
            key: "actions",
            label: "Actions",
            sortable: false,
            render: (_, row) => (
                <button
                    onClick={() => navigate(`/admin/orders/${row.id}`)}
                    className="text-primary-600 font-bold text-xs hover:underline"
                >
                    VIEW
                </button>
            )
        }
    ];

    const documentColumns = [
        {
            key: "name",
            label: "Document Name",
            sortable: true,
            render: (value, row) => (
                <div>
                    <span className="font-semibold text-gray-800 block text-sm">{value || row.fileName}</span>
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">
                        {row.category || "Other"}
                    </span>
                </div>
            )
        },
        {
            key: "date",
            label: "Uploaded",
            sortable: true,
            render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A',
        },
        {
            key: "status",
            label: "Status",
            sortable: true,
            render: (value) => (
                <Badge
                    variant={
                        value === "approved" ? "success" :
                            value === "pending" ? "warning" :
                                value === "rejected" ? "error" : "info"
                    }
                >
                    {String(value || "pending").toUpperCase()}
                </Badge>
            )
        },
        {
            key: "actions",
            label: "Actions",
            sortable: false,
            render: (_, row) => (
                <div className="flex items-center gap-3">
                    <a
                        href={row.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary-600 font-bold text-xs hover:underline"
                    >
                        <FiDownload size={12} /> VIEW
                    </a>
                    {row.status === "pending" && (
                        <>
                            <button
                                onClick={() => handleDocumentStatusUpdate(row.id, "approved")}
                                className="flex items-center gap-1 text-green-600 font-bold text-xs hover:underline"
                            >
                                <FiCheckCircle size={12} /> APPROVE
                            </button>
                            <button
                                onClick={() => handleDocumentStatusUpdate(row.id, "rejected")}
                                className="flex items-center gap-1 text-red-600 font-bold text-xs hover:underline"
                            >
                                <FiXCircle size={12} /> REJECT
                            </button>
                        </>
                    )}
                </div>
            )
        }
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Vendor Management</h1>
                <p className="text-gray-500 font-medium text-sm">Explore and manage products by vendor.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Vendor Sidebar List (as "Tabs") */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                            <div className="relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input
                                    type="text"
                                    placeholder="Filter vendors..."
                                    value={vendorSearch}
                                    onChange={(e) => setVendorSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="max-h-[600px] overflow-y-auto no-scrollbar py-2">
                            {filteredVendors.map((v) => (
                                <button
                                    key={v.id || v._id}
                                    onClick={() => setSelectedVendorId(v.id || v._id)}
                                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all ${selectedVendorId === (v.id || v._id)
                                        ? "bg-primary-50 border-r-4 border-primary-600"
                                        : "hover:bg-gray-50"
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${selectedVendorId === (v.id || v._id) ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-500"
                                        }`}>
                                        {(v.storeName || v.name)?.[0]?.toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-bold text-sm truncate ${selectedVendorId === (v.id || v._id) ? "text-primary-800" : "text-gray-700"
                                            }`}>
                                            {v.storeName || v.name}
                                        </p>
                                        <p className="text-[10px] text-gray-400 truncate uppercase tracking-widest">{v.status || 'Active'}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Detail Content */}
                <div className="lg:col-span-9 space-y-6">
                    <AnimatePresence mode="wait">
                        {selectedVendor ? (
                            <motion.div
                                key={selectedVendorId}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                {/* Vendor Header Card */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                                        <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg text-white text-3xl font-black">
                                            {(selectedVendor.storeName || selectedVendor.name)?.[0]?.toUpperCase()}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <h2 className="text-2xl font-black text-gray-900">{selectedVendor.storeName || selectedVendor.name}</h2>
                                                <Badge variant={selectedVendor.status === 'approved' ? 'success' : 'warning'}>
                                                    {selectedVendor.status?.toUpperCase()}
                                                </Badge>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-medium text-gray-500">
                                                <div className="flex items-center gap-2"><FiUser className="text-primary-500" /> {selectedVendor.name}</div>
                                                <div className="flex items-center gap-2"><FiMail className="text-primary-500" /> {selectedVendor.email}</div>
                                                <div className="flex items-center gap-2"><FiPhone className="text-primary-500" /> {selectedVendor.phone || 'No Phone'}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex border-b border-gray-100 mt-8">
                                        {[
                                            { id: "profile", label: "Registration Details", icon: FiInfo },
                                            { id: "products", label: "Products", icon: FiPackage },
                                            { id: "orders", label: "Orders", icon: FiShoppingBag },
                                            { id: "documents", label: "Documents", icon: FiFileText },
                                        ].map((tab) => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveSubTab(tab.id)}
                                                className={`px-6 py-4 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${activeSubTab === tab.id
                                                    ? "border-primary-600 text-primary-600"
                                                    : "border-transparent text-gray-400 hover:text-gray-600"
                                                    }`}
                                            >
                                                <tab.icon size={16} />
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="py-6">
                                        {activeSubTab === "profile" && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
                                                <div className="space-y-4">
                                                    <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                                                        <FiMapPin className="text-primary-500" /> Address Details
                                                    </h3>
                                                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-3">
                                                        {selectedVendor.shopAddress ? (
                                                            <div>
                                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Shop Address</p>
                                                                <p className="text-sm font-bold text-gray-700">{selectedVendor.shopAddress}</p>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div>
                                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Street</p>
                                                                    <p className="text-sm font-bold text-gray-700">{selectedVendor.address?.street || 'N/A'}</p>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div>
                                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">City</p>
                                                                        <p className="text-sm font-bold text-gray-700">{selectedVendor.address?.city || 'N/A'}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">State</p>
                                                                        <p className="text-sm font-bold text-gray-700">{selectedVendor.address?.state || 'N/A'}</p>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                                                        <FiTrendingUp className="text-primary-500" /> Account Highlights
                                                    </h3>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="bg-primary-50 p-5 rounded-2xl border border-primary-100">
                                                            <p className="text-[10px] text-primary-600 font-bold uppercase tracking-widest mb-1">Commission</p>
                                                            <p className="text-2xl font-black text-primary-800">{((selectedVendor.commissionRate || 0) * 100).toFixed(1)}%</p>
                                                        </div>
                                                        <div className="bg-green-50 p-5 rounded-2xl border border-green-100">
                                                            <p className="text-[10px] text-green-600 font-bold uppercase tracking-widest mb-1">Products</p>
                                                            <p className="text-2xl font-black text-green-800">{vendorProducts.length}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-sm text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                        <FiCalendar className="text-primary-500" />
                                                        <span>Joined on <span className="font-bold text-gray-700">{new Date(selectedVendor.joinDate).toLocaleDateString()}</span></span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {activeSubTab === "products" && (
                                            <div className="animate-in fade-in duration-500">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-lg font-black text-gray-800">Product Catalog</h3>
                                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                                        Total {vendorProducts.length} Items
                                                    </div>
                                                </div>
                                                <DataTable
                                                    data={vendorProducts}
                                                    columns={productColumns}
                                                    pagination={true}
                                                    itemsPerPage={10}
                                                    isLoading={isLoadingProducts}
                                                />
                                            </div>
                                        )}

                                        {activeSubTab === "orders" && (
                                            <div className="animate-in fade-in duration-500">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-lg font-black text-gray-800">Order History</h3>
                                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                                        Total {vendorOrders.length} Orders
                                                    </div>
                                                </div>
                                                <DataTable
                                                    data={vendorOrders}
                                                    columns={orderColumns}
                                                    pagination={true}
                                                    itemsPerPage={10}
                                                    isLoading={isLoadingOrders}
                                                />
                                            </div>
                                        )}

                                        {activeSubTab === "documents" && (
                                            <div className="animate-in fade-in duration-500">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-lg font-black text-gray-800">Uploaded Documents</h3>
                                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                                        Total {vendorDocuments.length} Documents
                                                    </div>
                                                </div>
                                                <DataTable
                                                    data={vendorDocuments}
                                                    columns={documentColumns}
                                                    pagination={true}
                                                    itemsPerPage={10}
                                                    isLoading={isLoadingDocuments}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-24 text-gray-400 space-y-4">
                                <FiUser size={64} className="opacity-20" />
                                <p className="font-black text-xl uppercase tracking-widest opacity-40">Select a vendor to explore</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
};

export default VendorExplorer;
