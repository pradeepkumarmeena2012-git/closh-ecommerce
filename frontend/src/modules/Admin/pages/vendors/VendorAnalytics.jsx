import { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiBarChart2,
  FiTrendingUp,
  FiDollarSign,
  FiShoppingBag,
  FiPackage,
} from "react-icons/fi";
import { motion } from "framer-motion";
import { formatPrice } from "../../../../shared/utils/helpers";
import { getVendorPerformance } from "../../services/adminService";
import VendorHeader from "../../components/Vendors/VendorHeader";

const VendorAnalytics = () => {
  const navigate = useNavigate();
  const [vendorStats, setVendorStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPerformance = async () => {
      setIsLoading(true);
      try {
        const response = await getVendorPerformance();
        const data = response?.data ?? response;
        setVendorStats(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch vendor performance:", error);
        setVendorStats([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPerformance();
  }, []);

  const overallStats = useMemo(() => {
    return {
      totalVendors: vendorStats.length,
      totalOrders: vendorStats.reduce((sum, v) => sum + (v.totalOrders || 0), 0),
      totalRevenue: vendorStats.reduce((sum, v) => sum + (v.totalRevenue || 0), 0),
      totalEarnings: vendorStats.reduce((sum, v) => sum + (v.totalEarnings || 0), 0),
    };
  }, [vendorStats]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      <VendorHeader />


      {/* Overall Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 animate-pulse">
              <div className="h-4 w-24 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 w-32 bg-gray-200 rounded"></div>
            </div>
          ))
        ) : (
          <>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total Vendors</p>
                <FiPackage className="text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-800">
                {overallStats.totalVendors}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total Orders</p>
                <FiShoppingBag className="text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-800">
                {overallStats.totalOrders}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total Revenue</p>
                <FiDollarSign className="text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-gray-800">
                {formatPrice(overallStats.totalRevenue)}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total Earnings</p>
                <FiTrendingUp className="text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-gray-800">
                {formatPrice(overallStats.totalEarnings)}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Vendor Performance Table */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          Vendor Performance
        </h2>
        {isLoading ? (
          <div className="flex flex-col space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-50 animate-pulse rounded-lg"></div>
            ))}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Vendor
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                      Orders
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                      Revenue
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                      Earnings
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                      Pending
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {vendorStats.map((vendor) => (
                    <tr
                      key={vendor.id}
                      className="border-b border-gray-100 hover:bg-white hover:text-black transition-colors cursor-pointer"
                      onClick={() => navigate(`/admin/vendors/${vendor.id}`)}>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-semibold text-gray-800">
                            {vendor.storeName || vendor.name}
                          </p>
                          <p className="text-xs text-gray-500">{vendor.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-gray-800">
                          {vendor.totalOrders}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-gray-800">
                          {formatPrice(vendor.totalRevenue)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-green-600">
                          {formatPrice(vendor.totalEarnings)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-yellow-600">
                          {formatPrice(vendor.pendingEarnings)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/vendors/${vendor.id}`);
                          }}
                          className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {vendorStats.length === 0 && (
              <div className="text-center py-12">
                <FiBarChart2 className="text-4xl text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No vendor data available</p>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default VendorAnalytics;
