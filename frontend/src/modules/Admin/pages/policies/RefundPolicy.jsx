import { useState, useEffect } from 'react';
import { FiSave, FiFileText } from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { getAdminSetting, updateAdminSetting } from '../../services/adminService';

const RefundPolicy = () => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const res = await getAdminSetting('refund_policy');
        if (res?.data) {
          setContent(res.data);
        }
      } catch (err) {
        console.error('Error fetching refund policy:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPolicy();
  }, []);

  const handleSave = async () => {
    try {
      await updateAdminSetting('refund_policy', content);
      toast.success('Refund policy saved successfully');
    } catch (err) {
      toast.error('Failed to save policy');
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-400 font-bold uppercase tracking-widest animate-pulse">Loading Policy...</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="lg:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Refund Policy</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage your store's refund policy</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 gradient-green text-white rounded-lg hover:shadow-glow-green transition-all font-semibold text-sm"
        >
          <FiSave />
          <span>Save Policy</span>
        </button>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <FiFileText className="text-primary-600" />
          <h3 className="font-semibold text-gray-800">Refund Policy Content</h3>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={20}
          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
        />
      </div>
    </motion.div>
  );
};

export default RefundPolicy;

