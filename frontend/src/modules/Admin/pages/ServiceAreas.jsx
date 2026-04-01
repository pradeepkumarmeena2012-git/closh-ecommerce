import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiPlus, FiEdit2, FiTrash2, FiMapPin, FiToggleLeft, FiToggleRight,
  FiPackage, FiUsers, FiTruck, FiSearch, FiFilter, FiDownload, FiUpload
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../../shared/utils/api';
import ServiceAreaModal from './service-areas/ServiceAreaModal';
import PincodeModal from './service-areas/PincodeModal';
import { formatPrice } from '../../../shared/utils/helpers';

const ServiceAreas = () => {
  const [serviceAreas, setServiceAreas] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // all, active, inactive, coming_soon
  const [showServiceAreaModal, setShowServiceAreaModal] = useState(false);
  const [showPincodeModal, setShowPincodeModal] = useState(false);
  const [selectedArea, setSelectedArea] = useState(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [areasRes, statsRes] = await Promise.all([
        api.get('/admin/service-areas'),
        api.get('/admin/service-areas/stats')
      ]);
      
      setServiceAreas(areasRes.data.data || []);
      setStats(statsRes.data.data || {});
    } catch (error) {
      toast.error('Failed to load service areas');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await api.patch(`/admin/service-areas/${id}/toggle`, { isActive: !currentStatus });
      toast.success(`Service area ${!currentStatus ? 'activated' : 'deactivated'}`);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/admin/service-areas/${id}`);
      toast.success('Service area deleted successfully');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete service area');
    }
  };

  const handleEdit = (area) => {
    setSelectedArea(area);
    setShowServiceAreaModal(true);
  };

  const handleManagePincodes = (area) => {
    setSelectedArea(area);
    setShowPincodeModal(true);
  };

  const filteredAreas = serviceAreas.filter(area => {
    const matchesSearch = area.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         area.state.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'all') return matchesSearch;
    if (filter === 'active') return matchesSearch && area.isActive;
    if (filter === 'inactive') return matchesSearch && !area.isActive;
    if (filter === 'coming_soon') return matchesSearch && area.serviceType === 'coming_soon';
    return matchesSearch;
  });

  const getServiceTypeBadge = (serviceType) => {
    const badges = {
      full: 'bg-green-100 text-green-700',
      limited: 'bg-yellow-100 text-yellow-700',
      coming_soon: 'bg-blue-100 text-blue-700'
    };
    return badges[serviceType] || badges.full;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex  items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Service Areas</h1>
          <p className="text-gray-600 text-sm mt-1">Manage delivery zones and serviceability</p>
        </div>
        <button
          onClick={() => {
            setSelectedArea(null);
            setShowServiceAreaModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <FiPlus className="text-xl" />
          Add Service Area
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard
            icon={FiMapPin}
            label="Total Areas"
            value={stats.totalAreas || 0}
            subValue={`${stats.activeAreas || 0} Active`}
            color="blue"
          />
          <StatsCard
            icon={FiPackage}
            label="Total Pincodes"
            value={stats.totalPincodes || 0}
            subValue={`${stats.serviceablePincodes || 0} Serviceable`}
            color="green"
          />
          <StatsCard
            icon={FiUsers}
            label="Coming Soon"
            value={stats.comingSoonAreas || 0}
            subValue="Areas in pipeline"
            color="purple"
          />
          <StatsCard
            icon={FiTruck}
            label="Coverage"
            value={stats.serviceablePincodes > 0 ? 
              `${Math.round((stats.serviceablePincodes / stats.totalPincodes) * 100)}%` : '0%'}
            subValue="Pincode coverage"
            color="orange"
          />
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex-1 relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by city or state..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <FiFilter className="text-gray-400" />
          {['all', 'active', 'inactive', 'coming_soon'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Service Areas List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading service areas...</p>
          </div>
        ) : filteredAreas.length === 0 ? (
          <div className="p-12 text-center">
            <FiMapPin className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No service areas found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delivery Settings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stats
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAreas.map((area) => (
                  <tr key={area._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FiMapPin className="text-primary-600 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{area.name}</div>
                          <div className="text-sm text-gray-500">{area.state}, {area.country}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getServiceTypeBadge(area.serviceType)}`}>
                        {area.serviceType.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        <div>Fee: {formatPrice(area.deliverySettings?.deliveryFee || 0)}</div>
                        <div className="text-gray-500">Min: {formatPrice(area.deliverySettings?.minOrderAmount || 0)}</div>
                        <div className="text-gray-500">Time: {area.deliverySettings?.averageDeliveryTime}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-gray-900">{area.stats?.totalOrders || 0} Orders</div>
                        <div className="text-gray-500">{area.stats?.totalCustomers || 0} Customers</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(area._id, area.isActive)}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          area.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {area.isActive ? <FiToggleRight className="mr-1" /> : <FiToggleLeft className="mr-1" />}
                        {area.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleManagePincodes(area)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Manage Pincodes"
                        >
                          <FiPackage className="text-lg" />
                        </button>
                        <button
                          onClick={() => handleEdit(area)}
                          className="text-primary-600 hover:text-primary-900"
                          title="Edit"
                        >
                          <FiEdit2 className="text-lg" />
                        </button>
                        <button
                          onClick={() => handleDelete(area._id, area.name)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <FiTrash2 className="text-lg" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <ServiceAreaModal
        isOpen={showServiceAreaModal}
        onClose={() => {
          setShowServiceAreaModal(false);
          setSelectedArea(null);
        }}
        serviceArea={selectedArea}
        onSuccess={loadData}
      />

      <PincodeModal
        isOpen={showPincodeModal}
        onClose={() => {
          setShowPincodeModal(false);
          setSelectedArea(null);
        }}
        serviceArea={selectedArea}
      />
    </div>
  );
};

// Stats Card Component
const StatsCard = ({ icon: Icon, label, value, subValue, color }) => {
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-lg shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
          <p className="text-gray-500 text-sm mt-1">{subValue}</p>
        </div>
        <div className={`p-3 rounded-full ${colors[color]}`}>
          <Icon className="text-white text-2xl" />
        </div>
      </div>
    </motion.div>
  );
};

export default ServiceAreas;
