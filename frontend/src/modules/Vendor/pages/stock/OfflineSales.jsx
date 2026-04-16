import { useState, useMemo } from "react";
import { 
  FiSearch, 
  FiPlus, 
  FiShoppingBag, 
  FiCalendar, 
  FiDollarSign, 
  FiEdit, 
  FiTrash2, 
  FiShoppingCart,
  FiX,
  FiUpload,
  FiImage,
  FiLayers,
  FiSettings,
  FiType,
  FiMaximize,
  FiBox,
  FiCheck
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import DataTable from "../../../Admin/components/DataTable";
import ExportButton from "../../../Admin/components/ExportButton";
import Badge from "../../../../shared/components/Badge";
import { formatPrice } from "../../../../shared/utils/helpers";
import { useVendorAuthStore } from "../../store/vendorAuthStore";
import toast from "react-hot-toast";

const OfflineSales = () => {
  const { vendor } = useVendorAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  
  const [sales, setSales] = useState([
    {
      id: "6B2273",
      productName: "T-Shirt Premium",
      price: 1200,
      stock: 15,
      unit: "Piece",
      category: "Apparel",
      brand: "Closh",
      approvalStatus: "approved",
      stockStatus: "in_stock",
      date: new Date().toISOString().split('T')[0]
    }
  ]);

  const [formData, setFormData] = useState({
    productName: "",
    unit: "",
    category: "",
    brand: "",
    description: "",
    price: "",
    originalPrice: "",
    discount: 0,
    stock: 0,
    mainImage: null,
    colors: [],
    sizes: [],
    showColorAttr: true,
    showSizeAttr: true
  });

  const [currentColor, setCurrentColor] = useState("");
  const [currentSize, setCurrentSize] = useState("");

  const filteredSales = useMemo(() => {
    return sales.filter(sale => 
      sale.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sales, searchQuery]);

  const handleOpenModal = (sale = null) => {
    if (sale) {
      setEditingSale(sale);
      setFormData({
        productName: sale.productName || "",
        unit: sale.unit || "",
        category: sale.category || "",
        brand: sale.brand || "",
        description: sale.description || "",
        price: sale.price || "",
        originalPrice: sale.originalPrice || "",
        discount: sale.discount || 0,
        stock: sale.stock || 0,
        mainImage: sale.mainImage || null,
        colors: sale.colors || [],
        sizes: sale.sizes || [],
        showColorAttr: true,
        showSizeAttr: true
      });
    } else {
      setEditingSale(null);
      setFormData({
        productName: "",
        unit: "",
        category: "",
        brand: "",
        description: "",
        price: "",
        originalPrice: "",
        discount: 0,
        stock: 0,
        mainImage: null,
        colors: [],
        sizes: [],
        showColorAttr: true,
        showSizeAttr: true
      });
    }
    setIsModalOpen(true);
  };

  const handleAddTag = (type) => {
    if (type === "color" && currentColor.trim()) {
      if (!formData.colors.includes(currentColor.trim())) {
        setFormData({ ...formData, colors: [...formData.colors, currentColor.trim()] });
      }
      setCurrentColor("");
    } else if (type === "size" && currentSize.trim()) {
      if (!formData.sizes.includes(currentSize.trim())) {
        setFormData({ ...formData, sizes: [...formData.sizes, currentSize.trim()] });
      }
      setCurrentSize("");
    }
  };

  const handleRemoveTag = (type, value) => {
    if (type === "color") {
      setFormData({ ...formData, colors: formData.colors.filter(c => c !== value) });
    } else {
      setFormData({ ...formData, sizes: formData.sizes.filter(s => s !== value) });
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.productName || !formData.price) {
      toast.error("Required: Name & Selling Price");
      return;
    }

    if (editingSale) {
      setSales(sales.map(s => s.id === editingSale.id ? { ...s, ...formData } : s));
      toast.success("Updated");
    } else {
      const newSale = {
        ...formData,
        id: Math.random().toString(36).substr(2, 6).toUpperCase(),
        date: new Date().toISOString().split('T')[0],
        approvalStatus: "approved",
        stockStatus: formData.stock > 0 ? "in_stock" : "out_of_stock",
      };
      setSales([newSale, ...sales]);
      toast.success("Recorded");
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure?")) {
      setSales(sales.filter(s => s.id !== id));
      toast.success("Deleted");
    }
  };

  const handleSale = (id) => {
    const target = sales.find(s => s.id === id);
    if (target && target.stock > 0) {
      setSales(sales.map(s => s.id === id ? { ...s, stock: s.stock - 1 } : s));
      toast.success(`Sold 1 ${target.productName}!`);
    } else {
      toast.error("Out of Stock!");
    }
  };

  const columns = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      render: (value) => <span className="text-gray-500 font-medium">{value}</span>,
    },
    {
      key: "productName",
      label: "PRODUCT NAME",
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-2 md:gap-3 min-w-[120px]">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-emerald-50 flex items-center justify-center overflow-hidden border border-emerald-100 shrink-0">
             {row.mainImage ? <img src={row.mainImage} alt={value} className="w-full h-full object-cover" /> : <FiImage className="text-emerald-200" />}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-gray-900 leading-tight text-[10px] md:text-xs truncate">{value}</span>
            <span className="text-[8px] md:text-[9px] text-emerald-600 font-bold uppercase">{row.category}</span>
          </div>
        </div>
      )
    },
    {
      key: "price",
      label: "PRICE",
      sortable: true,
      render: (value) => <span className="text-gray-900 font-black text-[10px] md:text-xs">{formatPrice(value)}</span>,
    },
    {
      key: "stock",
      label: "STOCK",
      sortable: true,
      render: (value) => <span className="text-gray-600 font-bold text-[10px] md:text-xs">{value}</span>,
    },
    {
      key: "approvalStatus",
      label: "APPROVAL",
      render: (value) => <Badge variant="success" className="text-[9px] py-0.5 px-2">APPROVED</Badge>,
    },
    {
      key: "stockStatus",
      label: "STOCK STATUS",
      render: (value, row) => (
        <Badge variant={row.stock > 0 ? "success" : "error"} className="text-[9px] py-0.5 px-2">
           {row.stock > 0 ? "IN STOCK" : "OUT"}
        </Badge>
      )
    },
    {
      key: "actions",
      label: "ACTIONS",
      render: (_, row) => (
        <div className="flex items-center gap-2 md:gap-3">
          <button onClick={() => handleOpenModal(row)} className="text-emerald-600 hover:text-emerald-800 transition-colors p-1"><FiEdit size={14} className="md:size-4" /></button>
          <button onClick={() => handleDelete(row.id)} className="text-red-500 hover:text-red-700 transition-colors p-1"><FiTrash2 size={14} className="md:size-4" /></button>
          <button onClick={() => handleSale(row.id)} title="Quick Sale" className="text-blue-500 hover:text-blue-700 transition-colors p-1"><FiShoppingCart size={14} className="md:size-4" /></button>
        </div>
      )
    }
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 px-3 md:px-6 py-6 md:py-8 bg-[#f8faf9] min-h-screen">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-center md:text-left">
          <h1 className="text-xl md:text-2xl font-black text-[#003d29] tracking-tight flex items-center justify-center md:justify-start gap-2">
            Offline Sales Portal <div className="size-2 bg-emerald-500 rounded-full animate-pulse"></div>
          </h1>
          <p className="text-gray-500 font-medium text-[10px] md:text-xs">Direct Transaction Management</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#003d29] text-white rounded-xl hover:bg-[#002a1c] transition-all font-bold shadow-lg shadow-emerald-900/10 text-xs">
          <FiPlus className="size-4" />
          <span>New Offline Sale</span>
        </button>
      </div>

      <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm border border-emerald-50">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <div className="relative flex-1">
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-emerald-300" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sales..."
              className="w-full pl-11 pr-4 py-2 bg-emerald-50/30 border border-emerald-50 rounded-xl focus:ring-1 focus:ring-emerald-500 text-xs font-bold placeholder:text-emerald-200"
            />
          </div>
          <div className="flex justify-end">
            <ExportButton 
              data={filteredSales} 
              headers={[
                { label: "ID", accessor: "id" }, 
                { label: "Product", accessor: "productName" }, 
                { label: "Price", accessor: (row) => formatPrice(row.price) }
              ]} 
              filename="offline-sales" 
            />
          </div>
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <DataTable data={filteredSales} columns={columns} pagination={true} itemsPerPage={10} />
        </div>

        {/* Mobile View - Classic List Cards */}
        <div className="block md:hidden space-y-4">
          <AnimatePresence>
            {filteredSales.map((sale) => (
              <motion.div 
                key={sale.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 border border-emerald-50 shadow-sm space-y-4"
              >
                {/* ID Row */}
                <div className="flex items-center text-[10px] font-bold text-gray-400">
                   <span className="w-28 uppercase">ID:</span>
                   <span className="text-gray-900 font-black">#{sale.id}</span>
                </div>

                {/* Product Name Row */}
                <div className="flex items-start text-[10px] font-bold text-gray-400">
                   <span className="w-28 mt-2 uppercase">Product:</span>
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center overflow-hidden shrink-0 border border-emerald-50 shadow-sm">
                         {sale.mainImage ? <img src={sale.mainImage} className="w-full h-full object-cover" /> : <div className="text-[10px] text-white font-black italic">CLOSH</div>}
                      </div>
                      <span className="text-gray-900 font-black text-xs leading-tight">{sale.productName.toLowerCase()}</span>
                   </div>
                </div>

                {/* Category & Brand Group */}
                <div className="grid grid-cols-2 gap-2">
                   <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-black text-gray-400 uppercase">Category</span>
                      <span className="text-xs font-black text-emerald-700">{sale.category}</span>
                   </div>
                   <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-black text-gray-400 uppercase">Brand</span>
                      <span className="text-xs font-black text-emerald-700">{sale.brand || "N/A"}</span>
                   </div>
                </div>

                {/* Pricing & Stock Grid */}
                <div className="grid grid-cols-3 gap-2 py-2 border-y border-emerald-50/50">
                   <div className="flex flex-col gap-0.5">
                      <span className="text-[8px] font-black text-gray-400 uppercase">Price</span>
                      <span className="text-[11px] font-black text-gray-900">{formatPrice(sale.price)}</span>
                   </div>
                   <div className="flex flex-col gap-0.5">
                      <span className="text-[8px] font-black text-gray-400 uppercase">Stock</span>
                      <span className="text-[11px] font-black text-gray-900">{sale.stock} <span className="text-[8px] text-gray-400">{sale.unit}</span></span>
                   </div>
                   <div className="flex flex-col gap-0.5">
                      <span className="text-[8px] font-black text-gray-400 uppercase">Status</span>
                      <span className={`text-[9px] font-black ${sale.stock > 0 ? 'text-emerald-500' : 'text-red-500'}`}>{sale.stock > 0 ? 'IN STOCK' : 'OUT'}</span>
                   </div>
                </div>

                {/* Description - Compact */}
                <div className="flex flex-col gap-1">
                   <span className="text-[8px] font-black text-gray-400 uppercase">Description:</span>
                   <p className="text-[10px] text-gray-600 font-bold leading-relaxed line-clamp-2 italic">"{sale.description || "No description provided..."}"</p>
                </div>

                {/* Variants - Small Badges */}
                <div className="space-y-2">
                   <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[8px] font-black text-gray-400 uppercase w-10">Colors:</span>
                      <div className="flex flex-wrap gap-1">
                         {sale.colors?.map(c => <span key={c} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[8px] font-black border border-emerald-100 uppercase">{c}</span>) || <span className="text-[8px] text-gray-400 italic">None</span>}
                      </div>
                   </div>
                   <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[8px] font-black text-gray-400 uppercase w-10">Sizes:</span>
                      <div className="flex flex-wrap gap-1">
                         {sale.sizes?.map(s => <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[8px] font-black border border-blue-100 uppercase">{s}</span>) || <span className="text-[8px] text-gray-400 italic">None</span>}
                      </div>
                   </div>
                </div>

                {/* Actions Row */}
                <div className="flex items-center justify-between pt-4 border-t border-emerald-50 shadow-[0_-5px_10px_-5px_rgba(0,0,0,0.02)]">
                   <div className="flex gap-1.5">
                      <Badge variant="success" className="text-[8px] py-1 px-2.5">APPROVED</Badge>
                   </div>
                   <div className="flex items-center gap-4">
                      <button onClick={() => handleOpenModal(sale)} className="text-emerald-500 hover:text-emerald-700 transition-transform active:scale-90">
                         <FiEdit size={16} />
                      </button>
                      <button onClick={() => handleDelete(sale.id)} className="text-red-400 hover:text-red-600 transition-transform active:scale-90">
                         <FiTrash2 size={16} />
                      </button>
                      <button onClick={() => handleSale(sale.id)} className="text-blue-500 hover:text-blue-700 transition-transform active:scale-90 p-1.5 bg-blue-50 rounded-lg">
                         <FiShoppingCart size={16} />
                      </button>
                   </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {filteredSales.length === 0 && (
            <div className="text-center py-10">
               <p className="text-xs font-bold text-gray-400">No records found matching your search.</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100]">
            {/* Full-screen Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsModalOpen(false)} 
              className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" 
            />
            
            {/* Content Wrapper with padding for nav clearance */}
            <div className="relative inset-0 h-full w-full flex items-center justify-center p-4 pb-28 md:pb-4 pointer-events-none">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                className="relative bg-white w-full max-w-4xl max-h-[90vh] md:max-h-[96vh] overflow-y-auto rounded-[2rem] p-4 md:p-8 shadow-2xl no-scrollbar border border-emerald-50 pointer-events-auto"
              >
                <div className="flex items-center justify-between mb-3 sticky top-0 bg-white z-10 pb-2 border-b border-emerald-50">
                  <h2 className="text-base md:text-xl font-black text-[#003d29] tracking-tight flex items-center gap-2">
                    <FiShoppingBag className="text-emerald-600" /> {editingSale ? "Edit" : "New"} Product
                  </h2>
                  <button onClick={() => setIsModalOpen(false)} className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#003d29] rounded-lg transition-colors"><FiX size={18} /></button>
                </div>

              <form onSubmit={handleSave} className="space-y-4 md:space-y-6">
                {/* 1. Basic Info - More Compact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
                  <div className="sm:col-span-2 space-y-1">
                     <label className="text-[10px] md:text-xs font-black text-emerald-800 uppercase ml-1">Product Name *</label>
                     <input type="text" required value={formData.productName} onChange={(e) => setFormData({ ...formData, productName: e.target.value })} className="w-full px-3 py-2.5 bg-emerald-50/20 border border-emerald-50 rounded-xl focus:ring-1 focus:ring-emerald-500 text-xs md:text-base font-bold" placeholder="T-Shirt..." />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] md:text-xs font-black text-emerald-800 uppercase ml-1">Unit</label>
                     <input type="text" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="w-full px-3 py-2.5 bg-emerald-50/20 border border-emerald-50 rounded-xl focus:ring-1 focus:ring-emerald-500 text-xs md:text-sm font-bold" placeholder="Piece/Box" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] md:text-xs font-black text-emerald-800 uppercase ml-1">Category *</label>
                     <input 
                       type="text" 
                       required 
                       value={formData.category} 
                       onChange={(e) => setFormData({ ...formData, category: e.target.value })} 
                       className="w-full px-3 py-2.5 bg-emerald-50/20 border border-emerald-50 rounded-xl focus:ring-1 focus:ring-emerald-500 text-xs md:text-sm font-bold" 
                       placeholder="e.g. Apparel" 
                     />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 md:gap-5">
                   <div className="space-y-1">
                      <label className="text-[10px] md:text-xs font-black text-emerald-800 uppercase ml-1">Brand</label>
                      <input 
                        type="text" 
                        value={formData.brand} 
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })} 
                        className="w-full px-3 py-2.5 bg-emerald-50/20 border border-emerald-50 rounded-xl focus:ring-1 focus:ring-emerald-500 text-xs md:text-sm font-bold" 
                        placeholder="e.g. Closh" 
                      />
                   </div>
                   <div className="sm:col-span-3 space-y-1">
                      <label className="text-[10px] md:text-xs font-black text-emerald-800 uppercase ml-1">Short Description</label>
                      <input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2.5 bg-emerald-50/20 border border-emerald-50 rounded-xl focus:ring-1 focus:ring-emerald-500 text-xs md:text-sm font-bold" placeholder="Briefly describe..." />
                   </div>
                </div>

                {/* 2. Variants - Side by Side Tags */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-5">
                  {/* Colors */}
                  <div className="bg-emerald-50/10 p-3 md:p-5 rounded-2xl border border-emerald-50 space-y-3">
                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                       <label className="text-[10px] md:text-xs font-black text-emerald-800 uppercase flex items-center gap-1 shrink-0">
                         <div className="size-2 rounded-full bg-emerald-500"></div> Colors
                       </label>
                       <div className="relative w-full sm:w-32">
                          <input 
                            placeholder="Add..." 
                            value={currentColor} 
                            onChange={(e) => setCurrentColor(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag('color'))}
                            className="w-full pl-2 pr-7 py-1.5 bg-white border border-emerald-100 rounded-lg focus:ring-1 focus:ring-emerald-500 text-xs font-bold" 
                          />
                          <button type="button" onClick={() => handleAddTag('color')} className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 bg-[#003d29] text-white rounded-md">
                            <FiPlus size={12} />
                          </button>
                       </div>
                     </div>
                     <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                       <AnimatePresence>
                         {formData.colors.map(color => (
                           <motion.span key={color} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="px-3 py-1 bg-white text-[#003d29] rounded-lg text-[10px] md:text-xs font-black border border-emerald-100 flex items-center gap-2 shadow-sm">
                             {color.toUpperCase()} <FiX className="cursor-pointer text-red-400" size={12} onClick={() => handleRemoveTag('color', color)} />
                           </motion.span>
                         ))}
                       </AnimatePresence>
                     </div>
                  </div>

                  {/* Sizes */}
                  <div className="bg-emerald-50/10 p-3 md:p-5 rounded-2xl border border-emerald-50 space-y-3">
                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                       <label className="text-[10px] md:text-xs font-black text-emerald-800 uppercase flex items-center gap-1 shrink-0">
                         <FiMaximize className="text-emerald-500" size={12} /> Sizes
                       </label>
                       <div className="relative w-full sm:w-32">
                          <input 
                            placeholder="Add..." 
                            value={currentSize} 
                            onChange={(e) => setCurrentSize(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag('size'))}
                            className="w-full pl-2 pr-7 py-1.5 bg-white border border-emerald-100 rounded-lg focus:ring-1 focus:ring-emerald-500 text-xs font-bold" 
                          />
                          <button type="button" onClick={() => handleAddTag('size')} className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 bg-[#003d29] text-white rounded-md">
                            <FiPlus size={12} />
                          </button>
                       </div>
                     </div>
                     <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                       <AnimatePresence>
                         {formData.sizes.map(size => (
                           <motion.span key={size} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="px-3 py-1 bg-white text-[#003d29] rounded-lg text-[10px] md:text-xs font-black border border-emerald-100 flex items-center gap-2 shadow-sm">
                             {size.toUpperCase()} <FiX className="cursor-pointer text-red-400" size={12} onClick={() => handleRemoveTag('size', size)} />
                           </motion.span>
                         ))}
                       </AnimatePresence>
                     </div>
                  </div>
                </div>

                {/* 3. Pricing & Inventory */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
                   <div className="space-y-1">
                      <label className="text-[10px] md:text-xs font-black text-emerald-800 uppercase ml-1">Price *</label>
                      <input type="number" required value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })} className="w-full px-3 py-2.5 bg-emerald-50/20 border border-emerald-50 rounded-xl focus:ring-1 focus:ring-emerald-500 text-xs md:text-sm font-bold" placeholder="0.00" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] md:text-xs font-black text-gray-400 uppercase ml-1">MRP</label>
                      <input type="number" value={formData.originalPrice} onChange={(e) => setFormData({ ...formData, originalPrice: parseFloat(e.target.value) })} className="w-full px-3 py-2.5 bg-gray-50/50 border border-gray-100 rounded-xl focus:ring-1 focus:ring-emerald-500 text-xs md:text-sm font-bold" placeholder="0.00" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] md:text-xs font-black text-emerald-800 uppercase ml-1">Disc %</label>
                      <input type="number" value={formData.discount} onChange={(e) => setFormData({ ...formData, discount: parseInt(e.target.value) })} className="w-full px-3 py-2.5 bg-emerald-50/20 border border-emerald-50 rounded-xl focus:ring-1 focus:ring-emerald-500 text-xs md:text-sm font-bold" placeholder="0" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] md:text-xs font-black text-[#003d29] uppercase ml-1">Stock</label>
                      <input type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })} className="w-full px-3 py-2.5 bg-emerald-600/5 border border-emerald-200 rounded-xl focus:ring-1 focus:ring-emerald-500 text-xs md:text-sm font-bold text-[#003d29]" />
                   </div>
                </div>

                {/* 4. Small Media Upload */}
                <div className="p-2 md:p-4 border-2 border-dashed border-emerald-100 rounded-xl text-center hover:border-emerald-300 transition-all cursor-pointer bg-emerald-50/10 flex items-center justify-center gap-2">
                  <FiUpload className="size-3.5 md:size-5 text-emerald-300" />
                  <div>
                    <p className="text-[11px] md:text-sm font-black text-[#003d29]">Upload Image</p>
                  </div>
                </div>

                <div className="pt-1 sticky bottom-0 bg-white shadow-[0_-10px_20px_-10px_rgba(255,255,255,0.8)]">
                  <button type="submit" className="w-full py-3 bg-[#003d29] text-white rounded-xl md:rounded-[1.25rem] font-black text-[11px] md:text-sm tracking-widest hover:bg-[#002a1c] transition-all uppercase flex items-center justify-center gap-2">
                    <FiCheck className="size-3.5" /> Save Product
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  </motion.div>
  );
};

export default OfflineSales;
