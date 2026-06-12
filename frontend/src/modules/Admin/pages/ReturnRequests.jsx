import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiEye, FiCheck, FiX, FiRefreshCw } from 'react-icons/fi';
import { motion } from 'framer-motion';
import DataTable from '../components/DataTable';
import ExportButton from '../components/ExportButton';
import Badge from '../../../shared/components/Badge';
import AnimatedSelect from '../components/AnimatedSelect';
import { formatCurrency, formatDateTime } from '../utils/adminHelpers';
import { useReturnStore } from '../../../shared/store/returnStore';
import { getAllVendors } from '../services/adminService';

import socketService from '../../../shared/utils/socket';
import toast from 'react-hot-toast';

const ReturnRequests = () => {
  const navigate = useNavigate();
  const {
    returnRequests,
    isLoading,
    pagination,
    fetchReturnRequests,
    updateReturnStatus,
  } = useReturnStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const [vendors, setVendors] = useState([]);
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedVendor, setSelectedVendor] = useState('all');

  const loadRequests = () => {
    const now = new Date();
    const formatDate = (date) => date.toISOString().slice(0, 10);
    let startDate;
    let endDate;

    if (dateFilter === 'today') {
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      startDate = formatDate(today);
      endDate = formatDate(today);
    } else if (dateFilter === 'week') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      weekStart.setHours(0, 0, 0, 0);
      startDate = formatDate(weekStart);
      endDate = formatDate(now);
    } else if (dateFilter === 'month') {
      const monthStart = new Date(now);
      monthStart.setDate(now.getDate() - 30);
      monthStart.setHours(0, 0, 0, 0);
      startDate = formatDate(monthStart);
      endDate = formatDate(now);
    }

    fetchReturnRequests({
      search: searchQuery,
      status: selectedStatus === 'all' ? undefined : selectedStatus,
      startDate,
      endDate,
      vendorCity: selectedCity === 'all' ? undefined : selectedCity,
      vendorId: selectedVendor === 'all' ? undefined : selectedVendor,
    });
  };

  useEffect(() => {
    loadRequests();
  }, [searchQuery, selectedStatus, dateFilter, selectedCity, selectedVendor, fetchReturnRequests]);

  useEffect(() => {
    socketService.connect();
    socketService.joinRoom('admin');

    const handleNewReturn = (data) => {
      toast.success(`New Return Request for Order ${data.orderId}`, {
        duration: 5000,
        icon: '🔄'
      });
      loadRequests();
    };

    socketService.on('new_return_request', handleNewReturn);

    return () => {
      socketService.off('new_return_request', handleNewReturn);
    };
  }, []);

  useEffect(() => {
    const fetchVendorsData = async () => {
      try {
        const response = await getAllVendors({ limit: 500 });
        const fetchedVendors = response?.data?.vendors || response?.vendors || [];
        console.log("ReturnRequests fetched vendors:", fetchedVendors.length);
        setVendors(fetchedVendors);
      } catch (error) {
        console.error("Failed to fetch vendors:", error);
      }
    };
    fetchVendorsData();
  }, []);

  const cities = useMemo(() => {
    const allCities = vendors.map((v) => {
      if (v.address?.city) return v.address.city;
      if (v.shopAddress && typeof v.shopAddress === 'string') {
        const parts = v.shopAddress.split(',');
        return parts.length > 1 ? parts[parts.length - 2]?.trim() : null;
      }
      return null;
    }).filter(Boolean);
    return [...new Set(allCities)].sort();
  }, [vendors]);

  const filteredVendors = useMemo(() => {
    if (selectedCity === "all") return vendors;
    return vendors.filter((v) => {
      const city = v.address?.city || (v.shopAddress && v.shopAddress.includes(selectedCity) ? selectedCity : null);
      return city === selectedCity;
    });
  }, [vendors, selectedCity]);

  const filteredRequests = useMemo(() => {
    return returnRequests;
  }, [returnRequests]);

  // Handle status update
  const handleStatusUpdate = async (requestId, newStatus, action = '') => {
    const statusData = { status: newStatus };

    if (newStatus === 'approved' && action === 'approve') {
      statusData.refundStatus = 'pending';
    } else if (newStatus === 'completed' && action === 'process-refund') {
      statusData.refundStatus = 'processed';
    }

    await updateReturnStatus(requestId, statusData);
  };

  // Get status badge variant
  const getStatusVariant = (status) => {
    const statusMap = {
      pending: 'pending',
      approved: 'approved',
      rejected: 'rejected',
      processing: 'processing',
      completed: 'completed',
    };
    return statusMap[status] || 'pending';
  };

  // Table columns
  const columns = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      render: (value) => (
        <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-100 whitespace-nowrap">
          #{String(value || "").replace(/^RET-/, "").replace(/^#/, "").slice(-6).toUpperCase()}
        </span>
      ),
    },
    {
      key: 'orderId',
      label: 'Order',
      sortable: true,
      render: (value) => (
        <span
          className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap cursor-pointer hover:bg-indigo-100 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/admin/orders/${value}`);
          }}
        >
          #{String(value || "").replace(/^ORD-/, "").replace(/^#/, "").slice(-6).toUpperCase()}
        </span>
      ),
    },
    {
      key: 'customer',
      label: 'Customer',
      sortable: true,
      render: (value) => (
        <div className="max-w-[180px]">
          <p className="font-medium text-gray-800 truncate" title={value.name}>{value.name}</p>
          <p className="text-xs text-gray-500 truncate" title={value.email}>{value.email}</p>
        </div>
      ),
    },
    {
      key: 'requestDate',
      label: 'Date',
      sortable: true,
      render: (value) => (
        <div className="text-xs whitespace-nowrap">
          <p className="font-medium text-gray-800">{new Date(value).toLocaleDateString()}</p>
          <p className="text-[10px] text-gray-500">{new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      ),
    },
    {
      key: 'items',
      label: 'Items',
      sortable: false,
      render: (value) => {
        const count = Array.isArray(value) ? value.length : 0;
        return <span>{count} item{count !== 1 ? 's' : ''}</span>;
      },
    },
    {
      key: 'reason',
      label: 'Reason',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-700 line-clamp-1 max-w-[150px]" title={value}>{value}</span>
      ),
    },
    {
      key: 'refundAmount',
      label: 'Refund',
      sortable: true,
      render: (value) => (
        <span className="font-bold text-gray-800">{formatCurrency(value)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => <Badge variant={getStatusVariant(value)}>{value}</Badge>,
    },
    {
      key: 'refundStatus',
      label: 'Refund Status',
      sortable: true,
      render: (value) => (
        <Badge variant={value === 'processed' ? 'approved' : value === 'failed' ? 'rejected' : 'pending'}>
          {value || 'none'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/admin/return-requests/${row.id}`)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View Details"
          >
            <FiEye />
          </button>
          {row.status === 'pending' && (
            <>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to approve this return request?')) {
                    handleStatusUpdate(row.id, 'approved', 'approve');
                  }
                }}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Approve"
              >
                <FiCheck />
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to reject this return request?')) {
                    handleStatusUpdate(row.id, 'rejected', 'reject');
                  }
                }}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Reject"
              >
                <FiX />
              </button>
            </>
          )}
          {(row.status === 'approved' || row.status === 'completed') && row.refundStatus === 'pending' && (
            <button
              onClick={() => {
                const isOnline = row.paymentMethod !== 'cod' && row.paymentMethod !== 'manual';
                const msg = isOnline 
                  ? 'Process automated RAZORPAY refund for this return request?'
                  : 'Mark this COD order as refunded? (Requires manual payment/adjustment)';
                
                if (window.confirm(msg)) {
                  handleStatusUpdate(row.id, 'completed', 'process-refund');
                }
              }}
              className={`p-2 rounded-lg transition-colors ${row.paymentMethod !== 'cod' ? 'text-purple-600 hover:bg-purple-50' : 'text-blue-600 hover:bg-blue-50'}`}
              title={row.paymentMethod !== 'cod' ? "Process Razorpay Refund" : "Mark as Refunded"}
            >
              <FiRefreshCw className={row.paymentMethod !== 'cod' ? "animate-spin-slow" : ""} />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Get status counts for stats
  const statusCounts = useMemo(() => {
    return {
      all: filteredRequests.length,
      pending: filteredRequests.filter((r) => r.status === 'pending').length,
      approved: filteredRequests.filter((r) => r.status === 'approved').length,
      processing: filteredRequests.filter((r) => r.status === 'processing').length,
      completed: filteredRequests.filter((r) => r.status === 'completed').length,
      rejected: filteredRequests.filter((r) => r.status === 'rejected').length,
    };
  }, [filteredRequests]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="lg:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Return Requests</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage and process customer return requests</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200">
          <p className="text-xs sm:text-sm text-gray-600 mb-1">Total</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-800">{statusCounts.all}</p>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200">
          <p className="text-xs sm:text-sm text-gray-600 mb-1">Pending</p>
          <p className="text-lg sm:text-2xl font-bold text-yellow-600">{statusCounts.pending}</p>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200">
          <p className="text-xs sm:text-sm text-gray-600 mb-1">Approved</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600">{statusCounts.approved}</p>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200">
          <p className="text-xs sm:text-sm text-gray-600 mb-1">Processing</p>
          <p className="text-lg sm:text-2xl font-bold text-blue-600">{statusCounts.processing}</p>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200">
          <p className="text-xs sm:text-sm text-gray-600 mb-1">Completed</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600">{statusCounts.completed}</p>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200">
          <p className="text-xs sm:text-sm text-gray-600 mb-1">Rejected</p>
          <p className="text-lg sm:text-2xl font-bold text-red-600">{statusCounts.rejected}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
          {/* Search */}
          <div className="relative flex-1 w-full sm:min-w-[200px]">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, order ID, name, or email..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
            />
          </div>

          {/* Status Filter */}
          <AnimatedSelect
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'processing', label: 'Processing' },
              { value: 'completed', label: 'Completed' },
              { value: 'rejected', label: 'Rejected' },
            ]}
            className="w-full sm:w-auto min-w-[140px]"
          />

          <AnimatedSelect
            value={selectedCity}
            onChange={(e) => {
              setSelectedCity(e.target.value);
              setSelectedVendor('all');
            }}
            options={[
              { value: 'all', label: 'All Cities' },
              ...cities.map((city) => ({ value: city, label: city })),
            ]}
            className="w-full sm:w-auto min-w-[140px]"
          />

          <AnimatedSelect
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            options={[
              { value: 'all', label: 'All Vendors' },
              ...filteredVendors.map((v) => ({
                value: v.id || v._id,
                label: v.storeName || v.name || "Unknown Vendor",
              })),
            ]}
            className="w-full sm:w-auto min-w-[160px]"
          />

          {/* Date Filter */}
          <AnimatedSelect
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Time' },
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'Last 7 Days' },
              { value: 'month', label: 'Last 30 Days' },
            ]}
            className="w-full sm:w-auto min-w-[140px]"
          />

          {/* Export Button */}
          <div className="w-full sm:w-auto">
            <ExportButton
              data={filteredRequests}
              headers={[
                { label: 'Return ID', accessor: (row) => row.id },
                { label: 'Order ID', accessor: (row) => row.orderId },
                { label: 'Customer', accessor: (row) => row.customer.name },
                { label: 'Email', accessor: (row) => row.customer.email },
                { label: 'Request Date', accessor: (row) => formatDateTime(row.requestDate) },
                { label: 'Items', accessor: (row) => row.items.length },
                { label: 'Reason', accessor: (row) => row.reason },
                { label: 'Refund Amount', accessor: (row) => formatCurrency(row.refundAmount) },
                { label: 'Status', accessor: (row) => row.status },
              ]}
              filename="return-requests"
            />
          </div>
        </div>
      </div>

      {/* Return Requests Table */}
      {isLoading ? (
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center text-gray-500">
          Loading return requests...
        </div>
      ) : (
        <DataTable
          data={filteredRequests}
          columns={columns}
          pagination={true}
          itemsPerPage={10}
          onRowClick={(row) => navigate(`/admin/return-requests/${row.id}`)}
        />
      )}
    </motion.div>
  );
};

export default ReturnRequests;

