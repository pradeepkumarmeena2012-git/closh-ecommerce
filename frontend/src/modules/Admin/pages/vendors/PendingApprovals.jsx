import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiEye, FiCheckCircle, FiXCircle, FiFileText, FiDownload } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../components/DataTable";
import Badge from "../../../../shared/components/Badge";
import ConfirmModal from "../../components/ConfirmModal";
import { useVendorStore } from "../../store/vendorStore";
import { getAllPendingVendorDocuments, updateVendorDocumentStatus } from "../../services/adminService";
import toast from "react-hot-toast";

const PendingApprovals = () => {
  const navigate = useNavigate();
  const { vendors, updateVendorStatus, initialize } = useVendorStore();

  useEffect(() => {
    initialize();
    loadPendingDocuments();
  }, [initialize]);

  const [activeTab, setActiveTab] = useState("vendors");
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingDocuments, setPendingDocuments] = useState([]);
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    type: null, // 'approve', 'reject', 'approve_doc', 'reject_doc'
    vendorId: null,
    vendorName: null,
    documentId: null,
  });
  const [rejectReason, setRejectReason] = useState("");

  const loadPendingDocuments = async () => {
    try {
      const response = await getAllPendingVendorDocuments();
      setPendingDocuments(response.data || []);
    } catch (error) {
      console.error("Failed to load pending documents", error);
    }
  };

  const pendingVendors = useMemo(() => {
    let filtered = vendors.filter((v) => v.status === "pending");

    if (searchQuery) {
      filtered = filtered.filter(
        (vendor) =>
          vendor.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          vendor.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          vendor.storeName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [vendors, searchQuery]);

  const columns = [
    {
      key: "id",
      label: "ID",
      sortable: true,
    },
    {
      key: "storeName",
      label: "Store Name",
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-3">
          {row.storeLogo && (
            <img
              src={row.storeLogo}
              alt={value}
              className="w-10 h-10 object-cover rounded-lg"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          )}
          <div>
            <span className="font-medium text-gray-800">
              {value || row.name}
            </span>
            <p className="text-xs text-gray-500">{row.name}</p>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
      render: (value) => <span className="text-sm text-gray-700">{value}</span>,
    },
    {
      key: "phone",
      label: "Phone",
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-700">{value || "N/A"}</span>
      ),
    },
    {
      key: "joinDate",
      label: "Registration Date",
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-700">
          {new Date(value).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/vendors/${row.id}`);
            }}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View Details">
            <FiEye />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActionModal({
                isOpen: true,
                type: "approve",
                vendorId: row.id,
                vendorName: row.storeName || row.name,
              });
            }}
            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Approve Vendor">
            <FiCheckCircle />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActionModal({
                isOpen: true,
                type: "reject",
                vendorId: row.id,
                vendorName: row.storeName || row.name,
              });
            }}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Reject Vendor">
            <FiXCircle />
          </button>
        </div>
      ),
    },
  ];

  const documentColumns = [
    {
      key: "vendor",
      label: "Vendor",
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          {row.vendorId?.storeLogo && (
            <img
              src={row.vendorId.storeLogo}
              alt="logo"
              className="w-8 h-8 object-cover rounded-lg"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          )}
          <div>
            <span className="font-medium text-gray-800">{row.vendorId?.storeName || row.vendorId?.name || 'Unknown Vendor'}</span>
            <p className="text-[10px] text-gray-500">{row.vendorId?.email}</p>
          </div>
        </div>
      )
    },
    {
      key: "name",
      label: "Document Name",
      sortable: true,
      render: (value, row) => (
        <div>
          <span className="font-semibold text-gray-800 block text-sm">{value || row.fileName}</span>
          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">
            {row.category || "Other"}
          </span>
        </div>
      )
    },
    {
      key: "date",
      label: "Uploaded",
      sortable: true,
      render: (value, row) => new Date(value || row.uploadedAt || row.createdAt).toLocaleDateString(),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <a
            href={row.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-primary-600 font-bold text-xs hover:underline"
          >
            <FiDownload size={12} /> VIEW
          </a>
          <button
            onClick={() => setActionModal({
              isOpen: true,
              type: "approve_doc",
              vendorId: row.vendorId?._id || row.vendorId,
              vendorName: row.vendorId?.storeName || row.name,
              documentId: row._id || row.id
            })}
            className="flex items-center gap-1 text-green-600 font-bold text-xs hover:underline"
          >
            <FiCheckCircle size={12} /> APPROVE
          </button>
          <button
            onClick={() => setActionModal({
              isOpen: true,
              type: "reject_doc",
              vendorId: row.vendorId?._id || row.vendorId,
              vendorName: row.vendorId?.storeName || row.name,
              documentId: row._id || row.id
            })}
            className="flex items-center gap-1 text-red-600 font-bold text-xs hover:underline"
          >
            <FiXCircle size={12} /> REJECT
          </button>
        </div>
      )
    }
  ];

  const handleApprove = async () => {
    const success = await updateVendorStatus(actionModal.vendorId, "approved");
    if (success) {
      toast.success("Vendor approved successfully");
      setActionModal({
        isOpen: false,
        type: null,
        vendorId: null,
        vendorName: null,
      });
    } else {
      toast.error("Failed to approve vendor");
    }
  };

  const handleReject = async () => {
    const success = await updateVendorStatus(
      actionModal.vendorId,
      "rejected",
      rejectReason.trim()
    );
    if (success) {
      toast.success("Vendor registration rejected");
      setActionModal({
        isOpen: false,
        type: null,
        vendorId: null,
        vendorName: null,
      });
      setRejectReason("");
    } else {
      toast.error("Failed to reject vendor");
    }
  };

  const handleDocumentAction = async (status) => {
    try {
      const response = await updateVendorDocumentStatus(
        actionModal.vendorId,
        actionModal.documentId,
        status,
        status === 'rejected' ? rejectReason.trim() : ''
      );
      if (response.success) {
        toast.success(`Document ${status} successfully.`);
        setPendingDocuments(prev => prev.filter(doc => doc._id !== actionModal.documentId && doc.id !== actionModal.documentId));
        setActionModal({
          isOpen: false,
          type: null,
          vendorId: null,
          vendorName: null,
          documentId: null
        });
        setRejectReason("");
      }
    } catch (error) {
      toast.error(`Failed to ${status === 'rejected' ? 'reject' : 'approve'} document`);
    }
  };

  const getModalContent = () => {
    if (actionModal.type === "approve") {
      return {
        title: "Approve Vendor?",
        message: `Are you sure you want to approve "${actionModal.vendorName}"? They will be able to start selling on the platform.`,
        confirmText: "Approve",
        onConfirm: handleApprove,
        type: "success",
      };
    } else if (actionModal.type === "reject") {
      return {
        title: "Reject Vendor Registration?",
        message: `Are you sure you want to reject "${actionModal.vendorName}"? This action cannot be undone.`,
        confirmText: "Reject",
        onConfirm: handleReject,
        type: "danger",
        customContent: (
          <div className="mt-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Rejection Reason (optional)
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Provide a reason for rejection..."
            />
          </div>
        ),
      };
    } else if (actionModal.type === "approve_doc") {
      return {
        title: "Approve Document?",
        message: `Are you sure you want to approve this document for "${actionModal.vendorName}"?`,
        confirmText: "Approve",
        onConfirm: () => handleDocumentAction("approved"),
        type: "success",
      };
    } else if (actionModal.type === "reject_doc") {
      return {
        title: "Reject Document?",
        message: `Are you sure you want to reject this document for "${actionModal.vendorName}"?`,
        confirmText: "Reject",
        onConfirm: () => handleDocumentAction("rejected"),
        type: "danger",
        customContent: (
          <div className="mt-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Rejection Reason (optional)
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Provide a reason for rejecting the document..."
            />
          </div>
        ),
      };
    }
    return null;
  };

  const modalContent = getModalContent();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="lg:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            Pending Approvals
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Review and approve pending vendor registrations
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">

        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab("vendors")}
            className={`px-6 py-3 font-semibold text-sm transition-colors ${activeTab === "vendors"
              ? "text-primary-600 border-b-2 border-primary-600"
              : "text-gray-600 hover:text-gray-800"
              }`}
          >
            Vendor Registrations ({pendingVendors.length})
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`px-6 py-3 font-semibold text-sm transition-colors ${activeTab === "documents"
              ? "text-primary-600 border-b-2 border-primary-600"
              : "text-gray-600 hover:text-gray-800"
              }`}
          >
            Pending Documents ({pendingDocuments.length})
          </button>
        </div>

        {activeTab === "vendors" && (
          <>
            {/* Search */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search pending vendors..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
                />
              </div>
            </div>

            {/* DataTable */}
            {pendingVendors.length > 0 ? (
              <DataTable
                data={pendingVendors}
                columns={columns}
                pagination={true}
                itemsPerPage={10}
                onRowClick={(row) => navigate(`/admin/vendors/${row.id}`)}
              />
            ) : (
              <div className="text-center py-12">
                <FiCheckCircle className="text-4xl text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No pending approvals</p>
                <p className="text-sm text-gray-400">
                  All vendor registrations have been reviewed
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === "documents" && (
          <>
            {pendingDocuments.length > 0 ? (
              <DataTable
                data={pendingDocuments}
                columns={documentColumns}
                pagination={true}
                itemsPerPage={10}
              />
            ) : (
              <div className="text-center py-12">
                <FiCheckCircle className="text-4xl text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No pending documents</p>
                <p className="text-sm text-gray-400">
                  All uploaded documents have been reviewed
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action Modals */}
      {modalContent && (
        <ConfirmModal
          isOpen={actionModal.isOpen}
          onClose={() => {
            setActionModal({
              isOpen: false,
              type: null,
              vendorId: null,
              vendorName: null,
            });
            setRejectReason("");
          }
          }
          onConfirm={modalContent.onConfirm}
          title={modalContent.title}
          message={modalContent.message}
          confirmText={modalContent.confirmText}
          cancelText="Cancel"
          type={modalContent.type}
          customContent={modalContent.customContent}
        />
      )}
    </motion.div>
  );
};

export default PendingApprovals;
