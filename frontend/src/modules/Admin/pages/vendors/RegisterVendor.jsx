import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    FiUser,
    FiShoppingBag,
    FiPhone,
    FiFileText,
    FiMapPin,
    FiMail,
    FiLock,
    FiArrowLeft,
    FiSave,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { registerVendor } from "../../services/adminService";
import VendorHeader from "../../components/Vendors/VendorHeader";

const RegisterVendor = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        storeName: "",
        phone: "",
        gstNumber: "",
        shopAddress: "",
        email: "",
        password: "",
    });
    const [document, setDocument] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        setDocument(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = new FormData();
            Object.keys(formData).forEach((key) => {
                data.append(key, formData[key]);
            });
            if (document) {
                data.append("document", document);
            }

            const response = await registerVendor(data);
            if (response.success) {
                toast.success("Vendor registered successfully!");
                navigate("/admin/vendors/manage-vendors");
            } else {
                toast.error(response.message || "Failed to register vendor");
            }
        } catch (error) {
            // Error is already handled by the API interceptor toast
            console.error("Registration error:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto space-y-6"
        >
            <VendorHeader />


            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    {/* Section: Personal Info */}
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                <FiUser />
                            </span>
                            Personal Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-600">Vendor Name</label>
                                <div className="relative">
                                    <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        name="name"
                                        required
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        placeholder="Enter vendor's full name"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-600">Email Address</label>
                                <div className="relative">
                                    <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        placeholder="name@example.com"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Shop Info */}
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                                <FiShoppingBag />
                            </span>
                            Shop Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-600">Shop Name</label>
                                <div className="relative">
                                    <FiShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        name="storeName"
                                        required
                                        value={formData.storeName}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        placeholder="Enter shop name"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-600">Shop Phone Number</label>
                                <div className="relative">
                                    <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="tel"
                                        name="phone"
                                        required
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        placeholder="Enter phone number"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-600">GST Number</label>
                                <div className="relative">
                                    <FiFileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        name="gstNumber"
                                        required
                                        value={formData.gstNumber}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        placeholder="15-digit GST number"
                                        maxLength={15}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-600">Password</label>
                                <div className="relative">
                                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="password"
                                        name="password"
                                        required
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        placeholder="Enter login password"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-600">Shop Address</label>
                            <div className="relative">
                                <FiMapPin className="absolute left-3 top-3 text-gray-400" />
                                <textarea
                                    name="shopAddress"
                                    required
                                    value={formData.shopAddress}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    placeholder="Enter full shop address"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-600">Business Document (GST/ID Proof)</label>
                            <div className="relative">
                                <FiFileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="file"
                                    name="document"
                                    onChange={handleFileChange}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>
                            <p className="text-xs text-gray-500 italic">Upload a copy of GST certificate or valid business ID</p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-6 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="px-6 py-2.5 text-gray-600 font-medium hover:bg-white hover:text-black rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`px-8 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2 ${loading ? "opacity-70 cursor-not-allowed" : ""
                                }`}
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <FiSave />
                            )}
                            Register Vendor
                        </button>
                    </div>
                </form>
            </div>
        </motion.div>
    );
};

export default RegisterVendor;
