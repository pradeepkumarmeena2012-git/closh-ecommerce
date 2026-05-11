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
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [txnId, setTxnId] = useState('');
  const [note, setNote] = useState('');

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
            {row.status === 'pending' ? (
              <>
                <button
                  disabled={processingId === row._id}
                  onClick={() => handleAction(row, 'approved')}
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
                    className="bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl"
                >
                    <div className="p-8 bg-slate-900 text-white">
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

                        <div className="bg-white/5 rounded-3xl p-6 border border-white/10 flex flex-col items-center">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2">Amount to Pay</p>
                            <h2 className="text-5xl font-black text-white">{formatPrice(selectedRequest.amount)}</h2>
                        </div>
                    </div>

                    <div className="p-8 space-y-6">
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

                        <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl">
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

                        <div className="space-y-4 pt-2">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Transaction ID / Reference (Required for tracking)</label>
                                <input 
                                    type="text"
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-mono text-sm"
                                    placeholder="TXN-XXXX-XXXX-XXXX"
                                    value={txnId}
                                    onChange={(e) => setTxnId(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button 
                                onClick={() => setShowPayoutModal(false)}
                                className="flex-1 py-4 bg-gray-100 text-gray-500 font-black rounded-2xl hover:bg-gray-200 transition-all text-xs uppercase tracking-widest"
                            >
                                Cancel
                            </button>
                            <button 
                                disabled={!txnId || processingId}
                                onClick={confirmPayout}
                                className="flex-[2] py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-black transition-all text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-slate-200"
                            >
                                {processingId ? 'Processing...' : 'Mark as Paid & Close'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Withdrawals;
