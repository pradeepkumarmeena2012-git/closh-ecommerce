import { useState, useEffect, useCallback } from 'react';
import { FiCalendar, FiTrendingUp, FiDollarSign, FiTruck, FiActivity } from 'react-icons/fi';
import { motion } from 'framer-motion';
import DataTable from '../../components/DataTable';
import ExportButton from '../../components/ExportButton';
import { formatPrice } from '../../../../shared/utils/helpers';
import * as adminService from '../../services/adminService';
import toast from 'react-hot-toast';

const EarningsReport = () => {
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [reportData, setReportData] = useState([]);
    const [summary, setSummary] = useState({
        totalRevenue: 0,
        totalCommission: 0,
        totalMargin: 0,
        totalVendorCost: 0,
        totalDeliveryPayout: 0,
        adminNetProfit: 0,
        orderCount: 0
    });
    const [loading, setLoading] = useState(false);

    const fetchEarnings = useCallback(async (range = { start: '', end: '' }) => {
        setLoading(true);
        try {
            // Fetch Summary
            const summaryRes = await adminService.getAdminEarningsSummary({
                startDate: range.start,
                endDate: range.end
            });
            setSummary({
                totalRevenue: summaryRes?.data?.totalRevenue || 0,
                totalCommission: summaryRes?.data?.totalCommission || 0,
                totalMargin: summaryRes?.data?.totalMargin || 0,
                totalVendorCost: summaryRes?.data?.totalVendorCost || 0,
                totalDeliveryPayout: summaryRes?.data?.totalDeliveryPayout || 0,
                adminNetProfit: summaryRes?.data?.adminNetProfit || 0,
                orderCount: summaryRes?.data?.orderCount || 0
            });

            // Fetch Detailed Report (all pages for export compatibility if needed, but pagination is handled by DataTable)
            const reportRes = await adminService.getDetailedEarningsReport({
                page: 1,
                limit: 1000, // Fetch a large chunk for now, or implement server-side pagination properly in DataTable
                startDate: range.start,
                endDate: range.end
            });
            setReportData(reportRes?.data?.report || []);

        } catch (error) {
            console.error(error);
            toast.error('Failed to fetch earnings report');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEarnings();
    }, [fetchEarnings]);

    const handleApplyFilter = () => {
        fetchEarnings(dateRange);
    };

    const columns = [
        {
            key: 'orderId',
            label: 'Order ID',
            sortable: true,
            render: (value) => <span className="font-semibold text-gray-800">{value}</span>,
        },
        {
            key: 'date',
            label: 'Date',
            sortable: true,
            render: (value) => new Date(value).toLocaleDateString(),
        },
        {
            key: 'revenue',
            label: 'Total Rev.',
            sortable: true,
            render: (value) => <span className="text-gray-600">{formatPrice(value)}</span>,
        },
        {
            key: 'vendorCost',
            label: 'Vendor Price',
            sortable: true,
            render: (value) => <span className="text-gray-500">{formatPrice(value)}</span>,
        },
        {
            key: 'margin',
            label: 'Platform Margin',
            sortable: true,
            render: (value) => <span className="text-blue-600 font-bold">+{formatPrice(value)}</span>,
        },
        {
            key: 'commission',
            label: 'Commission',
            sortable: true,
            render: (value) => <span className="text-green-600 font-medium">+{formatPrice(value)}</span>,
        },
        {
            key: 'deliveryPayout',
            label: 'Deliv. Cost',
            sortable: true,
            render: (value) => <span className="text-red-500 font-medium">-{formatPrice(value)}</span>,
        },
        {
            key: 'adminNetProfit',
            label: 'Net Profit',
            sortable: true,
            render: (value) => (
                <div className="flex flex-col">
                    <span className={`font-black text-lg ${value >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {formatPrice(value)}
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Earnings - Delivery</span>
                </div>
            ),
        },
    ];

    const statCards = [
        {
            title: 'Total Revenue',
            value: formatPrice(summary.totalRevenue),
            icon: <FiDollarSign className="text-gray-400" />,
            color: 'blue'
        },
        {
            title: 'Vendor Price',
            value: formatPrice(summary.totalVendorCost),
            icon: <FiActivity className="text-orange-500" />,
            color: 'orange'
        },
        {
            title: 'Platform Margin',
            value: formatPrice(summary.totalMargin),
            icon: <FiActivity className="text-blue-500" />,
            color: 'indigo'
        },
        {
            title: 'Commission',
            value: formatPrice(summary.totalCommission),
            icon: <FiTrendingUp className="text-green-500" />,
            color: 'green'
        },
        {
            title: 'Admin Net Profit',
            value: formatPrice(summary.adminNetProfit),
            subtitle: `${summary.orderCount} Delivered Orders`,
            icon: <FiTrendingUp className="text-primary-500" />,
            color: 'primary',
            highlight: true
        }
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Earnings Report</h1>
                <p className="text-sm sm:text-base text-gray-600">Comprehensive breakdown of platform profits</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {statCards.map((card, idx) => (
                    <div
                        key={idx}
                        className={`bg-white rounded-xl p-5 shadow-sm border ${card.highlight ? 'border-primary-200 ring-4 ring-primary-50' : 'border-gray-200'}`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{card.title}</p>
                            <div className="p-2 bg-gray-50 rounded-lg">
                                {card.icon}
                            </div>
                        </div>
                        <p className={`text-xl font-bold ${card.highlight ? 'text-primary-600' : 'text-gray-800'}`}>
                            {card.value}
                        </p>
                        {card.subtitle && (
                            <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
                        )}
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-gray-700 mb-1 font-inter">Start Date</label>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-inter"
                        />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-gray-700 mb-1 font-inter">End Date</label>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-inter"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleApplyFilter}
                            className="px-6 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-all shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap"
                        >
                            Apply Filter
                        </button>
                        <ExportButton
                            data={reportData}
                            headers={[
                                { label: 'Order ID', accessor: 'orderId' },
                                { label: 'Date', accessor: (row) => new Date(row.date).toLocaleDateString() },
                                { label: 'Revenue', accessor: (row) => row.revenue },
                                { label: 'Margin', accessor: (row) => row.margin },
                                { label: 'Commission', accessor: (row) => row.commission },
                                { label: 'Delivery Cost', accessor: (row) => row.deliveryPayout },
                                { label: 'Net Profit', accessor: (row) => row.adminNetProfit },
                            ]}
                            filename="earnings-report"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center p-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <DataTable
                            data={reportData}
                            columns={columns}
                            pagination={true}
                            itemsPerPage={10}
                            emptyMessage="No earnings found for the selected period."
                        />
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default EarningsReport;
