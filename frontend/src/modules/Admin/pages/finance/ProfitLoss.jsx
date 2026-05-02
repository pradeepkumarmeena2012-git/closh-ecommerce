import { useState, useEffect, useMemo } from "react";
import { FiDollarSign, FiTrendingUp, FiTrendingDown } from "react-icons/fi";
import { motion } from "framer-motion";
import ProfitLossChart from "../../components/Analytics/ProfitLossChart";
import AnimatedSelect from "../../components/AnimatedSelect";
import { formatPrice } from '../../../../shared/utils/helpers';
import { useAnalyticsStore } from "../../../../shared/store/analyticsStore";

const getRangeForPeriod = (period) => {
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let startDate = new Date(endDate);

  if (period === 'week') {
    startDate.setDate(endDate.getDate() - 6);
  } else if (period === 'month') {
    startDate.setDate(endDate.getDate() - 29);
  } else {
    startDate.setFullYear(endDate.getFullYear() - 1);
    startDate.setDate(endDate.getDate() + 1);
  }

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
};

const ProfitLoss = () => {
  const [period, setPeriod] = useState("month");
  const [isPageLoading, setIsPageLoading] = useState(false);
  const { financialSummary, fetchFinancialSummary, detailedEarningsReport, fetchDetailedEarningsReport } = useAnalyticsStore();

  useEffect(() => {
    const periodMap = {
      week: 'daily',
      month: 'daily',
      year: 'monthly'
    };
    const range = getRangeForPeriod(period);
    let mounted = true;

    const run = async () => {
      setIsPageLoading(true);
      try {
        await Promise.all([
          fetchFinancialSummary(periodMap[period] || 'monthly', range),
          fetchDetailedEarningsReport({ ...range })
        ]);
      } finally {
        if (mounted) setIsPageLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [period, fetchFinancialSummary]);

  const chartData = useMemo(() => {
    return financialSummary.map(item => ({
      ...item,
      date: item._id,
    }));
  }, [financialSummary]);

  const financials = useMemo(() => {
    const revenue = financialSummary.reduce((sum, item) => sum + (item.revenue || 0), 0);
    const totalTax = financialSummary.reduce((sum, item) => sum + (item.tax || 0), 0);
    const totalDelivery = financialSummary.reduce((sum, item) => sum + (item.delivery || 0), 0);
    const totalDeliveryPayout = financialSummary.reduce((sum, item) => sum + (item.deliveryPayout || 0), 0);
    const totalDiscount = financialSummary.reduce((sum, item) => sum + (item.discount || 0), 0);
    const totalCommission = financialSummary.reduce((sum, item) => sum + (item.commission || 0), 0);
    const totalMargin = financialSummary.reduce((sum, item) => sum + (item.margin || 0), 0);
    
    // Admin Earnings: Commission + Margin + Shipping Collected
    const adminGrossIncome = totalCommission + totalMargin + totalDelivery;
    const totalExpenses = totalDeliveryPayout + totalDiscount;
    const netProfit = adminGrossIncome - totalExpenses; 
    const profitMargin = adminGrossIncome > 0 ? (netProfit / adminGrossIncome) * 100 : 0;

    return {
      revenue,
      totalTax,
      totalDelivery,
      totalDeliveryPayout,
      totalDiscount,
      totalCommission,
      totalMargin,
      adminGrossIncome,
      totalExpenses,
      netProfit,
      profitMargin,
    };
  }, [financialSummary]);

  if (isPageLoading && financialSummary.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      <div className="lg:hidden">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
          Profit & Loss
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          View financial performance and profitability
        </p>
      </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <AnimatedSelect
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          options={[
            { value: "week", label: "Last 7 Days" },
            { value: "month", label: "Last 30 Days" },
            { value: "year", label: "Last Year" },
          ]}
          className="min-w-[140px]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Earnings (Profit)</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Product Margin</span>
              <span className="font-bold text-green-600">
                {formatPrice(financials.totalMargin)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Vendor Commission</span>
              <span className="font-bold text-green-600">
                {formatPrice(financials.totalCommission)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Shipping Fee (Income)</span>
              <span className="font-bold text-green-600">
                {formatPrice(financials.totalDelivery)}
              </span>
            </div>
            <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
              <span className="font-semibold text-gray-800">
                Gross Earnings
              </span>
              <span className="font-bold text-green-600">
                {formatPrice(financials.adminGrossIncome)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Operational Costs (Loss)</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Delivery Partner Payout</span>
              <span className="font-bold text-red-600">
                {formatPrice(financials.totalDeliveryPayout)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Platform Discounts</span>
              <span className="font-bold text-red-600">
                {formatPrice(financials.totalDiscount)}
              </span>
            </div>
            <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
              <span className="font-semibold text-gray-800">
                Total Operational Cost
              </span>
              <span className="font-bold text-red-600">
                {formatPrice(financials.totalExpenses)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Gross Earnings</p>
            <FiTrendingUp className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">
            {formatPrice(financials.adminGrossIncome)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Net Profit</p>
            <FiDollarSign className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {formatPrice(financials.netProfit)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Profit Margin</p>
            <FiTrendingDown className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {financials.profitMargin.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Financial Trends</h3>
          <AnimatedSelect
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            options={[
              { value: "week", label: "Last 7 Days" },
              { value: "month", label: "Last 30 Days" },
              { value: "year", label: "Last Year" },
            ]}
            className="min-w-[140px]"
          />
        </div>
        <ProfitLossChart data={chartData} period={period} />
      </div>

      {/* Detailed Payout Report */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-800">Detailed Operational Expenses</h3>
          <p className="text-sm text-gray-500 italic mt-1">Breakdown of payouts to delivery partners and vendors</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="py-4 px-4 text-xs font-black uppercase tracking-wider text-gray-400">Order ID</th>
                <th className="py-4 px-4 text-xs font-black uppercase tracking-wider text-gray-400">Date</th>
                <th className="py-4 px-4 text-xs font-black uppercase tracking-wider text-gray-400">Partner</th>
                <th className="py-4 px-4 text-xs font-black uppercase tracking-wider text-gray-400">Payout (Expense)</th>
                <th className="py-4 px-4 text-xs font-black uppercase tracking-wider text-gray-400">Net Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {detailedEarningsReport.slice(0, 10).map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-4 text-sm font-bold text-gray-800">{row.orderId}</td>
                  <td className="py-4 px-4 text-sm text-gray-500">{new Date(row.date).toLocaleDateString()}</td>
                  <td className="py-4 px-4">
                    <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded uppercase tracking-tighter">
                      {row.deliveryPartner}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm font-black text-red-600">-{formatPrice(row.deliveryPayout)}</td>
                  <td className="py-4 px-4 text-sm font-black text-green-600">+{formatPrice(row.adminNetProfit)}</td>
                </tr>
              ))}
              {detailedEarningsReport.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-gray-400 italic text-sm">No recent transactions found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default ProfitLoss;
