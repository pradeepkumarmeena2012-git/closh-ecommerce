import { useState, useEffect } from "react";
import {
  FiMapPin,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiSearch,
  FiCheckCircle,
  FiX,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import DataTable from "../../Admin/components/DataTable";
import ConfirmModal from "../../Admin/components/ConfirmModal";
import { useVendorAuthStore } from "../store/vendorAuthStore";
import toast from "react-hot-toast";

const PickupLocations = () => {
  const { vendor } = useVendorAuthStore();
  const [locations, setLocations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationModal, setLocationModal] = useState({
    isOpen: false,
    location: null,
  });
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    locationId: null,
  });

  const vendorId = vendor?.id;

  useEffect(() => {
    if (!vendorId) return;

    // Load locations from localStorage
    const savedLocations = localStorage.getItem(
      `vendor-${vendorId}-pickup-locations`
    );
    if (savedLocations) {
      setLocations(JSON.parse(savedLocations));
    } else {
      // Initialize with default location if vendor has address
      if (vendor.address) {
        const defaultLocation = {
          id: 1,
          name: "Main Store",
          address: {
            street: vendor.address.street || "",
            city: vendor.address.city || "",
            state: vendor.address.state || "",
            zipCode: vendor.address.zipCode || "",
            country: vendor.address.country || "USA",
          },
          phone: vendor.phone || "",
          email: vendor.email || "",
          isActive: true,
          isDefault: true,
          operatingHours: {
            monday: { open: "09:00", close: "18:00", closed: false },
            tuesday: { open: "09:00", close: "18:00", closed: false },
            wednesday: { open: "09:00", close: "18:00", closed: false },
            thursday: { open: "09:00", close: "18:00", closed: false },
            friday: { open: "09:00", close: "18:00", closed: false },
            saturday: { open: "10:00", close: "16:00", closed: false },
            sunday: { open: "10:00", close: "16:00", closed: true },
          },
        };
        setLocations([defaultLocation]);
        localStorage.setItem(
          `vendor-${vendorId}-pickup-locations`,
          JSON.stringify([defaultLocation])
        );
      }
    }
  }, [vendorId, vendor]);

  const filteredLocations = locations.filter(
    (loc) =>
      !searchQuery ||
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.address.street.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.address.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = (locationData) => {
    const updatedLocations = locationModal.location?.id
      ? locations.map((l) =>
        l.id === locationModal.location.id
          ? { ...locationData, id: locationModal.location.id }
          : l
      )
      : [...locations, { ...locationData, id: Date.now() }];

    setLocations(updatedLocations);
    localStorage.setItem(
      `vendor-${vendorId}-pickup-locations`,
      JSON.stringify(updatedLocations)
    );
    setLocationModal({ isOpen: false, location: null });
    toast.success(
      locationModal.location?.id ? "Location updated" : "Location added"
    );
  };

  const handleDelete = () => {
    const updatedLocations = locations.filter(
      (l) => l.id !== deleteModal.locationId
    );
    setLocations(updatedLocations);
    localStorage.setItem(
      `vendor-${vendorId}-pickup-locations`,
      JSON.stringify(updatedLocations)
    );
    setDeleteModal({ isOpen: false, locationId: null });
    toast.success("Location deleted");
  };

  const toggleActive = (locationId) => {
    const updatedLocations = locations.map((l) =>
      l.id === locationId ? { ...l, isActive: !l.isActive } : l
    );
    setLocations(updatedLocations);
    localStorage.setItem(
      `vendor-${vendorId}-pickup-locations`,
      JSON.stringify(updatedLocations)
    );
    toast.success("Location status updated");
  };

  const setDefault = (locationId) => {
    const updatedLocations = locations.map((l) => ({
      ...l,
      isDefault: l.id === locationId,
    }));
    setLocations(updatedLocations);
    localStorage.setItem(
      `vendor-${vendorId}-pickup-locations`,
      JSON.stringify(updatedLocations)
    );
    toast.success("Default location updated");
  };

  const columns = [
    {
      key: "name",
      label: "Location Name",
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <FiMapPin className="text-primary-600" />
          <div>
            <span className="font-medium">{value}</span>
            {row.isDefault && (
              <span className="ml-2 text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded">
                Default
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "address",
      label: "Address",
      sortable: false,
      render: (value) => (
        <div className="text-sm">
          <p>{value.street}</p>
          <p className="text-gray-500">
            {value.city}, {value.state} {value.zipCode}
          </p>
        </div>
      ),
    },
    {
      key: "phone",
      label: "Contact",
      sortable: false,
      render: (value, row) => (
        <div className="text-sm">
          <p>{value}</p>
          <p className="text-gray-500">{row.email}</p>
        </div>
      ),
    },
    {
      key: "isActive",
      label: "Status",
      sortable: true,
      render: (value) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${value ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
            }`}>
          {value ? "Active" : "Inactive"}
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
            onClick={() => setLocationModal({ isOpen: true, location: row })}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <FiEdit />
          </button>
          <button
            onClick={() => setDeleteModal({ isOpen: true, locationId: row.id })}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <FiTrash2 />
          </button>
        </div>
      ),
    },
  ];

  if (!vendorId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">
          Please log in to manage pickup locations
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="lg:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            Pickup Locations
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Manage your store pickup locations
          </p>
        </div>
        <button
          onClick={() => setLocationModal({ isOpen: true, location: null })}
          className="flex items-center gap-2 px-4 py-2 gradient-green text-white rounded-lg hover:shadow-glow-green transition-all font-semibold">
          <FiPlus />
          <span>Add Location</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search locations..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Locations Table */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        {filteredLocations.length > 0 ? (
          <DataTable
            data={filteredLocations}
            columns={columns}
            pagination={true}
            itemsPerPage={10}
          />
        ) : (
          <div className="text-center py-12">
            <FiMapPin className="mx-auto text-4xl text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">No pickup locations found</p>
            <button
              onClick={() => setLocationModal({ isOpen: true, location: null })}
              className="px-4 py-2 gradient-green text-white rounded-lg hover:shadow-glow-green transition-all font-semibold">
              Add Your First Location
            </button>
          </div>
        )}
      </div>

      {/* Location Modal */}
      <LocationModal
        isOpen={locationModal.isOpen}
        location={locationModal.location}
        onClose={() => setLocationModal({ isOpen: false, location: null })}
        onSave={handleSave}
      />

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, locationId: null })}
        onConfirm={handleDelete}
        title="Delete Location?"
        message="Are you sure you want to delete this pickup location? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </motion.div>
  );
};

// Location Modal Component
const LocationModal = ({ isOpen, location, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "USA",
    },
    phone: "",
    email: "",
    isActive: true,
    isDefault: false,
    operatingHours: {
      monday: { open: "09:00", close: "18:00", closed: false },
      tuesday: { open: "09:00", close: "18:00", closed: false },
      wednesday: { open: "09:00", close: "18:00", closed: false },
      thursday: { open: "09:00", close: "18:00", closed: false },
      friday: { open: "09:00", close: "18:00", closed: false },
      saturday: { open: "10:00", close: "16:00", closed: false },
      sunday: { open: "10:00", close: "16:00", closed: true },
    },
  });

  useEffect(() => {
    if (location) {
      setFormData(location);
    } else {
      setFormData({
        name: "",
        address: {
          street: "",
          city: "",
          state: "",
          zipCode: "",
          country: "USA",
        },
        phone: "",
        email: "",
        isActive: true,
        isDefault: false,
        operatingHours: {
          monday: { open: "09:00", close: "18:00", closed: false },
          tuesday: { open: "09:00", close: "18:00", closed: false },
          wednesday: { open: "09:00", close: "18:00", closed: false },
          thursday: { open: "09:00", close: "18:00", closed: false },
          friday: { open: "09:00", close: "18:00", closed: false },
          saturday: { open: "10:00", close: "16:00", closed: false },
          sunday: { open: "10:00", close: "16:00", closed: true },
        },
      });
    }
  }, [location, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("address.")) {
      const field = name.split(".")[1];
      setFormData({
        ...formData,
        address: { ...formData.address, [field]: value },
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.address.street || !formData.address.city) {
      toast.error("Please fill in all required fields");
      return;
    }
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[10000] backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[10001] flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-emerald-50">
              {/* Fixed Header */}
              <div className="p-5 md:p-6 border-b border-gray-100 flex items-center justify-between bg-white z-10">
                <h2 className="text-lg md:text-xl font-black text-gray-800 tracking-tight">
                  {location ? "Edit Pickup Location" : "Add Pickup Location"}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
                  <FiX className="text-gray-500" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-5 md:p-8 no-scrollbar">
                <form id="locationForm" onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">
                      Location Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500"
                      placeholder="e.g., Main Store, Warehouse"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">
                      Street Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="address.street"
                      value={formData.address.street}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="address.city"
                        value={formData.address.city}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">
                        State
                      </label>
                      <input
                        type="text"
                        name="address.state"
                        value={formData.address.state}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">
                        Zip Code
                      </label>
                      <input
                        type="text"
                        name="address.zipCode"
                        value={formData.address.zipCode}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">
                        Country
                      </label>
                      <input
                        type="text"
                        name="address.country"
                        value={formData.address.country}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-6 p-4 bg-emerald-50/20 rounded-2xl border border-emerald-50">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) =>
                          setFormData({ ...formData, isActive: e.target.checked })
                        }
                        className="size-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-black text-gray-700 uppercase tracking-wider">
                        Active Location
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isDefault}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isDefault: e.target.checked,
                          })
                        }
                        className="size-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-black text-gray-700 uppercase tracking-wider">
                        Set as Default
                      </span>
                    </label>
                  </div>
                </form>
              </div>

              {/* Fixed Footer */}
              <div className="p-5 md:p-6 border-t border-gray-100 bg-white z-10 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4 bg-gray-50 text-gray-600 font-black rounded-xl hover:bg-gray-100 transition-all text-xs uppercase tracking-widest">
                  Cancel
                </button>
                <button
                  type="submit"
                  form="locationForm"
                  className="flex-1 py-4 bg-[#003d29] text-white font-black rounded-xl shadow-xl shadow-emerald-900/10 hover:bg-[#002a1c] transition-all text-xs uppercase tracking-widest">
                  {location ? "Update Location" : "Add Location"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PickupLocations;
