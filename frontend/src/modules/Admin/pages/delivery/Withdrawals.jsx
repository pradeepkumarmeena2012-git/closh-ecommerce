import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiCheckCircle, FiXCircle, FiTrendingUp, FiCreditCard, FiClock, FiPlus, FiArrowUpRight, FiFilter, FiExternalLink, FiSmartphone } from 'react-icons/fi';
import DataTable from '../../components/DataTable';
import Badge from '../../../../shared/components/Badge';
import { useWithdrawStore } from '../../../../shared/store/withdrawStore';
import { formatPrice, formatDate } from '../../../../shared/utils/helpers';
import AnimatedSelect from '../../components/AnimatedSelect';
import Pagination from '../../components/Pagination';
import toast from 'react-hot-toast';

const Withdrawals = () => {
  const [searchParams] = useSearchParams();
  const { requests, fetchRequests, updateRequestStatus, isLoading } = useWithdrawStore();
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'all');
  const [requestTypeFilter, setRequestTypeFilter] = useState(searchParams.get('requestType') || 'all');
  const [processingId, setProcessingId] = useState(null);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [viewingRequest, setViewingRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [requestCommissions, setRequestCommissions] = useState([]);
  const [isFetchingCommissions, setIsFetchingCommissions] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [txnId, setTxnId] = useState('');
  const [note, setNote] = useState('');

  const { fetchRequestCommissions } = useWithdrawStore();

  useEffect(() => {
    const target = selectedRequest || viewingRequest;
    if (target && target.requestType === 'settlement') {
      const loadCommissions = async () => {
        setIsFetchingCommissions(true);
        const data = await fetchRequestCommissions(target._id);
        setRequestCommissions(data || []);
        setIsFetchingCommissions(false);
      };
      loadCommissions();
    } else {
      setRequestCommissions([]);
    }
  }, [selectedRequest, viewingRequest, fetchRequestCommissions]);

  useEffect(() => {
    setStatusFilter(searchParams.get('status') || 'all');
    setTypeFilter(searchParams.get('type') || 'all');
    setRequestTypeFilter(searchParams.get('requestType') || 'all');
  }, [searchParams]);

  useEffect(() => {
    fetchRequests({
      status: statusFilter === 'all' ? undefined : statusFilter,
      type: typeFilter === 'all' ? undefined : typeFilter,
      requestType: requestTypeFilter === 'all' ? undefined : requestTypeFilter
    });
  }, [statusFilter, typeFilter, requestTypeFilter, fetchRequests]);

  const handleAction = async (row, status) => {
    if (status === 'approved') {
        setSelectedRequest(row);
        setTxnId('');
        setNote(row.adminNotes || '');
        setShowPayoutModal(true);
        return;
    }

    if (status === 'rejected') {
      const reason = window.prompt('Rejection Reason (required):') || '';
      if (!reason.trim()) return;
      
      setProcessingId(row._id);
      await updateRequestStatus(row._id, 'rejected', { adminNotes: reason });
      fetchRequests();
      setProcessingId(null);
    }
  };

  const confirmPayout = async () => {
    setProcessingId(selectedRequest._id);
    const success = await updateRequestStatus(selectedRequest._id, 'approved', { 
        adminNotes: note, 
        transactionId: txnId 
    });
    if (success) {
      setShowPayoutModal(false);
      fetchRequests();
    }
    setProcessingId(null);
  };

  const columns = [
    {
      key: 'requesterId',
      label: 'Requester',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 font-bold uppercase overflow-hidden shadow-inner border border-primary-200">
            {val?.avatar ? <img src={val.avatar} alt="" className="w-full h-full object-cover" /> : (val?.name || val?.storeName || '?').charAt(0)}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{val?.storeName || val?.name || 'Unknown'}</p>
            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">{row.requesterType}</p>
          </div>
        </div>
      )
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (val) => <span className="font-black text-blue-600 text-base">{formatPrice(val)}</span>
    },
    {
      key: 'requestType',
      label: 'Type',
      render: (val) => (
        <Badge 
          variant={val === 'settlement' ? 'info' : 'primary'} 
          className="uppercase text-[9px] font-black tracking-tighter"
        >
          {val || 'withdrawal'}
        </Badge>
      )
    },
    {
      key: 'bankDetails',
      label: 'Payout Info',
      render: (val) => (
        <div className="text-xs space-y-1 min-w-[200px]">
          {val?.upiId && (
            <div className="bg-primary-50 p-2 rounded-lg border border-primary-100 flex items-center gap-2">
              <FiSmartphone className="text-primary-500" />
              <div>
                <p className="text-primary-400 font-bold uppercase text-[8px]">UPI ID</p>
                <p className="text-primary-700 font-black truncate text-xs" title={val.upiId}>{val.upiId}</p>
              </div>
            </div>
          )}
          {val?.accountNumber && (
            <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                <div className="flex justify-between border-b border-gray-100 pb-1 mb-1">
                    <span className="text-gray-400 font-bold text-[8px] uppercase">Bank Transfer</span>
                    <span className="text-gray-900 font-bold text-[10px]">{val.bankName || 'Bank'}</span>
                </div>
                <p className="flex justify-between"><span className="text-gray-400 text-[9px]">NAME:</span> <span className="font-bold text-gray-700 text-[10px]">{val.accountName || val.accountHolderName || 'N/A'}</span></p>
                <p className="flex justify-between"><span className="text-gray-400 text-[9px]">ACC:</span> <span className="font-bold text-gray-700 text-[10px]">{val.accountNumber}</span></p>
                <p className="flex justify-between"><span className="text-gray-400 text-[9px]">IFSC:</span> <span className="font-bold text-gray-700 text-[10px]">{val.ifscCode}</span></p>
            </div>
          )}
        </div>
      )
    },
    {
      key: 'adminNotes',
      label: 'Request Details',
      render: (val) => (
        <div className="max-w-[150px]">
          <p className="text-[10px] text-gray-500 font-bold italic line-clamp-2" title={val}>
            {val || '-'}
          </p>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => {
        let variant = 'warning';
        if (val === 'completed' || val === 'approved') variant = 'success';
        if (val === 'rejected') variant = 'error';
        return <Badge variant={variant} className="capitalize font-bold">{val || 'pending'}</Badge>;
      }
    },
    {
       key: 'actions',
       label: 'Actions',
       render: (_, row) => (
         <div className="flex gap-2">
            <button
                onClick={() => { setViewingRequest(row); setShowDetailsModal(true); }}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                title="View Details"
            >
                <FiExternalLink />
            </button>
            {row.status === 'pending' ? (
              <>
                <button
                  disabled={processingId === row._id}
                  onClick={() => handleAction(row, 'completed')}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-black font-bold text-xs transition-all shadow-lg shadow-slate-100 disabled:opacity-50"
                >
                  <FiCheckCircle className="text-sm" /> Process Payout
                </button>
                <button
                  disabled={processingId === row._id}
                  onClick={() => handleAction(row, 'rejected')}
                  className="flex items-center gap-1.5 px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl font-bold text-xs transition-colors border border-transparent hover:border-red-100 disabled:opacity-50"
                >
                  <FiXCircle className="text-sm" /> Reject
                </button>
              </>
            ) : (
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-emerald-600 font-black uppercase flex items-center gap-1">
                        <FiCheckCircle /> PAID
                    </span>
                    {row.transactionId && <span className="text-[9px] text-gray-400 font-mono">#{row.transactionId}</span>}
                </div>
            )}
         </div>
       )
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700">Withdrawal Requests</h1>
          <p className="text-sm text-gray-500 font-medium mt-1 uppercase tracking-widest flex items-center gap-2">
             <FiCreditCard className="text-primary-500" />
             Payout & Financial Settlements
          </p>
        </div>
        
        <div className="flex gap-2">
            <div className="bg-white px-4 py-3 rounded-2xl flex items-center gap-3 border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner">
                    <FiTrendingUp className="text-lg" />
                </div>
                <div>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Pending Payouts</p>
                    <p className="text-lg font-black text-gray-900">
                        {formatPrice(requests.reduce((acc, r) => r.status === 'pending' ? acc + r.amount : acc, 0))}
                    </p>
                </div>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-wrap gap-4 items-center transition-all">
        <div className="flex items-center gap-2 text-gray-700 font-bold mr-2">
            <FiFilter className="text-primary-500" />
            <span className="text-xs uppercase tracking-widest">Filters</span>
        </div>
        <div className="flex flex-wrap gap-3 flex-1">
          <AnimatedSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved/Completed' },
              { value: 'rejected', label: 'Rejected' },
            ]}
            className="min-w-[140px] text-xs"
          />
          <AnimatedSelect
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Users' },
              { value: 'DeliveryBoy', label: 'Delivery Boys' },
              { value: 'Vendor', label: 'Vendors' },
            ]}
            className="min-w-[140px] text-xs"
          />
          <AnimatedSelect
            value={requestTypeFilter}
            onChange={(e) => setRequestTypeFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'settlement', label: 'Settlements' },
              { value: 'withdrawal', label: 'Withdrawals' },
            ]}
            className="min-w-[140px] text-xs"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl overflow-hidden shadow-2xl shadow-gray-200/50 border border-gray-100/80">
        <div className="p-1">
          <DataTable
            data={requests}
            columns={columns}
            pagination={false}
            loading={isLoading}
            emptyMessage="No withdrawal requests found."
          />
        </div>
      </div>
      
      {requests.length > 0 && (
         <div className="flex justify-between items-center px-4 py-2 bg-gray-50 rounded-2xl border border-gray-200 text-[10px]">
            <p className="text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                <FiClock /> Processed requests are automatically archived
            </p>
            <p className="text-gray-400 font-black">Total: {requests.length}</p>
         </div>
      )}

      {/* Payout Processor Modal */}
      <AnimatePresence>
        {showPayoutModal && selectedRequest && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[95vh]"
                >
                    <div className="p-6 bg-slate-900 text-white shrink-0">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-2xl font-black">Payout Processor</h3>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Review & Confirm Payment</p>
                            </div>
                            <button 
                                onClick={() => setShowPayoutModal(false)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <FiXCircle className="text-2xl" />
                            </button>
                        </div>

                        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex flex-col items-center">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2">Amount to Pay</p>
                            <h2 className="text-3xl font-black text-white">{formatPrice(selectedRequest.amount)}</h2>
                        </div>
                    </div>

                    <div className="p-4 md:p-6 space-y-4 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Beneficiary</p>
                                <p className="font-bold text-gray-900 truncate">{selectedRequest.requesterId?.storeName || selectedRequest.requesterId?.name}</p>
                                <p className="text-[10px] text-gray-500 font-medium italic">{selectedRequest.requesterType}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Purpose</p>
                                <p className="font-bold text-blue-600 uppercase text-xs">{selectedRequest.requestType || 'Withdrawal'}</p>
                                <p className="text-[10px] text-gray-500 font-medium italic truncate">{selectedRequest.adminNotes}</p>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
                            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <FiCreditCard /> Payout Account Details
                            </h4>
                            <div className="space-y-3">
                                {selectedRequest.bankDetails?.upiId ? (
                                    <div className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-blue-100">
                                        <span className="text-xs font-bold text-gray-400 uppercase">UPI ID</span>
                                        <span className="font-black text-blue-600 text-sm select-all">{selectedRequest.bankDetails.upiId}</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-blue-100">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Account Name</span>
                                            <span className="font-bold text-gray-700 text-xs">{selectedRequest.bankDetails?.accountName || selectedRequest.bankDetails?.accountHolderName}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-blue-100">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Account No</span>
                                            <span className="font-black text-gray-900 text-xs select-all font-mono">{selectedRequest.bankDetails?.accountNumber}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-blue-100">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">IFSC Code</span>
                                            <span className="font-bold text-blue-600 text-xs select-all">{selectedRequest.bankDetails?.ifscCode}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {selectedRequest.requestType === 'settlement' && (
                            <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <FiClock /> Included Orders ({requestCommissions.length})
                                </h4>
                                <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                                    {isFetchingCommissions ? (
                                        <div className="py-4 text-center text-xs text-gray-400 animate-pulse">Loading orders...</div>
                                    ) : requestCommissions.length > 0 ? (
                                        requestCommissions.map(comm => (
                                            <div key={comm._id} className="flex justify-between items-center bg-white p-2 rounded-xl border border-gray-100 shadow-sm hover:border-primary-200 transition-colors">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-gray-800">#{comm.orderId?.orderId || comm._id.slice(-8)}</span>
                                                    <span className="text-[9px] text-gray-400 font-medium">{new Date(comm.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs font-black text-emerald-600">{formatPrice(comm.vendorEarnings)}</span>
                                                    <div className="flex gap-1 justify-end">
                                                        <Badge variant="info" className="text-[8px] px-1 py-0">{comm.orderId?.status}</Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-4 text-center text-xs text-gray-400">No linked orders found.</div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="space-y-4 pt-2">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Transaction ID / Reference (Leave empty for automated Razorpay payout)</label>
                                <input 
                                    type="text"
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-mono text-sm"
                                    placeholder="TXN-XXXX-XXXX-XXXX"
                                    value={txnId}
                                    onChange={(e) => setTxnId(e.target.value)}
                                />
                                <p className="text-[10px] text-blue-500 mt-2 font-medium italic">
                                    Note: If you leave this empty, the system will attempt to pay the user via Razorpay UPI automatically.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button 
                                onClick={() => setShowPayoutModal(false)}
                                className="flex-1 py-4 bg-gray-100 text-gray-500 font-black rounded-2xl hover:bg-gray-200 transition-all text-xs uppercase tracking-widest"
                            >
                                Cancel
                            </button>
                            <button 
                                disabled={processingId}
                                onClick={confirmPayout}
                                className="flex-[2] py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-black transition-all text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-slate-200"
                            >
                                {processingId ? 'Processing...' : (txnId ? 'Mark as Paid Manually' : 'Try Automated Payout')}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* Request Details Modal */}
      <AnimatePresence>
        {showDetailsModal && viewingRequest && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-900/20 text-2xl font-black">
                    {viewingRequest.requesterId?.avatar ? (
                      <img src={viewingRequest.requesterId.avatar} className="w-full h-full object-cover" />
                    ) : (viewingRequest.requesterId?.storeName || viewingRequest.requesterId?.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">{viewingRequest.requesterId?.storeName || viewingRequest.requesterId?.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                       <Badge variant={viewingRequest.requestType === 'settlement' ? 'info' : 'primary'} className="text-[9px] uppercase font-black">{viewingRequest.requestType || 'withdrawal'}</Badge>
                       <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{viewingRequest.requesterType}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                  <FiXCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-8">
                   <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Request Amount</p>
                      <h4 className="text-3xl font-black text-blue-600">{formatPrice(viewingRequest.amount)}</h4>
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Current Status</p>
                      <Badge variant={viewingRequest.status === 'approved' || viewingRequest.status === 'completed' ? 'success' : viewingRequest.status === 'rejected' ? 'error' : 'warning'} className="text-xs px-4 py-1 font-bold">
                        {viewingRequest.status?.toUpperCase() || 'PENDING'}
                      </Badge>
                   </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                   <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Phone</p>
                      <p className="text-sm font-bold text-gray-700">{viewingRequest.requesterId?.phone || 'N/A'}</p>
                   </div>
                   <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Email</p>
                      <p className="text-sm font-bold text-gray-700">{viewingRequest.requesterId?.email || 'N/A'}</p>
                   </div>
                </div>

                {/* Payout Details */}
                <div className="space-y-4">
                   <h5 className="text-xs font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                     <FiCreditCard className="text-primary-500" /> Payout Destination
                   </h5>
                   <div className="grid grid-cols-1 gap-3">
                      {viewingRequest.bankDetails?.upiId ? (
                         <div className="flex justify-between items-center bg-white p-4 rounded-2xl border-2 border-primary-50 shadow-sm">
                            <span className="text-[10px] font-black text-primary-400 uppercase">UPI ID</span>
                            <span className="font-black text-primary-600 text-lg select-all">{viewingRequest.bankDetails.upiId}</span>
                         </div>
                      ) : (
                         <div className="space-y-2">
                            <div className="flex justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                               <span className="text-[10px] font-bold text-gray-400 uppercase">Account Holder</span>
                               <span className="font-bold text-gray-800 text-sm">{viewingRequest.bankDetails?.accountName || viewingRequest.bankDetails?.accountHolderName || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                               <span className="text-[10px] font-bold text-gray-400 uppercase">Account No</span>
                               <span className="font-black text-gray-900 text-sm font-mono select-all">{viewingRequest.bankDetails?.accountNumber}</span>
                            </div>
                            <div className="flex justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                               <span className="text-[10px] font-bold text-gray-400 uppercase">Bank / IFSC</span>
                               <span className="font-bold text-blue-600 text-sm">{viewingRequest.bankDetails?.bankName} ({viewingRequest.bankDetails?.ifscCode})</span>
                            </div>
                         </div>
                      )}
                   </div>
                </div>

                {/* Associated Orders (If Settlement) */}
                {viewingRequest.requestType === 'settlement' && (
                  <div className="space-y-4">
                     <h5 className="text-xs font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                       <FiClock className="text-amber-500" /> Order Breakdown ({requestCommissions.length})
                     </h5>
                     <div className="bg-gray-50 rounded-2xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                        {isFetchingCommissions ? (
                           <div className="p-8 text-center text-gray-400 text-sm animate-pulse">Fetching order records...</div>
                        ) : requestCommissions.length > 0 ? (
                           requestCommissions.map(comm => (
                              <div key={comm._id} className="p-4 flex justify-between items-center bg-white hover:bg-gray-50/50 transition-colors">
                                 <div>
                                    <p className="text-xs font-black text-gray-800">#{comm.orderId?.orderId || comm._id.slice(-8)}</p>
                                    <p className="text-[9px] text-gray-400 font-bold">{new Date(comm.createdAt).toLocaleString()}</p>
                                 </div>
                                 <div className="text-right">
                                    <p className="text-sm font-black text-emerald-600">{formatPrice(comm.vendorEarnings)}</p>
                                    <p className="text-[8px] font-black text-gray-300 uppercase">ORDER {comm.orderId?.status}</p>
                                 </div>
                              </div>
                           ))
                        ) : (
                           <div className="p-8 text-center text-gray-400 text-sm italic">No individual order records found.</div>
                        )}
                     </div>
                  </div>
                )}

                {/* Admin Notes / History */}
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Request Metadata</p>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400">Created At:</span>
                            <span className="font-bold text-slate-700">{formatDate(viewingRequest.createdAt)}</span>
                        </div>
                        {viewingRequest.processedAt && (
                           <div className="flex justify-between items-center text-xs">
                               <span className="text-slate-400">Processed At:</span>
                               <span className="font-bold text-slate-700">{formatDate(viewingRequest.processedAt)}</span>
                           </div>
                        )}
                        {viewingRequest.transactionId && (
                           <div className="flex justify-between items-center text-xs">
                               <span className="text-slate-400">Transaction ID:</span>
                               <span className="font-black text-blue-600 select-all">{viewingRequest.transactionId}</span>
                           </div>
                        )}
                        <div className="pt-3 border-t border-slate-200">
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Internal Notes</p>
                            <p className="text-xs text-slate-600 font-medium italic">{viewingRequest.adminNotes || 'No notes available.'}</p>
                        </div>
                    </div>
                </div>
              </div>

              <div className="p-6 bg-white border-t border-gray-100 flex justify-end gap-3">
                 <button 
                   onClick={() => setShowDetailsModal(false)}
                   className="px-8 py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-colors text-sm"
                 >
                   Close Details
                 </button>
                 {viewingRequest.status === 'pending' && (
                    <button 
                      onClick={() => {
                        setShowDetailsModal(false);
                        handleAction(viewingRequest, 'approved');
                      }}
                      className="px-8 py-3 bg-primary-600 text-white font-bold rounded-2xl shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all text-sm"
                    >
                      Process Payout
                    </button>
                 )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};

export default Withdrawals;
