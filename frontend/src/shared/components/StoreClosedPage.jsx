import { useSettingsStore } from "../store/settingsStore";
import { motion } from "framer-motion";
import { FiTool, FiAlertCircle } from "react-icons/fi";

const StoreClosedPage = ({ message }) => {
  const { settings } = useSettingsStore();
  const logo = settings?.general?.storeLogo;
  const storeName = settings?.general?.storeName || "Store";
  const primaryColor = settings?.theme?.primaryColor || "#10B981";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100"
      >
        {logo ? (
          <img src={logo} alt={storeName} className="h-20 mx-auto mb-6 object-contain" />
        ) : (
          <div 
            className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center text-white" 
            style={{ backgroundColor: primaryColor }}
          >
             <FiTool size={32} />
          </div>
        )}
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">We'll be back soon!</h1>
        
        <div className="bg-orange-50 text-orange-800 p-6 rounded-xl flex flex-col items-center gap-3 mb-8 border border-orange-100">
          <FiAlertCircle size={32} className="text-orange-500" />
          <p className="text-base font-medium">
            {message || "We are currently undergoing maintenance. Please check back later."}
          </p>
        </div>
        
        <p className="text-sm text-gray-500">
          Thank you for your patience.
        </p>
      </motion.div>
    </div>
  );
};

export default StoreClosedPage;
