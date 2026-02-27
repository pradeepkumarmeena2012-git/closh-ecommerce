import React, { useState, useEffect } from "react";
import {
    FiUserPlus,
    FiEdit2,
    FiTrash2,
    FiShield,
    FiMail,
    FiLock,
    FiCheckCircle,
    FiXCircle,
    FiSearch,
    FiUsers,
    FiPackage,
    FiShoppingCart,
    FiHeadphones,
    FiPieChart,
    FiStar,
    FiX
} from "react-icons/fi";
import api from "../../../../shared/utils/api";
import toast from "react-hot-toast";

const PERMISSIONS = [
    { id: 'dashboard_view', label: 'View Dashboard' },
    { id: 'orders_manage', label: 'Manage Orders' },
    { id: 'products_manage', label: 'Manage Products' },
    { id: 'categories_manage', label: 'Manage Categories' },
    { id: 'brands_manage', label: 'Manage Brands' },
    { id: 'customers_manage', label: 'Manage Customers' },
    { id: 'vendors_manage', label: 'Manage Vendors' },
    { id: 'delivery_manage', label: 'Manage Delivery' },
    { id: 'marketing_manage', label: 'Manage Marketing' },
    { id: 'notifications_manage', label: 'Manage Notifications' },
    { id: 'support_manage', label: 'Manage Support' },
    { id: 'reports_view', label: 'View Reports' },
    { id: 'finance_view', label: 'View Finance' },
    { id: 'settings_manage', label: 'Manage Settings' },
];

const StaffManagement = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "employee",
        permissions: [],
        isActive: true
    });

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const res = await api.get("/admin/employees");
            if (res.success) {
                setEmployees(res.data);
            }
        } catch (err) {
            // Error toast is handled by api interceptor
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const handleOpenModal = (employee = null) => {
        if (employee) {
            setEditingEmployee(employee);
            setFormData({
                name: employee.name,
                email: employee.email,
                password: "", // Don't show password
                role: employee.role,
                permissions: employee.permissions || [],
                isActive: employee.isActive
            });
        } else {
            setEditingEmployee(null);
            setFormData({
                name: "",
                email: "",
                password: "",
                role: "employee",
                permissions: [],
                isActive: true
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingEmployee) {
                // Update
                const res = await api.put(`/admin/employees/${editingEmployee._id}`, formData);
                if (res.success) {
                    toast.success("Employee updated successfully");
                    fetchEmployees();
                    setShowModal(false);
                }
            } else {
                // Create
                const res = await api.post("/admin/employees", formData);
                if (res.success) {
                    toast.success("Employee created successfully");
                    fetchEmployees();
                    setShowModal(false);
                }
            }
        } catch (err) {
            // Error handled by interceptor
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this employee?")) return;
        try {
            const res = await api.delete(`/admin/employees/${id}`);
            if (res.success) {
                toast.success("Employee deleted successfully");
                fetchEmployees();
            }
        } catch (err) {
            // Error handled by interceptor
        }
    };

    const togglePermission = (permId) => {
        setFormData(prev => ({
            ...prev,
            permissions: prev.permissions.includes(permId)
                ? prev.permissions.filter(p => p !== permId)
                : [...prev.permissions, permId]
        }));
    };

    // PRESETS DEFINITION
    const PRESETS = [
        { id: 'custom', label: 'Custom Access', icon: FiShield, perms: [] },
        { id: 'inventory', label: 'Inventory Controller', icon: FiPackage, perms: ['products_manage', 'categories_manage', 'brands_manage', 'dashboard_view'] },
        { id: 'sales', label: 'Sales & Orders', icon: FiShoppingCart, perms: ['orders_manage', 'customers_manage', 'dashboard_view', 'delivery_manage'] },
        { id: 'support', label: 'Support Lead', icon: FiHeadphones, perms: ['support_manage', 'customers_manage', 'dashboard_view'] },
        { id: 'analyst', label: 'Business Analyst', icon: FiPieChart, perms: ['finance_view', 'reports_view', 'dashboard_view'] },
        { id: 'marketing', label: 'Marketing Specialist', icon: FiStar, perms: ['marketing_manage', 'dashboard_view'] },
    ];

    const applyPreset = (presetId) => {
        const preset = PRESETS.find(p => p.id === presetId);
        if (preset && preset.perms.length > 0) {
            setFormData(prev => ({ ...prev, permissions: preset.perms }));
        }
    };

    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Staff Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage employee access levels and platform security protocols.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-primary-600 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-primary-700 transition-colors shadow-sm"
                >
                    <FiUserPlus size={18} />
                    <span>Add New Staff</span>
                </button>
            </div>

            {/* Stats & Search */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                        <FiUsers size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Staff</p>
                        <p className="text-2xl font-bold text-gray-800">{employees.length}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                        <FiShield size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Admins</p>
                        <p className="text-2xl font-bold text-gray-800">{employees.filter(e => e.role === 'admin' || e.role === 'superadmin').length}</p>
                    </div>
                </div>
                <div className="relative">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        className="w-full h-full pl-11 pr-4 py-3 bg-white rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-800 placeholder-gray-400 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Permissions</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 font-medium animate-pulse">Loading staff records...</td>
                                </tr>
                            ) : filteredEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 font-medium">No staff records found.</td>
                                </tr>
                            ) : (
                                filteredEmployees.map((emp) => (
                                    <tr key={emp._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                                    {emp.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-800">{emp.name}</p>
                                                    <p className="text-sm text-gray-500">{emp.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${emp.role === 'superadmin' ? 'bg-primary-50 text-primary-700 border-primary-200' :
                                                emp.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                                    'bg-gray-100 text-gray-700 border-gray-200'
                                                }`}>
                                                {emp.role.charAt(0).toUpperCase() + emp.role.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1.5 max-w-xs">
                                                {emp.role === 'superadmin' ? (
                                                    <span className="text-xs font-semibold text-primary-600 flex items-center gap-1"><FiShield size={12} /> All Access</span>
                                                ) : (
                                                    <>
                                                        {emp.permissions?.slice(0, 3).map(p => (
                                                            <span key={p} className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs text-gray-600">
                                                                {p.split('_')[0]}
                                                            </span>
                                                        ))}
                                                        {emp.permissions?.length > 3 && (
                                                            <span className="px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-xs font-medium text-gray-500">+{emp.permissions.length - 3}</span>
                                                        )}
                                                        {(!emp.permissions || emp.permissions.length === 0) && (
                                                            <span className="text-xs text-gray-400 italic">No permissions</span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${emp.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                                <div className={`w-2 h-2 rounded-full ${emp.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                {emp.isActive ? 'Active' : 'Disabled'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleOpenModal(emp)} className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Edit">
                                                    <FiEdit2 size={18} />
                                                </button>
                                                {emp.role !== 'superadmin' && (
                                                    <button onClick={() => handleDelete(emp._id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                                        <FiTrash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Provisioning Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">

                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">{editingEmployee ? "Edit Staff Member" : "Add New Staff"}</h2>
                                <p className="text-xs text-gray-500 mt-1">Configure details and access permissions.</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                                <FiX size={20} />
                            </button>
                        </div>

                        {/* Form Body */}
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-admin">
                            {/* Personal Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                                    <input required type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-800" placeholder="John Doe" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                                    <input required type="email" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-800" placeholder="john@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                                {!editingEmployee && (
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                                        <input required type="password" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-800" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Role</label>
                                        <select className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-800" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                                            <option value="employee">Staff / Employee</option>
                                            <option value="admin">Administrator</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col justify-end pb-1.5">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <div className="relative">
                                                <input type="checkbox" className="peer sr-only" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} />
                                                <div className="w-10 h-5 bg-gray-200 rounded-full peer-checked:bg-primary-500 transition-all" />
                                                <div className="absolute left-[2px] top-[2px] w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-5 shadow-sm" />
                                            </div>
                                            <span className="text-sm font-medium text-gray-700">Active Account</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            {/* Presets */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Quick Presets</label>
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                    {PRESETS.filter(p => p.id !== 'custom').map(p => {
                                        const Icon = p.icon;
                                        return (
                                            <button key={p.id} type="button" onClick={() => applyPreset(p.id)} className="p-2 border border-gray-200 rounded-lg bg-gray-50 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 text-gray-600 transition-colors flex flex-col items-center justify-center gap-1.5 text-center px-1">
                                                <Icon size={16} />
                                                <span className="text-[10px] font-semibold leading-tight">{p.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Permissions */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Permissions</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {PERMISSIONS.map(cap => (
                                        <label key={cap.id} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${formData.permissions.includes(cap.id) ? 'bg-primary-50 border-primary-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                            <div className="relative flex-shrink-0">
                                                <input type="checkbox" className="peer sr-only" checked={formData.permissions.includes(cap.id)} onChange={() => togglePermission(cap.id)} />
                                                <div className="w-4 h-4 rounded border border-gray-300 peer-checked:bg-primary-600 peer-checked:border-primary-600 flex items-center justify-center transition-colors">
                                                    {formData.permissions.includes(cap.id) && <FiCheckCircle className="text-white w-3 h-3" />}
                                                </div>
                                            </div>
                                            <span className={`text-xs font-medium truncate ${formData.permissions.includes(cap.id) ? 'text-primary-800' : 'text-gray-600'}`}>
                                                {cap.label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                        </form>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                            <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                Cancel
                            </button>
                            <button type="submit" onClick={handleSubmit} className="px-5 py-2.5 text-sm font-bold text-white bg-primary-600 rounded-lg hover:bg-primary-700 shadow-sm transition-colors">
                                {editingEmployee ? "Save Changes" : "Create Staff"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffManagement;
