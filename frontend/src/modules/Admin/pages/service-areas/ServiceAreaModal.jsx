import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiMapPin, FiSave, FiClock } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../../../shared/utils/api';
import GoogleMapZoneDrawer from '../../../../shared/components/GoogleMapZoneDrawer';

const ServiceAreaModal = ({ isOpen, onClose, serviceArea, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    state: '',
    country: 'India',
    coordinates: { type: 'Point', coordinates: [0, 0] },
    boundaries: { type: 'Polygon', coordinates: [] },
    serviceType: 'full',
    deliverySettings: {
      minOrderAmount: 0,
      deliveryFee: 40,
      freeDeliveryThreshold: 500,
      averageDeliveryTime: '30-45 mins',
      maxDeliveryRadius: 10,
      expressDeliveryAvailable: false,
      expressDeliveryFee: 80,
      codAvailable: true
    },
    displayMessage: '',
    estimatedLaunchDate: '',
    isStrictBoundary: false,
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    if (serviceArea) {
      setFormData({
        name: serviceArea.name || '',
        state: serviceArea.state || '',
        country: serviceArea.country || 'India',
        coordinates: serviceArea.coordinates || { type: 'Point', coordinates: [0, 0] },
        boundaries: serviceArea.boundaries || { type: 'Polygon', coordinates: [] },
        serviceType: serviceArea.serviceType || 'full',
        deliverySettings: {
          ...formData.deliverySettings,
          ...serviceArea.deliverySettings
        },
        displayMessage: serviceArea.displayMessage || '',
        estimatedLaunchDate: serviceArea.estimatedLaunchDate ? 
          new Date(serviceArea.estimatedLaunchDate).toISOString().split('T')[0] : '',
        isStrictBoundary: serviceArea.isStrictBoundary || false,
        notes: serviceArea.notes || ''
      });
      
      if (serviceArea.coordinates?.coordinates?.[0] !== 0) {
        setSelectedLocation({
          lat: serviceArea.coordinates.coordinates[1],
          lng: serviceArea.coordinates.coordinates[0]
        });
      }
    } else {
      // Reset form for new area
      setFormData({
        name: '',
        state: '',
        country: 'India',
        coordinates: { type: 'Point', coordinates: [0, 0] },
        boundaries: { type: 'Polygon', coordinates: [] },
        serviceType: 'full',
        deliverySettings: {
          minOrderAmount: 0,
          deliveryFee: 40,
          freeDeliveryThreshold: 500,
          averageDeliveryTime: '30-45 mins',
          maxDeliveryRadius: 10,
          expressDeliveryAvailable: false,
          expressDeliveryFee: 80,
          codAvailable: true
        },
        displayMessage: '',
        estimatedLaunchDate: '',
        isStrictBoundary: false,
        notes: ''
      });
      setSelectedLocation(null);
    }
  }, [serviceArea, isOpen]);

  const handleLocationSelect = useCallback((location) => {
    setSelectedLocation(location);
    setFormData(prev => ({
      ...prev,
      coordinates: {
        type: 'Point',
        coordinates: [location.lng, location.lat]
      }
    }));
  }, []);

  const handlePolygonComplete = useCallback((polygon) => {
    setFormData(prev => ({
      ...prev,
      boundaries: polygon || { type: 'Polygon', coordinates: [] }
    }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.state) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const payload = {
        ...formData,
        deliverySettings: {
          ...formData.deliverySettings,
          minOrderAmount: Number(formData.deliverySettings.minOrderAmount),
          deliveryFee: Number(formData.deliverySettings.deliveryFee),
          freeDeliveryThreshold: Number(formData.deliverySettings.freeDeliveryThreshold),
          maxDeliveryRadius: Number(formData.deliverySettings.maxDeliveryRadius),
          expressDeliveryFee: Number(formData.deliverySettings.expressDeliveryFee),
        }
      };
      
      if (serviceArea) {
        await api.put(`/admin/service-areas/${serviceArea._id}`, payload);
        toast.success('Service area updated successfully');
      } else {
        await api.post('/admin/service-areas', payload);
        toast.success('Service area created successfully');
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save service area');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FiMapPin className="text-2xl" />
                <div>
                  <h2 className="text-2xl font-bold">
                    {serviceArea ? 'Edit Service Area' : 'Add New Service Area'}
                  </h2>
                  <p className="text-primary-100 text-sm mt-1">
                    Define delivery zones and settings
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <FiX className="text-2xl" />
              </button>
            </div>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., Jaipur"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State *
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({...formData, state: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., Rajasthan"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Service Type
                    </label>
                    <select
                      value={formData.serviceType}
                      onChange={(e) => setFormData({...formData, serviceType: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="full">Full Service</option>
                      <option value="limited">Limited Service</option>
                      <option value="coming_soon">Coming Soon</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-4 bg-red-50 p-3 rounded-xl border border-red-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isStrictBoundary}
                        onChange={(e) => setFormData({...formData, isStrictBoundary: e.target.checked})}
                        className="w-5 h-5 text-red-600 rounded focus:ring-2 focus:ring-red-500"
                      />
                      <div>
                        <span className="block text-sm font-bold text-red-700">Strict City Boundary</span>
                        <span className="text-[10px] text-red-600 leading-tight">Restrict app access ONLY to this city's limits</span>
                      </div>
                    </label>
                  </div>

                  {formData.serviceType === 'coming_soon' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Estimated Launch Date
                      </label>
                      <input
                        type="date"
                        value={formData.estimatedLaunchDate}
                        onChange={(e) => setFormData({...formData, estimatedLaunchDate: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Location on Map */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Location & Zone</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Set the center point and draw the delivery zone boundaries on the map
                </p>
                <GoogleMapZoneDrawer
                  onLocationSelect={handleLocationSelect}
                  onPolygonComplete={handlePolygonComplete}
                  initialLocation={selectedLocation}
                  initialPolygon={formData.boundaries}
                  height="400px"
                />
              </div>

              {/* Delivery Settings - Simplified */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Service Radius</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Delivery Radius (km) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.deliverySettings.maxDeliveryRadius}
                        onChange={(e) => setFormData({
                          ...formData,
                          deliverySettings: {...formData.deliverySettings, maxDeliveryRadius: e.target.value}
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        min="1"
                        placeholder="e.g., 10"
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">km</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">Users within this distance from the center will be allowed access.</p>
                  </div>
                  
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-2 rounded-lg border border-gray-200 w-full">
                      <input
                        type="checkbox"
                        checked={formData.deliverySettings.codAvailable}
                        onChange={(e) => setFormData({
                          ...formData,
                          deliverySettings: {...formData.deliverySettings, codAvailable: e.target.checked}
                        })}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">Allow COD in this area</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Display Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Message (Optional)
                </label>
                <textarea
                  value={formData.displayMessage}
                  onChange={(e) => setFormData({...formData, displayMessage: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows="2"
                  placeholder="Message to show users in this area"
                />
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Notes (Internal)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows="2"
                  placeholder="Internal notes about this service area"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                <FiSave />
                {isSubmitting ? 'Saving...' : serviceArea ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ServiceAreaModal;
