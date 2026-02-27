import { useState, useMemo, useEffect } from "react";
import { FiSearch, FiCheck, FiX, FiEye } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../components/DataTable";
import Badge from "../../../../shared/components/Badge";
import ProductFormModal from "../../components/ProductFormModal";
import { formatPrice } from "../../../../shared/utils/helpers";
import { getAllProducts, updateProductStatus } from "../../services/adminService";
import toast from "react-hot-toast";

const PendingProducts = () => {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [productFormModal, setProductFormModal] = useState({
        isOpen: false,
        productId: null,
    });

    useEffect(() => {
        loadPendingProducts();
    }, []);

    const loadPendingProducts = async () => {
        setIsLoading(true);
        try {
            // Fetch products with approvalStatus=pending
            const response = await getAllProducts({ approvalStatus: "pending" });
            const allProducts = Array.isArray(response.data) ? response.data : (response.data?.products || []);

            const normalizedProducts = allProducts.map(p => ({
                ...p,
                id: p._id,
                image: p.image || p.images?.[0] || "https://placehold.co/50x50?text=Product",
            }));
            setProducts(normalizedProducts);
        } catch (error) {
            console.error("Failed to load pending products:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApproval = async (productId, status) => {
        try {
            await updateProductStatus(productId, status);
            toast.success(`Product ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
            setProducts(prev => prev.filter(p => p.id !== productId));
        } catch (error) {
            toast.error("Failed to update product status");
        }
    };

    const filteredProducts = useMemo(() => {
        return products.filter((product) =>
            product.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [products, searchQuery]);

    const columns = [
        {
            key: "id",
            label: "ID",
            sortable: true,
        },
        {
            key: "name",
            label: "Product Name",
            sortable: true,
            render: (value, row) => (
                <div className="flex items-center gap-3">
                    <img
                        src={row.image}
                        alt={value}
                        className="w-10 h-10 object-cover rounded-lg"
                        onError={(e) => {
                            e.target.src = "https://placehold.co/50x50?text=Product";
                        }}
                    />
                    <div className="flex flex-col">
                        <span className="font-medium text-gray-800">{value}</span>
                        <span className="text-xs text-gray-500">Vendor: {typeof row.vendorId === 'object' ? row.vendorId?.storeName : row.vendorId}</span>
                    </div>
                </div>
            ),
        },
        {
            key: "price",
            label: "Price",
            sortable: true,
            render: (value) => formatPrice(value),
        },
        {
            key: "stockQuantity",
            label: "Initial Stock",
            sortable: true,
        },
        {
            key: "actions",
            label: "Actions",
            sortable: false,
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setProductFormModal({ isOpen: true, productId: row.id });
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                    >
                        <FiEye />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleApproval(row.id, 'approved');
                        }}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Approve"
                    >
                        <FiCheck />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleApproval(row.id, 'rejected');
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Reject"
                    >
                        <FiX />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                        Product Approvals
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600">
                        Review and approve products submitted by vendors
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="mb-6">
                    <div className="relative max-w-md">
                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter pending products..."
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        />
                    </div>
                </div>

                <DataTable
                    data={filteredProducts}
                    columns={columns}
                    pagination={true}
                    itemsPerPage={10}
                    isLoading={isLoading}
                    onRowClick={(row) =>
                        setProductFormModal({ isOpen: true, productId: row.id })
                    }
                />
            </div>

            <ProductFormModal
                isOpen={productFormModal.isOpen}
                onClose={() => setProductFormModal({ isOpen: false, productId: null })}
                productId={productFormModal.productId}
                onSuccess={() => {
                    loadPendingProducts();
                }}
                readOnly={false}
            />
        </motion.div>
    );
};

export default PendingProducts;
