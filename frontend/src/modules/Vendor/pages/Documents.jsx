import { useState, useEffect, useCallback } from "react";
import { FiFile, FiUpload, FiDownload, FiTrash2, FiX } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../Admin/components/DataTable";
import ConfirmModal from "../../Admin/components/ConfirmModal";
import Badge from "../../../shared/components/Badge";
import { useVendorAuthStore } from "../store/vendorAuthStore";
import {
  getVendorDocuments,
  uploadVendorDocument,
  deleteVendorDocument,
} from "../services/vendorService";
import toast from "react-hot-toast";

const Documents = () => {
  const { vendor } = useVendorAuthStore();
  const [documents, setDocuments] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [showUpload, setShowUpload] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const vendorId = vendor?.id || vendor?._id;

  const fetchDocuments = useCallback(async () => {
    if (!vendorId) return;
    setIsLoading(true);
    try {
      const res = await getVendorDocuments();
      const data = res?.data ?? res;
      setDocuments(Array.isArray(data) ? data : []);
    } finally {
      setIsLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = async (docData, file) => {
    setIsSaving(true);
    try {
      await uploadVendorDocument(docData, file);
      setShowUpload(false);
      toast.success("Document uploaded");
      fetchDocuments();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.id) return;
    setIsSaving(true);
    try {
      await deleteVendorDocument(deleteModal.id);
      setDeleteModal({ isOpen: false, id: null });
      toast.success("Document deleted");
      fetchDocuments();
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    { key: "name", label: "Document Name", sortable: true },
    { key: "category", label: "Category", sortable: true },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <Badge
          variant={
            value === "approved"
              ? "success"
              : value === "rejected"
                ? "error"
                : "warning"
          }
        >
          {value}
        </Badge>
      ),
    },
    {
      key: "expiryDate",
      label: "Expiry Date",
      render: (value) => (value ? new Date(value).toLocaleDateString() : "N/A"),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex gap-2">
          <button
            onClick={() => window.open(row.fileUrl, "_blank")}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
            title="Download"
          >
            <FiDownload />
          </button>
          <button
            onClick={() => setDeleteModal({ isOpen: true, id: row._id })}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
            title="Delete"
          >
            <FiTrash2 />
          </button>
        </div>
      ),
    },
  ];

  if (!vendorId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please log in to view documents</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="lg:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            <FiFile className="text-primary-600" />
            Documents
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Manage business documents and certificates
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
        >
          <FiUpload />
          <span>Upload Document</span>
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">Loading documents...</p>
        </div>
      ) : (
        <DataTable data={documents} columns={columns} pagination={true} />
      )}

      {showUpload && (
        <DocumentUploadForm
          onSave={handleUpload}
          onClose={() => setShowUpload(false)}
          isSaving={isSaving}
        />
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={handleDelete}
        title="Delete Document"
        message="Are you sure you want to delete this document?"
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </motion.div>
  );
};

const DocumentUploadForm = ({ onSave, onClose, isSaving }) => {
  const [formData, setFormData] = useState({
    name: "",
    category: "License",
    expiryDate: "",
  });
  const [file, setFile] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a file");
      return;
    }
    onSave(formData, file);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm">
      <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden border border-emerald-50">
        {/* Fixed Header */}
        <div className="p-5 md:p-6 border-b border-gray-100 flex items-center justify-between bg-white z-10">
          <h3 className="text-lg md:text-xl font-black text-gray-800 tracking-tight">Upload Document</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-xl transition-colors"><FiX className="text-gray-500" /></button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 md:p-8 no-scrollbar">
          <form id="docUploadForm" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Document Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. GST Certificate"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500"
              >
                <option>License</option>
                <option>Certificate</option>
                <option>Tax Document</option>
                <option>Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">
                Expiry Date (optional)
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
                onKeyDown={(e) => e.preventDefault()}
                className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Upload File</label>
              <div className="relative border-2 border-dashed border-emerald-100 rounded-xl bg-emerald-50/10 p-6 text-center cursor-pointer hover:border-emerald-300 transition-all">
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-2">
                  <FiUpload className="text-emerald-400" size={24} />
                  <p className="text-xs font-black text-gray-600">{file ? file.name : "Click to select or drag PDF/Image"}</p>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="p-5 md:p-6 border-t border-gray-100 bg-white z-10 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-4 bg-gray-50 text-gray-600 font-black rounded-xl hover:bg-gray-100 transition-all text-xs uppercase tracking-widest"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="docUploadForm"
            disabled={isSaving}
            className="flex-1 py-4 bg-[#003d29] text-white font-black rounded-xl shadow-xl shadow-emerald-900/10 hover:bg-[#002a1c] transition-all text-xs uppercase tracking-widest disabled:opacity-50"
          >
            {isSaving ? "Uploading..." : "Upload Now"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Documents;
