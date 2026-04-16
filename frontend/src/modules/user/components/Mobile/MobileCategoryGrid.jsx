import { Link } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { categories as fallbackCategories } from "../../../../data/categories";
import LazyImage from "../../../../shared/components/LazyImage";
import { useCategoryStore } from "../../../../shared/store/categoryStore";

const normalizeId = (value) => String(value ?? "").trim();

const MobileCategoryGrid = () => {
  const { categories, initialize, getRootCategories } = useCategoryStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const displayCategories = useMemo(() => {
    // Robust check for root categories
    const roots = getRootCategories().filter((cat) => 
      (!cat.parentId || cat.parentId === '' || cat.parentId === null) && 
      cat.isActive !== false
    );
    
    // If we have categories in store but no roots, check if we should still show fallback
    // Usually if categories were fetched from DB, we want to show those.
    if (!roots.length && categories.length === 0) return fallbackCategories;
    if (!roots.length) return [];

    return roots.map((cat) => {
      const fallbackCat = fallbackCategories.find(
        (fc) =>
          normalizeId(fc.id) === normalizeId(cat.id || cat._id) ||
          fc.name?.toLowerCase() === cat.name?.toLowerCase()
      );
      return {
        ...(fallbackCat || {}),
        ...cat,
        image: cat.image || fallbackCat?.image || "",
      };
    });
  }, [categories, getRootCategories]);

  return (
    <div className="px-5 py-4 bg-white shadow-sm border-b border-gray-100">
      <h2 className="text-[14px] font-black text-gray-900 uppercase tracking-tight mb-4 ml-1">
        Browse Categories
      </h2>
      <div className="grid grid-cols-4 gap-x-2 gap-y-6 justify-items-center">
        {displayCategories.map((category, index) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03 }}
            className="w-full">
            <Link
              to={`/category/${category.id}`}
              className="flex flex-col items-center gap-2 group">
              <div className="w-[60px] h-[60px] rounded-full overflow-hidden bg-[#F8F9FA] ring-1 ring-black/5 shadow-sm group-hover:ring-black/20 transition-all duration-300">
                <LazyImage
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  onError={(e) => {
                    e.target.src =
                      "https://via.placeholder.com/100x100?text=Category";
                  }}
                />
              </div>
              <span className="text-[10px] font-bold text-gray-700 text-center leading-tight line-clamp-2 px-1 group-hover:text-black transition-colors">
                {category.name}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default MobileCategoryGrid;
