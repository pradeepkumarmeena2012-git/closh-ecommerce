import { useState, useEffect } from "react";
import {
  FiSearch,
  FiDollarSign,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiRefreshCw
} from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../components/DataTable";
import Pagination from "../../components/Pagination";
import Badge from "../../../../shared/components/Badge";
import { formatCurrency } from "../../utils/adminHelpers";
import api from "../../../../shared/utils/api";
import toast from "react-hot-toast";

const RiderSettlements = () => {
  const [settlements, setSettlements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const fetchSettlements = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/admin/delivery-settlements");
      const data = response.data?.data || [];
      setSettlements(data);
    } catch (error) {
      toast.error("Failed to load settlements");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, []);

  const filteredSettlements = settlements.filter(s => 
    s.deliveryBoyId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.razorpayOrderId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.razorpayPaymentId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    {
      key: "deliveryBoyId",
      label: "Rider",
      render: (boy) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs border border-indigo-100">
            {boy?.name?.charAt(0) || "R"}
          </div>
          <div>
            <p className="font-bold text-gray-800 text-sm whitespace-nowrap">{boy?.name}</p>
            <p className="text-[10px] text-gray-400 font-medium">{boy?.phone}</p>
          </div>
        </div>
      )
    },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      render: (val) => (
        <span className="font-black text-gray-900">{formatCurrency(val)}</span>
      )
    },
    {
      key: "razorpayPaymentId",
      label: "Payment ID",
      render: (val, row) => (
        <div className="space-y-1">
          <p className="text-[10px] font-mono text-gray-500">{val || "N/A"}</p>
          <p className="text-[9px] text-gray-400">Order: {row.razorpayOrderId}</p>
        </div>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (val) => (
        <Badge variant={val === "completed" ? "success" : "warning"}>
          {val.toUpperCase()}
        </Badge>
      )
    },
    {
        key: "createdAt",
        label: "Date",
        sortable: true,
        render: (val) => (
            <div className="text-gray-500 text-xs">
                {new Date(val).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}
                <p className="text-[10px] opacity-60 font-medium">{new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
        )
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl font-black text-gray-900 tracking-tight">Rider Settlements</h1>
           <p className="text-gray-500 mt-1 uppercase text-[10px] font-black tracking-widest">Tracking Online Cash Deposits by Delivery Boys</p>
        </div>
        
        <button 
           onClick={fetchSettlements}
           className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-indigo-600 shadow-sm transition-all active:rotate-180 duration-500"
        >
            <FiRefreshCw className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by rider name, payment ID..."
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-600 transition-all font-medium"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <DataTable
          data={filteredSettlements}
          columns={columns}
          pagination={true}
          isLoading={isLoading}
        />
      </div>
    </motion.div>
  );
};

export default RiderSettlements;
