import { useState, useMemo, useEffect } from "react";
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
import { 
  getVendorProducts, 
  updateVendorStock, 
  updateVendorVariantStock,
  createVendorProduct,
  updateVendorProduct
} from "../../services/vendorService";
import MultiSelect from "../../../Admin/components/MultiSelect";
import { PRODUCT_SIZES } from "../../../../shared/utils/constants";
import { useCategoryStore } from "../../../../shared/store/categoryStore";
import { useBrandStore } from "../../../../shared/store/brandStore";
import CategorySelector from "../../../Admin/components/CategorySelector";
import AnimatedSelect from "../../../Admin/components/AnimatedSelect";
import { 
  buildVariantCombinations, 
  syncVariantPricesWithAxes, 
  buildVariantPayload, 
  normalizeVariantStateForForm,
  parseVariantAxis
} from "../../utils/variantHelpers";
import toast from "react-hot-toast";
import { uploadVendorImage } from "../../services/vendorService";

const OfflineSales = () => {
  const { vendor } = useVendorAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [sales, setSales] = useState([]);
  const [isSaleConfirmOpen, setIsSaleConfirmOpen] = useState(false);
  const [saleProduct, setSaleProduct] = useState(null);
  const [saleSelection, setSaleSelection] = useState({});
  const [saleQuantity, setSaleQuantity] = useState(1);

  const { categories, initialize: initCategories } = useCategoryStore();
  const { brands, initialize: initBrands } = useBrandStore();

  useEffect(() => {
    fetchProducts();
    initCategories();
    initBrands();
  }, [initCategories, initBrands]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await getVendorProducts({ limit: 1000 });
      const products = response.data.products.map(p => ({
        id: p._id,
        productId: p._id,
        productName: p.name,
        price: p.vendorPrice || p.price,
        stock: p.stockQuantity,
        unit: p.unit || "Piece",
        category: p.categoryId?.name || "Uncategorized",
        brand: p.brandId?.name || "N/A",
        approvalStatus: p.approvalStatus,
        stockStatus: p.stock,
        image: p.image || p.images?.[0],
        description: p.shortDescription || p.description,
        colors: p.variants?.attributes?.find(a => a.name.toLowerCase() === 'color')?.values || [],
        sizes: p.variants?.attributes?.find(a => a.name.toLowerCase() === 'size')?.values || p.variants?.sizes || [],
        date: p.createdAt,
        variants: p.variants,
        originalPrice: p.originalPrice,
        sold: p.offlineSold || 0,
        rawProduct: p
      }));
      setSales(products);
    } catch (error) {
      toast.error("Failed to fetch products");
    } finally {
      setIsLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    productName: "",
    unit: "Piece",
    categoryId: null,
    subcategoryId: null,
    brandId: null,
    division: "Unisex",
    description: "",
    price: "",
    originalPrice: "",
    discount: 0,
    stock: "in_stock",
    stockQuantity: "",
    image: null,
    images: [],
    variants: {
      sizes: [],
      attributes: [],
      prices: {},
      stockMap: {},
      imageMap: {},
      defaultVariant: { size: "" },
      defaultSelection: {}
    },
    flashSale: false,
    isNewArrival: false,
    isFeatured: false,
    isVisible: true,
    codAllowed: true,
    returnable: true,
    cancelable: true,
    taxIncluded: false,
    hsnCode: "",
    warrantyPeriod: "",
    guaranteePeriod: "",
    taxRate: 18,
    seoTitle: "",
    seoDescription: "",
    tags: [],
    faqs: []
  });

  const variantCombinations = useMemo(() => {
    return buildVariantCombinations(
      formData.variants?.sizes || [],
      [],
      formData.variants?.attributes || []
    );
  }, [formData.variants?.sizes, formData.variants?.attributes]);

  // Auto-calculate total stock from variants
  useEffect(() => {
    if (variantCombinations.length > 0 && formData.variants?.stockMap) {
      const total = Object.values(formData.variants.stockMap).reduce((sum, val) => {
        const num = parseInt(val, 10);
        return sum + (isNaN(num) ? 0 : num);
      }, 0);
      if (parseInt(formData.stockQuantity || 0, 10) !== total) {
        setFormData(prev => ({ ...prev, stockQuantity: total }));
      }
    }
  }, [formData.variants?.stockMap, variantCombinations]);

  // Auto-calculate discount
  useEffect(() => {
    const price = parseFloat(formData.price);
    const originalPrice = parseFloat(formData.originalPrice);
    
    if (originalPrice && price && originalPrice > price) {
      const discount = Math.round(((originalPrice - price) / originalPrice) * 100);
      if (formData.discount !== discount) {
        setFormData(prev => ({ ...prev, discount }));
      }
    } else if (originalPrice && price && originalPrice <= price) {
      if (formData.discount !== 0) {
        setFormData(prev => ({ ...prev, discount: 0 }));
      }
    }
  }, [formData.price, formData.originalPrice]);

  const [currentColor, setCurrentColor] = useState("");

  const filteredSales = useMemo(() => {
    return sales.filter(sale => 
      sale.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sales, searchQuery]);

  const handleOpenModal = (sale = null) => {
    if (sale) {
      const p = sale.rawProduct || sale;
      setEditingSale(sale);
      
      const normalizedVariants = normalizeVariantStateForForm(
        p.variants || {},
        p.vendorPrice || p.price || ""
      );

      setFormData({
        productName: p.name || "",
        unit: p.unit || "Piece",
        categoryId: p.categoryId?._id || p.categoryId || null,
        subcategoryId: p.subcategoryId?._id || p.subcategoryId || null,
        brandId: p.brandId?._id || p.brandId || null,
        division: p.division || "Unisex",
        description: p.description || "",
        price: p.vendorPrice || p.price || "",
        originalPrice: p.originalPrice || "",
        discount: p.discount || 0,
        stock: p.stock || "in_stock",
        stockQuantity: p.stockQuantity || 0,
        image: p.image || null,
        images: p.images || [],
        variants: normalizedVariants,
        flashSale: p.flashSale || false,
        isNewArrival: p.isNewArrival || false,
        isFeatured: p.isFeatured || false,
        isVisible: p.isVisible !== undefined ? p.isVisible : true,
        codAllowed: p.codAllowed !== undefined ? p.codAllowed : true,
        returnable: p.returnable !== undefined ? p.returnable : true,
        cancelable: p.cancelable !== undefined ? p.cancelable : true,
        taxIncluded: p.taxIncluded || false,
        hsnCode: p.hsnCode || "",
        warrantyPeriod: p.warrantyPeriod || "",
        guaranteePeriod: p.guaranteePeriod || "",
        taxRate: p.taxRate || 18,
        seoTitle: p.seoTitle || "",
        seoDescription: p.seoDescription || "",
        tags: p.tags || [],
        faqs: p.faqs || []
      });
    } else {
      setEditingSale(null);
      setFormData({
        productName: "",
        unit: "Piece",
        categoryId: null,
        subcategoryId: null,
        brandId: null,
        division: "Unisex",
        description: "",
        price: "",
        originalPrice: "",
        discount: 0,
        stock: "in_stock",
        stockQuantity: "",
        image: null,
        images: [],
        variants: {
          sizes: [],
          attributes: [],
          prices: {},
          stockMap: {},
          imageMap: {},
          defaultVariant: { size: "" },
          defaultSelection: {}
        },
        flashSale: false,
        isNewArrival: false,
        isFeatured: false,
        isVisible: true,
        codAllowed: true,
        returnable: true,
        cancelable: true,
        taxIncluded: false,
        hsnCode: "",
        warrantyPeriod: "",
        guaranteePeriod: "",
        taxRate: 18,
        seoTitle: "",
        seoDescription: "",
        tags: [],
        faqs: []
      });
    }
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const uploadResponse = await uploadVendorImage(file);
      const imageUrl = uploadResponse.data?.url || uploadResponse.data;
      if (imageUrl) {
        setFormData(prev => ({ ...prev, image: imageUrl }));
        toast.success("Image uploaded");
      }
    } catch (error) {
      toast.error("Upload failed");
    } finally {
      setIsLoading(false);
    }
  };

  const updateVariantAxes = (axis, rawText) => {
    const parsed = parseVariantAxis(rawText);
    const nextSizes = axis === "sizes" ? parsed : (formData.variants?.sizes || []);
    const synced = syncVariantPricesWithAxes(
      formData.variants?.prices || {},
      formData.variants?.stockMap || {},
      formData.variants?.imageMap || {},
      nextSizes,
      [],
      formData.variants?.attributes || [],
      formData.price
    );

    setFormData(prev => ({
      ...prev,
      variants: {
        ...prev.variants,
        sizes: nextSizes,
        prices: synced.prices,
        stockMap: synced.stockMap,
        imageMap: synced.imageMap,
      }
    }));
  };

  const updateVariantAttributes = (nextAttributes) => {
    const synced = syncVariantPricesWithAxes(
      formData.variants?.prices || {},
      formData.variants?.stockMap || {},
      formData.variants?.imageMap || {},
      formData.variants?.sizes || [],
      [],
      nextAttributes,
      formData.price
    );

    setFormData(prev => ({
      ...prev,
      variants: {
        ...prev.variants,
        attributes: nextAttributes,
        prices: synced.prices,
        stockMap: synced.stockMap,
        imageMap: synced.imageMap,
      }
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.productName || !formData.price || !formData.categoryId) {
      toast.error("Required: Name, Selling Price & Category");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        ...formData,
        name: formData.productName,
        price: parseFloat(formData.price),
        originalPrice: formData.originalPrice === "" ? null : parseFloat(formData.originalPrice),
        stockQuantity: parseInt(formData.stockQuantity || 0),
        categoryId: formData.subcategoryId || formData.categoryId,
        variants: buildVariantPayload(formData.variants)
      };

      if (editingSale && editingSale.productId) {
        await updateVendorProduct(editingSale.productId, payload);
        toast.success("Product Updated");
      } else {
        await createVendorProduct(payload);
        toast.success("Product Created");
      }
      fetchProducts();
      setIsModalOpen(false);
    } catch (error) {
      toast.error("Failed to save product");
    } finally {
      setIsLoading(false);
    }
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
      setSaleProduct(target);
      const initialSelection = {};
      
      // Handle Size (either from attributes or simple sizes array)
      const sizeAttr = target.variants?.attributes?.find(a => a.name.toLowerCase() === 'size');
      if (sizeAttr) {
        initialSelection[sizeAttr.name] = sizeAttr.values[0];
      } else if (target.sizes?.length > 0) {
        initialSelection['Size'] = target.sizes[0];
      }

      // Handle other attributes
      target.variants?.attributes?.forEach(attr => {
        if (attr.name.toLowerCase() !== 'size' && attr.values?.length > 0) {
          initialSelection[attr.name] = attr.values[0];
        }
      });

      setSaleSelection(initialSelection);
      setSaleQuantity(1);
      setIsSaleConfirmOpen(true);
    } else {
      toast.error("Out of Stock!");
    }
  };

  const confirmSale = async () => {
    if (!saleProduct) return;
    
    try {
      const quantity = parseInt(saleQuantity) || 1;
      if (quantity <= 0) {
        toast.error("Invalid quantity");
        return;
      }

      const hasVariants = saleProduct.variants && (
        (saleProduct.variants.attributes && saleProduct.variants.attributes.length > 0) || 
        (saleProduct.variants.sizes && saleProduct.variants.sizes.length > 0)
      );

      if (hasVariants) {
        const stockMap = { ...(saleProduct.variants.stockMap || {}) };
        let key = "";

        // Improved key generation: Only use relevant attributes and normalize correctly
        const attributes = saleProduct.variants.attributes || [];
        if (attributes.length > 0) {
          const relevantSelection = {};
          attributes.forEach(attr => {
            const val = saleSelection[attr.name];
            if (val) relevantSelection[attr.name] = val;
          });

          // Sort entries to ensure consistent key generation
          key = Object.entries(relevantSelection)
            .sort((a, b) => a[0].toLowerCase().localeCompare(b[0].toLowerCase()))
            .map(([attr, val]) => `${attr.toLowerCase().trim().replace(/\s+/g, '_')}=${String(val).toLowerCase().trim()}`)
            .join('|');
        } else {
          // Fallback to simple size key format
          const size = saleSelection['Size'] || saleSelection['size'] || Object.values(saleSelection)[0] || "";
          key = `${String(size).toLowerCase().trim()}|`;
        }

        // Fuzzy matching: Try to find the key case-insensitively if exact match fails
        if (stockMap[key] === undefined) {
          const keys = Object.keys(stockMap);
          const foundKey = keys.find(k => k.toLowerCase().trim() === key.toLowerCase().trim());
          if (foundKey) key = foundKey;
        }

        const hasStockData = Object.keys(stockMap).length > 0;

        if (hasStockData) {
          if (stockMap[key] === undefined || stockMap[key] < quantity) {
            toast.error("Not enough stock for this variant!");
            return;
          }
          stockMap[key] -= quantity;
        } else {
          // If no variant stock data exists yet, fallback to total stock check
          if (saleProduct.stock < quantity) {
            toast.error("Not enough stock!");
            return;
          }
        }

        await updateVendorStock(saleProduct.productId, saleProduct.stock - quantity);
        if (hasStockData) {
          await updateVendorVariantStock(saleProduct.productId, stockMap);
        }

        setSales(sales.map(s => s.id === saleProduct.id ? { 
          ...s, 
          stock: s.stock - quantity, 
          sold: (s.sold || 0) + quantity, 
          variants: { ...s.variants, stockMap } 
        } : s));
      } else {
        if (saleProduct.stock < quantity) {
          toast.error("Not enough stock!");
          return;
        }
        const newStock = saleProduct.stock - quantity;
        await updateVendorStock(saleProduct.productId, newStock);
        setSales(sales.map(s => s.id === saleProduct.id ? { ...s, stock: newStock, sold: (s.sold || 0) + quantity } : s));
      }

      toast.success(`Sold ${quantity} ${saleProduct.productName}!`);
      setIsSaleConfirmOpen(false);
    } catch (error) {
      toast.error("Failed to record sale");
    }
  };

  const columns = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      render: (value) => <span className="text-gray-400 font-black text-[9px] uppercase tracking-tight">#{value.slice(-6)}</span>,
    },
    {
      key: "productName",
      label: "PRODUCT",
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-2 min-w-[100px]">
          <div className="w-7 h-7 rounded bg-emerald-50 flex items-center justify-center overflow-hidden border border-emerald-100 shrink-0">
             {row.image ? <img src={row.image} alt={value} className="w-full h-full object-cover" /> : <FiImage className="text-emerald-200" size={12} />}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-black text-gray-900 leading-tight text-[10px] truncate uppercase">{value}</span>
            <span className="text-[8px] text-emerald-600 font-bold uppercase truncate">{row.category}</span>
          </div>
        </div>
      )
    },
    {
      key: "price",
      label: "PRICE",
      sortable: true,
      render: (value) => <span className="text-gray-900 font-black text-[10px]">{formatPrice(value)}</span>,
    },
    {
      key: "stock",
      label: "STOCK",
      sortable: true,
      render: (value) => <span className="text-gray-600 font-bold text-[10px]">{value}</span>,
    },
    {
      key: "sold",
      label: "SOLD",
      sortable: true,
      render: (value) => <span className="text-emerald-600 font-black text-[10px]">{value || 0}</span>,
    },
    {
      key: "approvalStatus",
      label: "APPROVAL",
      render: (value) => <Badge variant="success" className="text-[8px] py-0 px-1.5 uppercase">Approved</Badge>,
    },
    {
      key: "stockStatus",
      label: "STATUS",
      render: (value, row) => (
        <Badge variant={row.stock > 0 ? "success" : "error"} className="text-[8px] py-0 px-1.5 uppercase">
           {row.stock > 0 ? "In Stock" : "Out"}
        </Badge>
      )
    },
    {
      key: "actions",
      label: "ACTIONS",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button onClick={() => handleOpenModal(row)} className="text-emerald-600 hover:text-emerald-800 transition-colors p-2 hover:bg-emerald-50 rounded-lg"><FiEdit size={20} /></button>
          <button onClick={() => handleDelete(row.id)} className="text-red-500 hover:text-red-700 transition-colors p-2 hover:bg-red-50 rounded-lg"><FiTrash2 size={20} /></button>
          <button onClick={() => handleSale(row.id)} title="Quick Sale" className="text-blue-500 hover:text-blue-700 transition-colors p-2 hover:bg-blue-50 rounded-lg"><FiShoppingCart size={20} /></button>
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
                { label: "Your Price", accessor: (row) => formatPrice(row.price) }
              ]} 
              filename="offline-sales" 
            />
          </div>
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <DataTable data={filteredSales} columns={columns} pagination={true} itemsPerPage={10} minWidth="min-w-full" />
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
                         {sale.image ? <img src={sale.image} className="w-full h-full object-cover" /> : <div className="text-[10px] text-white font-black italic">CLOSH</div>}
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
                       <span className="text-[8px] font-black text-gray-400 uppercase">Your Price</span>
                       <span className="text-[11px] font-black text-gray-900">{formatPrice(sale.price)}</span>
                    </div>
                   <div className="flex flex-col gap-0.5">
                      <span className="text-[8px] font-black text-gray-400 uppercase">Stock</span>
                      <span className="text-[11px] font-black text-gray-900">{sale.stock} <span className="text-[8px] text-gray-400">{sale.unit}</span></span>
                   </div>
                   <div className="flex flex-col gap-0.5">
                      <span className="text-[8px] font-black text-emerald-400 uppercase">Sold</span>
                      <span className="text-[11px] font-black text-emerald-600">{sale.sold || 0}</span>
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
                   <div className="flex items-center gap-5">
                      <button onClick={() => handleOpenModal(sale)} className="text-emerald-500 hover:text-emerald-700 transition-transform active:scale-90 p-2 bg-emerald-50 rounded-xl">
                         <FiEdit size={20} />
                      </button>
                      <button onClick={() => handleDelete(sale.id)} className="text-red-400 hover:text-red-600 transition-transform active:scale-90 p-2 bg-red-50 rounded-xl">
                         <FiTrash2 size={20} />
                      </button>
                      <button onClick={() => handleSale(sale.id)} className="text-blue-500 hover:text-blue-700 transition-transform active:scale-90 p-2 bg-blue-50 rounded-xl">
                         <FiShoppingCart size={20} />
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
            
            {/* Content Wrapper */}
            <div className="relative inset-0 h-full w-full flex items-center justify-center p-2 sm:p-4 pb-24 md:pb-4 pointer-events-none">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                className="relative bg-white w-full max-w-4xl max-h-[92vh] flex flex-col rounded-[1.5rem] md:rounded-[2rem] shadow-2xl border border-emerald-50 pointer-events-auto overflow-hidden"
              >
                {/* Fixed Header */}
                <div className="flex items-center justify-between p-4 md:p-6 border-b border-emerald-50 bg-white z-20">
                  <h2 className="text-base md:text-xl font-black text-[#003d29] tracking-tight flex items-center gap-2">
                    <FiShoppingBag className="text-emerald-600" /> {editingSale ? "Edit" : "New"} Product
                  </h2>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 bg-emerald-50 hover:bg-emerald-100 text-[#003d29] rounded-xl transition-colors"><FiX size={20} /></button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar">
                  <form onSubmit={handleSave} className="space-y-6">
                {/* 1. Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="md:col-span-2 space-y-1">
                     <label className="text-[10px] md:text-xs font-black text-emerald-800 uppercase ml-1">Product Name *</label>
                     <input type="text" required value={formData.productName} onChange={(e) => setFormData({ ...formData, productName: e.target.value })} className="w-full px-3 py-2.5 bg-emerald-50/20 border border-emerald-50 rounded-xl focus:ring-1 focus:ring-emerald-500 text-xs md:text-sm font-bold" placeholder="T-Shirt..." />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] md:text-xs font-black text-emerald-800 uppercase ml-1">Unit</label>
                     <input type="text" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="w-full px-3 py-2.5 bg-emerald-50/20 border border-emerald-50 rounded-xl focus:ring-1 focus:ring-emerald-500 text-xs md:text-sm font-bold" placeholder="Piece/Box" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] md:text-xs font-black text-emerald-800 uppercase ml-1">Division *</label>
                    <AnimatedSelect
                      value={formData.division}
                      onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                      options={[
                        { value: "Men", label: "Men" },
                        { value: "Women", label: "Women" },
                        { value: "Boys", label: "Boys" },
                        { value: "Girls", label: "Girls" },
                        { value: "Unisex", label: "Unisex" },
                      ]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] md:text-xs font-black text-emerald-800 uppercase ml-1">Category *</label>
                    <CategorySelector
                      value={formData.categoryId}
                      subcategoryId={formData.subcategoryId}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        [e.target.name]: e.target.value 
                      }))}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] md:text-xs font-black text-emerald-800 uppercase ml-1">Brand</label>
                    <AnimatedSelect
                      value={formData.brandId || ""}
                      onChange={(e) => setFormData({ ...formData, brandId: e.target.value || null })}
                      placeholder="Select Brand"
                      options={[
                        { value: "", label: "No Brand" },
                        ...brands.map(b => ({ value: b._id || b.id, label: b.name }))
                      ]}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] md:text-xs font-black text-emerald-800 uppercase ml-1">Description</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2.5 bg-emerald-50/20 border border-emerald-50 rounded-xl focus:ring-1 focus:ring-emerald-500 text-xs md:text-sm font-bold" rows={2} placeholder="Briefly describe..." />
                </div>

                {/* 2. Pricing & Stock */}
                <div className="bg-emerald-50/10 p-4 rounded-2xl border border-emerald-50 space-y-4">
                  <h3 className="text-xs font-black text-emerald-800 uppercase">Pricing & Base Inventory</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] md:text-xs font-black text-emerald-800 uppercase ml-1">Selling Price *</label>
                       <input type="number" required value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-emerald-50 rounded-xl focus:ring-1 focus:ring-emerald-500 text-xs md:text-sm font-bold" placeholder="0.00" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] md:text-xs font-black text-gray-400 uppercase ml-1">MRP</label>
                        <input type="number" value={formData.originalPrice} onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-100 rounded-xl focus:ring-1 focus:ring-emerald-500 text-xs md:text-sm font-bold" placeholder="0.00" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] md:text-xs font-black text-emerald-800 uppercase ml-1">Discount (%)</label>
                        <input type="number" readOnly value={formData.discount} className="w-full px-3 py-2.5 bg-emerald-50/50 border border-emerald-50 rounded-xl text-emerald-600 text-xs md:text-sm font-black" placeholder="0" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] md:text-xs font-black text-emerald-800 uppercase ml-1">Stock Quantity *</label>
                        <input 
                          type="number" 
                          required 
                          readOnly={variantCombinations.length > 0}
                          value={formData.stockQuantity} 
                          onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })} 
                          className={`w-full px-3 py-2.5 bg-white border border-emerald-50 rounded-xl focus:ring-1 focus:ring-emerald-500 text-xs md:text-sm font-bold ${variantCombinations.length > 0 ? 'bg-emerald-50/50 text-emerald-600' : ''}`} 
                        />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] md:text-xs font-black text-emerald-800 uppercase ml-1">Stock Status</label>
                      <AnimatedSelect
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        options={[
                          { value: 'in_stock', label: 'In Stock' },
                          { value: 'low_stock', label: 'Low Stock' },
                          { value: 'out_of_stock', label: 'Out of Stock' },
                        ]}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Variants Section */}
                <div className="bg-emerald-50/10 p-4 rounded-2xl border border-emerald-50 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-emerald-800 uppercase">Product Variants</h3>
                    <button
                      type="button"
                      onClick={() => {
                        const current = formData.variants?.attributes || [];
                        updateVariantAttributes([...current, { name: "", values: [] }]);
                      }}
                      className="px-3 py-1 bg-[#003d29] text-white rounded-lg text-[10px] font-bold uppercase"
                    >
                      Add Attribute
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Sizes MultiSelect */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-emerald-700 uppercase">Standard Sizes</label>
                      <MultiSelect
                        value={formData.variants?.sizes || []}
                        onChange={(e) => updateVariantAxes('sizes', e.target.value.join(', '))}
                        options={PRODUCT_SIZES}
                        placeholder="Select sizes..."
                      />
                    </div>

                    {/* Dynamic Attributes */}
                    {(formData.variants?.attributes || []).map((attr, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                        <div className="md:col-span-3 space-y-1">
                          <label className="text-[9px] font-bold text-gray-500 uppercase">Attr Name</label>
                          <input 
                            type="text" 
                            value={attr.name} 
                            onChange={(e) => {
                              const next = [...formData.variants.attributes];
                              next[index].name = e.target.value;
                              updateVariantAttributes(next);
                            }}
                            className="w-full px-2 py-1.5 bg-white border border-emerald-50 rounded-lg text-xs font-bold" 
                            placeholder="e.g. Material"
                          />
                        </div>
                        <div className="md:col-span-8 space-y-1">
                          <label className="text-[9px] font-bold text-gray-500 uppercase">Values (comma separated)</label>
                          <input 
                            type="text" 
                            value={(attr.values || []).join(', ')} 
                            onChange={(e) => {
                              const next = [...formData.variants.attributes];
                              next[index].values = parseVariantAxis(e.target.value);
                              updateVariantAttributes(next);
                            }}
                            className="w-full px-2 py-1.5 bg-white border border-emerald-50 rounded-lg text-xs font-bold"
                            placeholder="Cotton, Silk..."
                          />
                        </div>
                        <button 
                          type="button" 
                          onClick={() => updateVariantAttributes(formData.variants.attributes.filter((_, i) => i !== index))}
                          className="md:col-span-1 p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"
                        >
                          <FiX size={14} className="mx-auto" />
                        </button>
                      </div>
                    ))}

                    {/* Variant Price/Stock Grid */}
                    {variantCombinations.length > 0 && (
                      <div className="mt-4 border border-emerald-100 rounded-xl overflow-hidden bg-white">
                        <table className="w-full text-left text-[10px] md:text-xs">
                          <thead className="bg-emerald-50/50 text-emerald-800 font-black uppercase">
                            <tr>
                              <th className="px-3 py-2">Variant</th>
                              <th className="px-3 py-2">Price (Optional)</th>
                              <th className="px-3 py-2">Stock</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-emerald-50">
                            {variantCombinations.map((combo) => (
                              <tr key={combo.key}>
                                <td className="px-3 py-2 font-bold text-gray-700">{combo.label}</td>
                                <td className="px-3 py-2">
                                  <input 
                                    type="number" 
                                    value={formData.variants.prices[combo.key] ?? ""} 
                                    onChange={(e) => setFormData(prev => ({
                                      ...prev,
                                      variants: { ...prev.variants, prices: { ...prev.variants.prices, [combo.key]: e.target.value } }
                                    }))}
                                    className="w-full px-2 py-1 bg-emerald-50/20 border border-emerald-50 rounded focus:ring-1 focus:ring-emerald-500" 
                                    placeholder="Base"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input 
                                    type="number" 
                                    value={formData.variants.stockMap[combo.key] ?? ""} 
                                    onChange={(e) => setFormData(prev => ({
                                      ...prev,
                                      variants: { ...prev.variants, stockMap: { ...prev.variants.stockMap, [combo.key]: e.target.value } }
                                    }))}
                                    className="w-full px-2 py-1 bg-emerald-50/20 border border-emerald-50 rounded focus:ring-1 focus:ring-emerald-500" 
                                    placeholder="0"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Media & Additional Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <label className="text-[10px] md:text-xs font-black text-emerald-800 uppercase ml-1">Product Media</label>
                    <div className="relative border-2 border-dashed border-emerald-100 rounded-xl bg-emerald-50/10 p-4 text-center cursor-pointer hover:border-emerald-300">
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                      {formData.image ? (
                        <div className="flex items-center gap-3">
                          <img src={formData.image} className="w-12 h-12 rounded-lg object-cover" />
                          <div className="text-left"><p className="text-xs font-black">Main Image Set</p><p className="text-[10px] text-emerald-500 font-bold uppercase">Change</p></div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <FiUpload className="text-emerald-300" size={20} />
                          <p className="text-xs font-black">Upload Main Image</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                     <label className="text-[10px] md:text-xs font-black text-emerald-800 uppercase ml-1">Settings & SEO</label>
                     <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-gray-400">HSN CODE</label>
                          <input type="text" value={formData.hsnCode} onChange={(e) => setFormData({...formData, hsnCode: e.target.value})} className="w-full px-2 py-1.5 bg-white border border-gray-100 rounded-lg text-xs" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-gray-400">TAX RATE (%)</label>
                          <input type="number" value={formData.taxRate} onChange={(e) => setFormData({...formData, taxRate: e.target.value})} className="w-full px-2 py-1.5 bg-white border border-gray-100 rounded-lg text-xs" />
                        </div>
                     </div>
                  </div>
                </div>

                {/* Tags & Options */}
                <div className="flex flex-wrap gap-4">
                   <div className="flex-1 min-w-[200px] space-y-1">
                      <label className="text-[10px] font-bold text-emerald-800 uppercase">Tags (Comma separated)</label>
                      <input 
                        type="text" 
                        value={formData.tags.join(', ')} 
                        onChange={(e) => setFormData({...formData, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)})}
                        className="w-full px-3 py-2 bg-emerald-50/10 border border-emerald-50 rounded-xl text-xs font-bold" 
                        placeholder="shoes, adidas, sporty..."
                      />
                   </div>
                   <div className="flex items-center gap-4 pt-4">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" checked={formData.flashSale} onChange={(e) => setFormData({...formData, flashSale: e.target.checked})} className="w-4 h-4 rounded border-emerald-200 text-emerald-600 focus:ring-emerald-500" />
                        <span className="text-[10px] font-bold text-gray-600 uppercase group-hover:text-emerald-600 transition-colors">Flash Sale</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" checked={formData.isVisible} onChange={(e) => setFormData({...formData, isVisible: e.target.checked})} className="w-4 h-4 rounded border-emerald-200 text-emerald-600 focus:ring-emerald-500" />
                        <span className="text-[10px] font-bold text-gray-600 uppercase group-hover:text-emerald-600 transition-colors">Visible</span>
                      </label>
                   </div>
                </div>

                  </form>
                </div>

                {/* Fixed Footer */}
                <div className="p-4 md:p-6 border-t border-emerald-50 bg-white z-20">
                  <button type="submit" onClick={handleSave} disabled={isLoading} className="w-full py-4 bg-[#003d29] text-white rounded-[1.25rem] font-black text-sm tracking-widest hover:bg-[#002a1c] transition-all uppercase flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-900/10">
                    <FiCheck className="size-4" /> {isLoading ? "Saving..." : "Save Product"}
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      <AnimatePresence>
        {isSaleConfirmOpen && saleProduct && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSaleConfirmOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md max-h-[90vh] flex flex-col rounded-[2rem] shadow-2xl border border-emerald-50 overflow-hidden"
            >
              {/* Fixed Header */}
              <div className="flex items-center justify-between p-6 md:p-8 border-b border-emerald-50 bg-white z-10">
                <h3 className="text-xl font-black text-[#003d29] flex items-center gap-2">
                  <FiShoppingCart className="text-emerald-600" /> Confirm Sale
                </h3>
                <button onClick={() => setIsSaleConfirmOpen(false)} className="p-2 bg-emerald-50 text-[#003d29] rounded-xl hover:bg-emerald-100 transition-colors">
                  <FiX size={20} />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 no-scrollbar">

              <div className="flex items-center gap-4 mb-8 p-4 bg-emerald-50/30 rounded-2xl border border-emerald-50">
                <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center overflow-hidden border border-emerald-100 shadow-sm">
                  {saleProduct.image ? <img src={saleProduct.image} className="w-full h-full object-cover" /> : <FiImage className="text-emerald-200" size={24} />}
                </div>
                <div>
                  <h4 className="font-black text-[#003d29] leading-tight">{saleProduct.productName}</h4>
                  <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mt-0.5">{saleProduct.category}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm font-black text-gray-900">{formatPrice(saleProduct.price)}</span>
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 rounded text-[10px] font-bold text-emerald-700">
                      Sold: {saleProduct.sold || 0}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6 mb-8">
                {/* Size Selection */}
                {(saleProduct.sizes?.length > 0 || saleProduct.variants?.attributes?.find(a => a.name.toLowerCase() === 'size')) && (
                  <div className="space-y-3">
                    <label className="text-xs font-black text-emerald-800 uppercase ml-1 flex items-center gap-1.5">
                      <FiMaximize size={14} className="text-emerald-500" /> Select Size
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(saleProduct.variants?.attributes?.find(a => a.name.toLowerCase() === 'size')?.values || saleProduct.sizes).map(size => {
                        const sizeAttrName = saleProduct.variants?.attributes?.find(a => a.name.toLowerCase() === 'size')?.name || 'Size';
                        return (
                          <button
                            key={size}
                            onClick={() => setSaleSelection({...saleSelection, [sizeAttrName]: size})}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all border-2 ${
                              saleSelection[sizeAttrName] === size 
                              ? 'bg-[#003d29] text-white border-[#003d29] shadow-lg shadow-emerald-900/20' 
                              : 'bg-white text-gray-600 border-gray-100 hover:border-emerald-200'
                            }`}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Other Attributes */}
                {saleProduct.variants?.attributes?.filter(a => a.name.toLowerCase() !== 'size').map(attr => (
                  <div key={attr.name} className="space-y-3">
                    <label className="text-xs font-black text-emerald-800 uppercase ml-1 flex items-center gap-1.5">
                      <div className="size-1.5 rounded-full bg-emerald-500"></div> Select {attr.name}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {attr.values.map(val => (
                        <button
                          key={val}
                          onClick={() => setSaleSelection({...saleSelection, [attr.name]: val})}
                          className={`px-4 py-2 rounded-xl text-xs font-black transition-all border-2 ${
                            saleSelection[attr.name] === val
                            ? 'bg-[#003d29] text-white border-[#003d29] shadow-lg shadow-emerald-900/20'
                            : 'bg-white text-gray-600 border-gray-100 hover:border-emerald-200'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Quantity Selection */}
                <div className="space-y-3">
                  <label className="text-xs font-black text-emerald-800 uppercase ml-1 flex items-center gap-1.5">
                    <FiBox size={14} className="text-emerald-500" /> Quantity (Pieces)
                  </label>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setSaleQuantity(Math.max(1, saleQuantity - 1))}
                      className="w-10 h-10 rounded-xl border-2 border-gray-100 flex items-center justify-center text-gray-500 hover:border-emerald-200 transition-all font-black"
                    >
                      -
                    </button>
                    <input 
                      type="number" 
                      value={saleQuantity}
                      onChange={(e) => setSaleQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 text-center py-2 bg-emerald-50/20 border-2 border-emerald-50 rounded-xl font-black text-[#003d29]"
                    />
                    <button 
                      onClick={() => setSaleQuantity(saleQuantity + 1)}
                      className="w-10 h-10 rounded-xl border-2 border-gray-100 flex items-center justify-center text-gray-500 hover:border-emerald-200 transition-all font-black"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
              <div className="p-6 md:p-8 border-t border-emerald-50 bg-white">
                <button 
                  onClick={confirmSale}
                  className="w-full py-4 bg-[#003d29] text-white rounded-2xl font-black text-sm tracking-widest hover:bg-[#002a1c] transition-all uppercase flex items-center justify-center gap-2 shadow-xl shadow-emerald-900/20"
                >
                  <FiCheck className="size-5" /> Record Sale
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  </motion.div>
  );
};

export default OfflineSales;
