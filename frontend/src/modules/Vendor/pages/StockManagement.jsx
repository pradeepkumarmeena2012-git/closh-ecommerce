import { useState, useEffect, useMemo } from "react";
import {
  FiSearch,
  FiAlertTriangle,
  FiEdit,
  FiPackage,
  FiPlus,
  FiMinus,
  FiTrendingDown,
  FiX,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import DataTable from "../../Admin/components/DataTable";
import ExportButton from "../../Admin/components/ExportButton";
import Badge from "../../../shared/components/Badge";
import AnimatedSelect from "../../Admin/components/AnimatedSelect";
import { formatPrice } from "../../../shared/utils/helpers";
import { useVendorAuthStore } from "../store/vendorAuthStore";
import { useVendorProductStore } from "../store/vendorProductStore";
import toast from "react-hot-toast";

const StockManagement = () => {
  const { vendor } = useVendorAuthStore();
  const { products, isLoading, fetchProducts, patchStock, patchVariantStock } = useVendorProductStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [alertThreshold, setAlertThreshold] = useState(10);
  const [stockModal, setStockModal] = useState({
    isOpen: false,
    product: null,
  });
  const [variantDrawer, setVariantDrawer] = useState({
    isOpen: false,
    product: null,
  });

  const vendorId = vendor?.id;

  useEffect(() => {
    if (vendorId) {
      fetchProducts({ fetchAll: true, limit: 200 });
    }
  }, [vendorId, fetchProducts]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Stock filter (use backend-computed status for consistency)
    if (stockFilter !== "all") {
      filtered = filtered.filter(
        (product) => String(product.stock || "") === stockFilter
      );
    }

    return filtered;
  }, [products, searchQuery, stockFilter]);

  // Stock statistics
  const stockStats = useMemo(() => {
    const totalProducts = products.length;
    const inStock = products.filter((p) => p.stock === "in_stock").length;
    const lowStock = products.filter((p) => p.stock === "low_stock").length;
    const outOfStock = products.filter((p) => p.stock === "out_of_stock").length;
    const totalValue = products.reduce(
      (sum, p) => sum + p.price * (p.stockQuantity || 0),
      0
    );

    return { totalProducts, inStock, lowStock, outOfStock, totalValue };
  }, [products]);

  const handleStockUpdate = async (productId, newQuantity) => {
    const success = await patchStock(productId, newQuantity);
    if (success) {
      setStockModal({ isOpen: false, product: null });
    }
  };

  // Table columns
  const columns = [
    {
      key: "_id",
      label: "ID",
      sortable: true,
      render: (value, row) => String(value ?? row.id ?? "").slice(-8).toUpperCase(),
    },
    {
      key: "name",
      label: "Product Name",
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <img
            src={row.image || row.images?.[0]}
            alt={value}
            className="w-10 h-10 object-cover rounded-lg"
            onError={(e) => {
              e.target.src = "https://via.placeholder.com/50x50?text=Product";
            }}
          />
          <span className="font-medium">{value}</span>
        </div>
      ),
    },
    {
      key: "price",
      label: "Price",
      sortable: true,
      render: (value, row) => formatPrice(row.vendorPrice || value),
    },
    {
      key: "stockQuantity",
      label: "Current Stock",
      sortable: true,
      render: (value) => (
        <span className="font-semibold">{value?.toLocaleString() || 0}</span>
      ),
    },
    {
      key: "stock",
      label: "Status",
      sortable: true,
      render: (value) => (
        <Badge
          variant={
            value === "in_stock"
              ? "success"
              : value === "low_stock"
                ? "warning"
                : "error"
          }>
          {value?.replace("_", " ").toUpperCase() || "N/A"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStockModal({ isOpen: true, product: row })}
            title="Update Total Stock"
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <FiEdit />
          </button>
          {((row.variants?.sizes?.length > 0) || (row.variants?.colors?.length > 0) || (row.variants?.attributes?.length > 0)) && (
            <button
              onClick={() => setVariantDrawer({ isOpen: true, product: row })}
              title="Check Variant Stock"
              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
              <FiPackage />
            </button>
          )}
        </div>
      ),
    },
  ];

  if (!vendorId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please log in to manage stock</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="lg:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            Stock Management
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Manage your product inventory and stock levels
          </p>
        </div>
      </div>

      {/* Stock Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Products</p>
            <FiPackage className="text-blue-500 text-xl" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {stockStats.totalProducts}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">In Stock</p>
            <FiPackage className="text-green-500 text-xl" />
          </div>
          <p className="text-2xl font-bold text-green-600">
            {stockStats.inStock}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Low Stock</p>
            <FiAlertTriangle className="text-orange-500 text-xl" />
          </div>
          <p className="text-2xl font-bold text-orange-600">
            {stockStats.lowStock}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Out of Stock</p>
            <FiTrendingDown className="text-red-500 text-xl" />
          </div>
          <p className="text-2xl font-bold text-red-600">
            {stockStats.outOfStock}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <AnimatedSelect
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            options={[
              { value: "all", label: "All Stock" },
              { value: "in_stock", label: "In Stock" },
              { value: "low_stock", label: "Low Stock" },
              { value: "out_of_stock", label: "Out of Stock" },
            ]}
            className="w-full sm:w-auto min-w-[160px]"
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">
              Alert Threshold:
            </label>
            <input
              type="number"
              value={alertThreshold}
              onChange={(e) =>
                setAlertThreshold(parseInt(e.target.value, 10) || 10)
              }
              min="1"
              className="w-20 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* DataTable */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading products...</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          <>
            <div className="mb-4">
              <ExportButton
                data={filteredProducts}
                headers={[
                  { label: "ID", accessor: (row) => String(row._id ?? row.id ?? "") },
                  { label: "Name", accessor: (row) => row.name },
                  { label: "Price", accessor: (row) => formatPrice(row.price) },
                  { label: "Stock", accessor: (row) => row.stockQuantity || 0 },
                  { label: "Status", accessor: (row) => row.stock || "N/A" },
                ]}
                filename="vendor-stock"
              />
            </div>
            <DataTable
              data={filteredProducts}
              columns={columns}
              pagination={true}
              itemsPerPage={10}
            />
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No products found</p>
          </div>
        )}
      </div>

      {/* Stock Update Modal */}
      <StockUpdateModal
        isOpen={stockModal.isOpen}
        product={stockModal.product}
        alertThreshold={alertThreshold}
        onClose={() => setStockModal({ isOpen: false, product: null })}
        onUpdate={(newQuantity) => {
          if (stockModal.product) {
            handleStockUpdate(stockModal.product._id ?? stockModal.product.id, newQuantity);
          }
        }}
      />

      {/* Variant Stock Drawer */}
      <VariantStockDrawer
        isOpen={variantDrawer.isOpen}
        product={variantDrawer.product}
        onClose={() => setVariantDrawer({ isOpen: false, product: null })}
        onUpdate={async (productId, stockMap) => {
          const success = await patchVariantStock(productId, stockMap);
          if (success) {
            setVariantDrawer({ isOpen: false, product: null });
          }
        }}
      />
    </motion.div>
  );
};

// Stock Update Modal Component
const StockUpdateModal = ({
  isOpen,
  product,
  alertThreshold,
  onClose,
  onUpdate,
}) => {
  const [stockQuantity, setStockQuantity] = useState(0);
  const [stockAdjustment, setStockAdjustment] = useState("");
  const [adjustmentType, setAdjustmentType] = useState("set");

  useEffect(() => {
    if (product) {
      setStockQuantity(product.stockQuantity || 0);
      setStockAdjustment("");
      setAdjustmentType("set");
    }
  }, [product]);

  if (!product || !isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    let newQuantity = stockQuantity;
    const adjustment = Math.max(0, parseInt(stockAdjustment, 10) || 0);

    if (adjustmentType === "set") {
      newQuantity = stockQuantity;
    } else if (adjustmentType === "add") {
      newQuantity = (product.stockQuantity || 0) + adjustment;
    } else if (adjustmentType === "subtract") {
      newQuantity = Math.max(0, (product.stockQuantity || 0) - adjustment);
    }

    if (newQuantity < 0) {
      toast.error("Stock quantity cannot be negative");
      return;
    }

    onUpdate(newQuantity);
  };

  const quickAdjust = (amount) => {
    const newQuantity = Math.max(0, stockQuantity + amount);
    setStockQuantity(newQuantity);
  };

  const effectiveThreshold = Number(
    product?.lowStockThreshold ?? alertThreshold ?? 10
  );

  const newStockStatus =
    stockQuantity === 0
      ? "out_of_stock"
      : stockQuantity <= effectiveThreshold
        ? "low_stock"
        : "in_stock";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">
                    Update Stock
                  </h2>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <FiX className="text-gray-500" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <img
                    src={product.image || product.images?.[0] || "https://via.placeholder.com/100x100?text=Product"}
                    alt={product.name}
                    className="w-16 h-16 object-cover rounded-lg"
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/100x100?text=Product";
                    }}
                  />
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Current Stock: {product.stockQuantity || 0}
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Adjustment Type
                  </label>
                  <AnimatedSelect
                    value={adjustmentType}
                    onChange={(e) => setAdjustmentType(e.target.value)}
                    options={[
                      { value: "set", label: "Set Quantity" },
                      { value: "add", label: "Add Stock" },
                      { value: "subtract", label: "Subtract Stock" },
                    ]}
                  />
                </div>

                {adjustmentType === "set" ? (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      New Stock Quantity
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => quickAdjust(-10)}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg">
                        <FiMinus />
                      </button>
                      <input
                        type="number"
                        value={stockQuantity}
                        onChange={(e) =>
                          setStockQuantity(
                            Math.max(0, parseInt(e.target.value) || 0)
                          )
                        }
                        min="0"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <button
                        type="button"
                        onClick={() => quickAdjust(10)}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg">
                        <FiPlus />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {adjustmentType === "add" ? "Add" : "Subtract"} Quantity
                    </label>
                    <input
                      type="number"
                      value={stockAdjustment}
                      onChange={(e) => setStockAdjustment(e.target.value)}
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                )}

                <div className="p-4 bg-white rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">
                    New Stock Status:
                  </p>
                  <p className="text-xs text-gray-500 mb-2">
                    Threshold used: {effectiveThreshold}
                  </p>
                  <Badge
                    variant={
                      newStockStatus === "in_stock"
                        ? "success"
                        : newStockStatus === "low_stock"
                          ? "warning"
                          : "error"
                    }>
                    {newStockStatus.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-white hover:text-black transition-colors font-semibold">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 gradient-green text-white rounded-lg hover:shadow-glow-green transition-all font-semibold">
                    Update Stock
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default StockManagement;

// Variant Stock Drawer Component
const VariantStockDrawer = ({ isOpen, product, onClose }) => {
  const stockMap = product?.variants?.stockMap || {};

  if (!isOpen || !product) return null;

  // Generate variant keys based on sizes, colors, or attributes
  const combinations = [];
  const sizes = product.variants?.sizes || [];
  const colors = product.variants?.colors || [];
  const attributes = product.variants?.attributes || [];

  if (attributes.length > 0) {
    const combinationsList = (attrs) => {
      if (attrs.length === 0) return [{}];
      const res = [];
      const rest = combinationsList(attrs.slice(1));
      attrs[0].values.forEach((val) => {
        rest.forEach((r) => {
          res.push({ [attrs[0].name.toLowerCase().replace(/\s+/g, '_')]: val.toLowerCase().trim(), ...r });
        });
      });
      return res;
    };

    const allCombos = combinationsList(attributes);
    allCombos.forEach((combo) => {
      const key = Object.entries(combo)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([k, v]) => `${k}=${v}`)
        .join('|');
      
      const label = Object.entries(combo)
        .map(([k, v]) => `${v.toUpperCase()}`)
        .join(' / ');

      combinations.push({ key, label });
    });
  } else if (sizes.length > 0 && colors.length > 0) {
    sizes.forEach((s) => {
      colors.forEach((c) => {
        const key = `${s.toLowerCase().trim()}|${c.toLowerCase().trim()}`;
        combinations.push({ key, label: `${s.toUpperCase()} / ${c.toUpperCase()}` });
      });
    });
  } else if (sizes.length > 0) {
    sizes.forEach((s) => {
      const key = `${s.toLowerCase().trim()}|`;
      combinations.push({ key, label: `Size: ${s.toUpperCase()}` });
    });
  } else if (colors.length > 0) {
    colors.forEach((c) => {
      const key = `|${c.toLowerCase().trim()}`;
      combinations.push({ key, label: `Color: ${c.toUpperCase()}` });
    });
  }

  const totalStock = product.stockQuantity || 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-[70] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Variant Stock Details</h2>
                <p className="text-sm text-gray-500 truncate max-w-[250px]">{product.name}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <FiX className="text-gray-500 w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center gap-4 mb-8 bg-gray-50 p-4 rounded-xl border border-dashed border-gray-200">
                <img
                  src={product.image || product.images?.[0] || "https://via.placeholder.com/100x100?text=Product"}
                  className="w-16 h-16 object-cover rounded-lg shadow-sm"
                  alt={product.name}
                />
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Stock</p>
                  <p className="text-2xl font-bold text-primary-600">{totalStock}</p>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest border-l-4 border-primary-500 pl-3">
                  Stock by Variant
                </h3>
                
                {combinations.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-100">
                    <FiPackage className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No variants found for this product.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {combinations.map((combo) => (
                      <div
                        key={combo.key}
                        className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/30 hover:bg-white hover:border-primary-100 transition-all group"
                      >
                        <span className="font-semibold text-gray-600 group-hover:text-gray-900 transition-colors">
                          {combo.label}
                        </span>
                        <div className="px-4 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm">
                          <span className="text-lg font-bold text-gray-800">
                            {stockMap[combo.key] || 0}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={onClose}
                className="w-full py-4 bg-gray-800 text-white font-bold rounded-xl shadow-lg hover:bg-gray-900 transition-all"
              >
                Close Details
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
