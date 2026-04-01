import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiPlus, FiUpload, FiDownload, FiTrash2, FiEdit2, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../../../shared/utils/api';

const PincodeModal = ({ isOpen, onClose, serviceArea }) => {
  const [pincodes, setPincodes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPincode, setNewPincode] = useState({
    pincode: '',
    locality: '',
    deliveryZone: ''
  });

  useEffect(() => {
    if (isOpen && serviceArea) {
      loadPincodes();
    }
  }, [isOpen, serviceArea]);

  const loadPincodes = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/admin/service-areas/${serviceArea._id}/pincodes`);
      setPincodes(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load pincodes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSingle = async () => {
    if (!newPincode.pincode) {
      toast.error('Pincode is required');
      return;
    }

    try {
      await api.post('/admin/pincodes', {
        serviceAreaId: serviceArea._id,
        ...newPincode
      });
      toast.success('Pincode added successfully');
      setNewPincode({ pincode: '', locality: '', deliveryZone: '' });
      setShowAddForm(false);
      loadPincodes();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add pincode');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this pincode?')) return;

    try {
      await api.delete(`/admin/pincodes/${id}`);
      toast.success('Pincode deleted');
      loadPincodes();
    } catch (error) {
      toast.error('Failed to delete pincode');
    }
  };

  const handleBulkImport = () => {
    const csvExample = `pincode,locality,zone
302001,Jaipur City,Zone A
302002,Civil Lines,Zone A
302015,Malviya Nagar,Zone B`;
    
    const blob = new Blob([csvExample], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pincode_template.csv';
    a.click();
    
    toast.success('Template downloaded! Fill it and import via admin panel');
  };

  const filteredPincodes = pincodes.filter(p => 
    p.pincode.includes(searchTerm) || 
    (p.locality && p.locality.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Manage Pincodes</h2>
                <p className="text-blue-100 text-sm mt-1">
                  {serviceArea?.name}, {serviceArea?.state}
                </p>
              </div>
              <button onClick={onClose} className="text-white/80 hover:text-white">
                <FiX className="text-2xl" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Actions Bar */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search pincode or locality..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <FiPlus />
                Add Pincode
              </button>
              
              <button
                onClick={handleBulkImport}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                title="Download CSV template"
              >
                <FiDownload />
                CSV Template
              </button>
            </div>

            {/* Add Form */}
            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-gray-50 p-4 rounded-lg mb-6"
              >
                <h3 className="font-semibold text-gray-800 mb-3">Add New Pincode</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="Pincode *"
                    value={newPincode.pincode}
                    onChange={(e) => setNewPincode({...newPincode, pincode: e.target.value})}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    maxLength={6}
                  />
                  <input
                    type="text"
                    placeholder="Locality (Optional)"
                    value={newPincode.locality}
                    onChange={(e) => setNewPincode({...newPincode, locality: e.target.value})}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Zone (e.g., Zone A)"
                    value={newPincode.deliveryZone}
                    onChange={(e) => setNewPincode({...newPincode, deliveryZone: e.target.value})}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddSingle}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Pincode
                  </button>
                </div>
              </motion.div>
            )}

            {/* Pincodes List */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {isLoading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading pincodes...</p>
                </div>
              ) : filteredPincodes.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-600">No pincodes found</p>
                  <p className="text-gray-400 text-sm mt-1">Add pincodes to define serviceable areas</p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pincode</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Locality</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zone</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredPincodes.map((pincode) => (
                        <tr key={pincode._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{pincode.pincode}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{pincode.locality || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{pincode.deliveryZone || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              pincode.isServiceable 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {pincode.isServiceable ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDelete(pincode._id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <FiTrash2 />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <p>💡 <strong>Tip:</strong> Use CSV bulk import for adding multiple pincodes at once.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PincodeModal;
