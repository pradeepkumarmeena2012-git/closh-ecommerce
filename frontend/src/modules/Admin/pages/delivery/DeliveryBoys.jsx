import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiMapPin, FiPhone, FiFileText, FiCreditCard, FiCheckCircle, FiXCircle, FiClock, FiAlertCircle, FiSmartphone, FiTruck } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import DataTable from '../../components/DataTable';
import Badge from '../../../../shared/components/Badge';
import ConfirmModal from '../../components/ConfirmModal';
import AnimatedSelect from '../../components/AnimatedSelect';
import Pagination from '../../components/Pagination';
import { useDeliveryStore } from '../../../../shared/store/deliveryStore';
import socketService from '../../../../shared/utils/socket';
import toast from 'react-hot-toast';

const DeliveryBoys = () => {
    const location = useLocation();
    const isAppRoute = location.pathname.startsWith('/app');
    const {
        deliveryBoys,
        fetchDeliveryBoys,
        addDeliveryBoy,
        updateStatus,
        updateApplicationStatus,
        updateKycStatus,
        updateDeliveryBoyDetail,
        removeDeliveryBoy,
        pagination
    } = useDeliveryStore();

    const [activeTab, setActiveTab] = useState('all'); // all, registrations, kyc
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [editingBoy, setEditingBoy] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        const params = {
            search: searchQuery,
            status: statusFilter === 'all' ? undefined : statusFilter,
            applicationStatus: activeTab === 'registrations' ? 'pending' : (activeTab === 'all' ? 'approved' : undefined),
            kycStatus: activeTab === 'kyc' ? 'pending' : undefined,
            page: currentPage,
            limit: itemsPerPage
        };
        fetchDeliveryBoys(params);
    }, [searchQuery, statusFilter, activeTab, currentPage, fetchDeliveryBoys]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter, activeTab]);

    // Real-time
    useEffect(() => {
        socketService.connect();
        const doJoin = () => socketService.joinRoom('admin_delivery');
        if (socketService.socket?.connected) doJoin();
        else socketService.socket?.once('connect', doJoin);

        const handleNewRegistration = (data) => {
            toast(`🛵 New delivery boy applied: "${data.name}"`, { icon: '📝' });
            fetchDeliveryBoys({
                search: searchQuery,
                status: statusFilter === 'all' ? undefined : statusFilter,
                applicationStatus: activeTab === 'registrations' ? 'pending' : (activeTab === 'all' ? 'approved' : undefined),
                kycStatus: activeTab === 'kyc' ? 'pending' : undefined,
                page: currentPage,
                limit: itemsPerPage
            });
        };

        socketService.on('new_delivery_boy', handleNewRegistration);
        return () => socketService.off('new_delivery_boy', handleNewRegistration);
    }, [fetchDeliveryBoys, searchQuery, statusFilter, activeTab, currentPage, itemsPerPage]);

    const handleSave = async (boyData) => {
        const currentApplicationStatus = (editingBoy && editingBoy.applicationStatus) || boyData.applicationStatus || 'approved';
        const payload = {
            ...boyData,
            isActive: currentApplicationStatus === 'approved' && boyData.status === 'active',
        };
        if (editingBoy && editingBoy.id) {
            const success = await updateDeliveryBoyDetail(editingBoy.id, payload);
            if (success) setEditingBoy(null);
        } else {
            const success = await addDeliveryBoy(payload);
            if (success) setEditingBoy(null);
        }
    };

    const handleDelete = async () => {
        const success = await removeDeliveryBoy(deleteModal.id);
        if (success) setDeleteModal({ isOpen: false, id: null });
    };

    const handleApplicationAction = async (row, nextStatus) => {
        const reason = nextStatus === 'rejected' ? (window.prompt('Enter rejection reason:') || '').trim() : '';
        if (nextStatus === 'rejected' && !reason) return;
        await updateApplicationStatus(row.id, nextStatus, reason);
    };

    const handleKycAction = async (row, nextStatus) => {
        const reason = nextStatus === 'rejected' ? (window.prompt('Enter rejection reason for KYC:') || '').trim() : '';
        if (nextStatus === 'rejected' && !reason) return;
        await updateKycStatus(row.id, nextStatus, reason);
    };

    const renderApplicationBadge = (value) => {
        if (value === 'approved') return <Badge variant="success">approved</Badge>;
        if (value === 'rejected') return <Badge variant="error">rejected</Badge>;
        return <Badge variant="warning">pending</Badge>;
    };

    const renderKycBadge = (value) => {
        if (value === 'verified') return <Badge variant="success">Verified</Badge>;
        if (value === 'rejected') return <Badge variant="error">KYC Rejected</Badge>;
        if (value === 'pending') return <Badge variant="warning">KYC Pending</Badge>;
        return <Badge variant="info">None</Badge>;
    };

    const columns = [
        {
            key: 'name',
            label: 'Partner Details',
            render: (_, row) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-100 shadow-sm">
                        <img 
                          src={row.avatar || `https://ui-avatars.com/api/?name=${row.name}&background=6366f1&color=fff`} 
                          alt={row.name} 
                          className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="font-black text-gray-800 text-sm truncate">{row.name}</span>
                        <span className="text-[10px] text-gray-400 font-bold tracking-tight">{row.phone}</span>
                        <span className="text-[10px] text-indigo-500 opacity-60 truncate max-w-[120px]">{row.email}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'vehicle',
            label: 'Vehicle',
            render: (_, row) => (
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-700">{row.vehicleType}</span>
                    <span className="text-[10px] text-gray-500">{row.vehicleNumber}</span>
                </div>
            ),
        },
        {
          key: 'bank',
          label: 'Banking Info',
          render: (_, row) => (
            row.bankDetails?.accountNumber ? (
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-indigo-600 uppercase leading-none">{row.bankDetails.bankName || 'Partner Bank'}</span>
                <span className="text-xs font-bold text-gray-800 tracking-tighter">A/c: ****{row.bankDetails.accountNumber.slice(-4)}</span>
                <span className="text-[10px] text-gray-400 font-mono italic">IFSC: {row.bankDetails.ifscCode}</span>
              </div>
            ) : <span className="text-[10px] text-gray-300 italic">No details</span>
          )
        },
        {
            key: 'kycStatus',
            label: 'Bank KYC',
            render: (value) => renderKycBadge(value),
        },
        {
            key: 'applicationStatus',
            label: 'Account Status',
            render: (value, row) => (
                <div className="flex flex-col gap-1">
                    {renderApplicationBadge(value)}
                    <Badge variant={row.isActive ? 'success' : 'error'}>
                      {row.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                </div>
            ),
        },
        {
            key: 'actions',
            label: 'Management',
            render: (_, row) => (
                <div className="flex flex-wrap items-center gap-1.5 min-w-[200px]">
                    {row.applicationStatus === 'pending' && (
                        <div className="flex gap-1 w-full mb-1">
                          <button onClick={() => handleApplicationAction(row, 'approved')} className="flex-1 px-2 py-1 bg-green-500 text-white rounded text-[10px] font-black uppercase tracking-widest hover:bg-green-600 transition-all">Approve Reg</button>
                          <button onClick={() => handleApplicationAction(row, 'rejected')} className="flex-1 px-2 py-1 bg-red-500 text-white rounded text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all">Reject Reg</button>
                        </div>
                    )}
                    {row.kycStatus === 'pending' && (
                        <div className="flex gap-1 w-full mb-1">
                          <button onClick={() => handleKycAction(row, 'verified')} className="flex-1 px-2 py-1 bg-indigo-600 text-white rounded text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-glow-indigo">Approve KYC</button>
                          <button onClick={() => handleKycAction(row, 'rejected')} className="flex-1 px-2 py-1 bg-amber-500 text-white rounded text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all">Reject KYC</button>
                        </div>
                    )}
                    <div className="flex gap-1">
                      <button onClick={() => setEditingBoy(row)} className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"><FiEdit size={12} /></button>
                      <button onClick={() => updateStatus(row.id, !row.isActive)} className={`p-1.5 rounded transition-all ${row.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>{row.isActive ? <FiXCircle size={12} /> : <FiCheckCircle size={12} />}</button>
                      <button onClick={() => setDeleteModal({ isOpen: true, id: row.id })} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100"><FiTrash2 size={12} /></button>
                    </div>
                </div>
            ),
        },
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-800 tracking-tight">Delivery Partners</h1>
                    <p className="text-sm text-gray-500">Manage registrations and KYC verifications</p>
                </div>
                <button
                    onClick={() => setEditingBoy({ name: '', phone: '', email: '', password: '', address: '', vehicleType: 'Bike', vehicleNumber: '', status: 'active', totalDeliveries: 0, rating: 0 })}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-200"
                >
                    <FiPlus />
                    <span>Add Partner</span>
                </button>
            </div>

            {/* Stats / Tabs */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: 'All Partners', icon: FiTruck },
                  { id: 'kyc', label: 'KYC Requests', icon: FiCreditCard, color: 'text-amber-600' },
                  { id: 'registrations', label: 'Applications', icon: FiClock, color: 'text-indigo-600' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <tab.icon size={16} className={activeTab === tab.id ? 'text-indigo-600' : tab.color || ''} />
                    {tab.label}
                  </button>
                ))}
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name, phone, or vehicle..."
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                        />
                    </div>
                    {activeTab === 'all' && (
                      <AnimatedSelect
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        options={[{ value: 'all', label: 'Availability: All' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
                        className="min-w-[180px]"
                      />
                    )}
                </div>

                <div className="overflow-hidden no-scrollbar">
                    <DataTable data={deliveryBoys} columns={columns} pagination={false} />
                </div>
                
                <Pagination
                    currentPage={currentPage}
                    totalPages={pagination.pages}
                    totalItems={pagination.total}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    className="mt-6"
                />
            </div>

            <AnimatePresence>
                {editingBoy !== null && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingBoy(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative z-10 no-scrollbar"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 overflow-hidden border-2 border-indigo-100 shadow-lg shrink-0">
                                    <img 
                                      src={editingBoy.avatar || `https://ui-avatars.com/api/?name=${editingBoy.name}&background=6366f1&color=fff`} 
                                      className="w-full h-full object-cover" 
                                      alt="Avatar" 
                                    />
                                  </div>
                                  <div>
                                    <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter">
                                        {editingBoy.id ? editingBoy.name : 'New Partnership'}
                                    </h3>
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest opacity-60">Partner Identity Verified</p>
                                  </div>
                                </div>
                                <button onClick={() => setEditingBoy(null)} className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all"><FiXCircle size={20} /></button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              {/* Left Side: Basic Info */}
                              <div className="space-y-6">
                                <section>
                                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Account Essentials</h4>
                                  <div className="space-y-3">
                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Full Name</p>
                                      <p className="text-sm font-bold text-gray-800">{editingBoy.name || 'N/A'}</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Email & Phone</p>
                                      <p className="text-sm font-bold text-gray-800">{editingBoy.email}</p>
                                      <p className="text-sm font-bold text-gray-800">{editingBoy.phone}</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Vehicle Details</p>
                                      <p className="text-sm font-bold text-gray-800">{editingBoy.vehicleType} - {editingBoy.vehicleNumber}</p>
                                    </div>
                                  </div>
                                </section>

                                {editingBoy.documentUrls && (
                                  <section>
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Registration Documents</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                      {Object.entries(editingBoy.documentUrls).map(([key, url]) => url && (
                                        <a key={key} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-all group">
                                          <FiFileText className="group-hover:scale-110 transition-transform" />
                                          <span className="text-[10px] font-black uppercase tracking-tight">{key.replace(/([A-Z])/g, ' $1')}</span>
                                        </a>
                                      ))}
                                    </div>
                                  </section>
                                )}
                              </div>

                              {/* Right Side: Banking & KYC */}
                              <div className="space-y-6">
                                <section>
                                  <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Banking & Payout KYC</h4>
                                    {renderKycBadge(editingBoy.kycStatus)}
                                  </div>
                                  
                                  {editingBoy.bankDetails?.accountNumber ? (
                                    <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
                                      <FiCreditCard className="absolute -right-4 -bottom-4 text-white/10" size={120} />
                                      <div className="relative z-10">
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-4">Primary Settlement Bank</p>
                                        <p className="text-xl font-black mb-1">{editingBoy.bankDetails.bankName}</p>
                                        <p className="text-sm font-mono tracking-widest mb-6">{editingBoy.bankDetails.accountNumber.replace(/(.{4})/g, '$1 ')}</p>
                                        
                                        <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-4">
                                          <div>
                                            <p className="text-[8px] font-black uppercase opacity-60">IFSC Code</p>
                                            <p className="text-xs font-bold font-mono uppercase">{editingBoy.bankDetails.ifscCode}</p>
                                          </div>
                                          <div>
                                            <p className="text-[8px] font-black uppercase opacity-60">Holder Name</p>
                                            <p className="text-xs font-bold uppercase">{editingBoy.bankDetails.accountHolderName}</p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="p-8 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 text-center">
                                      <FiAlertCircle size={32} className="mx-auto text-gray-300 mb-3" />
                                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No Bank Details Provided</p>
                                    </div>
                                  )}

                                  {editingBoy.upiId && (
                                    <div className="mt-4 p-4 bg-rose-50 rounded-2xl border border-rose-100 flex items-center justify-between">
                                      <div>
                                        <p className="text-[8px] font-black text-rose-400 uppercase mb-0.5">UPI Settlement ID</p>
                                        <p className="text-xs font-black text-rose-600 break-all">{editingBoy.upiId}</p>
                                      </div>
                                      <FiSmartphone className="text-rose-300" size={24} />
                                    </div>
                                  )}
                                </section>

                                {editingBoy.kycStatus === 'pending' && (
                                  <div className="space-y-3 pt-4 border-t border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Review KYC Submission</p>
                                    <button onClick={() => { handleKycAction(editingBoy, 'verified'); setEditingBoy(null); }} className="w-full py-4 bg-green-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-green-100 active:scale-95 transition-all">Verify Banking Details</button>
                                    <button onClick={() => { handleKycAction(editingBoy, 'rejected'); setEditingBoy(null); }} className="w-full py-4 bg-red-50 text-red-500 rounded-2xl font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition-all">Reject Submission</button>
                                  </div>
                                )}
                                
                                {editingBoy.applicationStatus === 'pending' && (
                                  <div className="space-y-3 pt-4 border-t border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Review Registration</p>
                                    <button onClick={() => { handleApplicationAction(editingBoy, 'approved'); setEditingBoy(null); }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-indigo-100 active:scale-95 transition-all">Approve Account</button>
                                    <button onClick={() => { handleApplicationAction(editingBoy, 'rejected'); setEditingBoy(null); }} className="w-full py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition-all">Deny Registration</button>
                                  </div>
                                )}
                              </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, id: null })}
                onConfirm={handleDelete}
                title="Remove Delivery Partner?"
                message="This will permanently delete this partner's profile and history. This action cannot be reversed."
                confirmText="Confirm Deletion"
                cancelText="Keep Partner"
                type="danger"
            />
        </motion.div>
    );
};

export default DeliveryBoys;
