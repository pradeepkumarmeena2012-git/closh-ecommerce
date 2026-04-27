import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiPlus, FiEdit, FiTrash2, FiList, FiSearch, FiCheck, FiX, FiLayers } from "react-icons/fi";
import DataTable from "../components/DataTable";
import Badge from "../../../shared/components/Badge";
import {
    getAllAttributes,
    createAttribute,
    deleteAttribute,
    addAttributeValue,
    deleteAttributeValue,
    getAllAttributeSets,
    createAttributeSet,
    updateAttributeSet,
    deleteAttributeSet
} from "../services/adminService";
import toast from "react-hot-toast";

import { useLocation, useNavigate } from "react-router-dom";

const Attributes = () => {
    const location = useLocation();
    
    // Determine initial tab based on URL path
    const getInitialTab = () => {
        const path = location.pathname;
        if (path.includes('/sets')) return "sets";
        if (path.includes('/list')) return "attributes";
        if (path.includes('/values')) return "attributes"; 
        return "sets"; // Default to sets for /admin/attributes
    };

    const [activeTab, setActiveTab] = useState(getInitialTab());

    // Sync activeTab if URL changes (e.g. via sidebar clicks)
    useEffect(() => {
        setActiveTab(getInitialTab());
    }, [location.pathname]);

    // --- Attributes State ---
    const [attributes, setAttributes] = useState([]);
    const [isLoadingAttrs, setIsLoadingAttrs] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddingAttr, setIsAddingAttr] = useState(false);
    const [newAttr, setNewAttr] = useState({ name: "", type: "custom" });

    // --- Sets State ---
    const [attributeSets, setAttributeSets] = useState([]);
    const [isLoadingSets, setIsLoadingSets] = useState(false);
    const [isAddingSet, setIsAddingSet] = useState(false);
    const [newSetName, setNewSetName] = useState("");
    const [newSetValues, setNewSetValues] = useState("");

    // --- Edit Set State ---
    const [editingSet, setEditingSet] = useState(null);
    const [editSetForm, setEditSetForm] = useState({ name: "", values: "", isActive: true });

    useEffect(() => {
        if (activeTab === "attributes") {
            loadAttributes();
        } else {
            loadAttributeSets();
            if (attributes.length === 0) loadAttributes(); // Needed for creation dropdowns
        }
    }, [activeTab]);

    // -- Attributes Logic --
    const loadAttributes = async () => {
        setIsLoadingAttrs(true);
        try {
            const res = await getAllAttributes({ search: searchQuery });
            setAttributes(res.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingAttrs(false);
        }
    };

    const handleCreateAttr = async () => {
        if (!newAttr.name) return toast.error("Name is required");
        try {
            await createAttribute(newAttr);
            toast.success("Attribute created");
            setIsAddingAttr(false);
            setNewAttr({ name: "", type: "custom" });
            loadAttributes();
        } catch (error) {
            toast.error("Failed to create attribute");
        }
    };

    const handleDeleteAttr = async (id) => {
        if (!window.confirm("Are you sure?")) return;
        try {
            await deleteAttribute(id);
            toast.success("Attribute deleted");
            loadAttributes();
        } catch (error) {
            toast.error("Failed to delete attribute");
        }
    };

    const promptAddValue = async (attrId) => {
        const value = prompt("Enter new value:");
        if (!value) return;
        try {
            await addAttributeValue(attrId, { value });
            toast.success("Value added");
            loadAttributes();
        } catch (error) {
            toast.error("Failed to add value");
        }
    };

    const handleDeleteValue = async (attrId, valueId) => {
        try {
            await deleteAttributeValue(attrId, valueId);
            toast.success("Value removed");
            loadAttributes();
        } catch (error) {
            toast.error("Failed to remove value");
        }
    };

    // -- Sets Logic --
    const loadAttributeSets = async () => {
        setIsLoadingSets(true);
        try {
            const res = await getAllAttributeSets();
            setAttributeSets(res.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingSets(false);
        }
    };

    const handleCreateSet = async () => {
        if (!newSetName) return toast.error("Set name is required");
        try {
            const valuesArray = newSetValues
                .split(',')
                .map(v => v.trim())
                .filter(v => v);

            await createAttributeSet({ name: newSetName, values: valuesArray, isActive: true });
            toast.success("Attribute Set created");
            setIsAddingSet(false);
            setNewSetName("");
            setNewSetValues("");
            loadAttributeSets();
        } catch (error) {
            toast.error("Failed to create set");
        }
    };

    const handleDeleteSet = async (id) => {
        if (!window.confirm("Are you sure you want to delete this set?")) return;
        try {
            await deleteAttributeSet(id);
            toast.success("Set deleted");
            loadAttributeSets();
        } catch (error) {
            toast.error("Failed to delete set");
        }
    };

    const handleUpdateSet = async () => {
        if (!editSetForm.name) return toast.error("Name is required");
        try {
            const valuesArray = editSetForm.values
                .split(',')
                .map(v => v.trim())
                .filter(v => v);

            await updateAttributeSet(editingSet, {
                name: editSetForm.name,
                values: valuesArray,
                isActive: editSetForm.isActive
            });
            toast.success("Set updated");
            setEditingSet(null);
            loadAttributeSets();
        } catch (error) {
            toast.error("Failed to update set");
        }
    };

    // Columns for Master Attributes Table
    const attributeColumns = [
        {
            key: "name",
            label: "Attribute Name",
            sortable: true,
            render: (value, row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-gray-800">{value}</span>
                    <span className="text-[10px] text-gray-400 font-mono">{row._id}</span>
                </div>
            )
        },
        {
            key: "type",
            label: "Type",
            render: (value) => (
                <Badge variant={value === 'size' ? 'primary' : value === 'color' ? 'success' : 'warning'} className="uppercase text-[10px]">
                    {value}
                </Badge>
            )
        },
        {
            key: "values",
            label: "Current Values",
            render: (values, row) => (
                <div className="flex flex-wrap gap-1.5 max-w-[300px]">
                    {(values || []).map((v) => (
                        <div key={v._id} className="group relative">
                            <span className={`px-2 py-1 rounded-md text-xs border flex items-center gap-1.5 ${row.type === 'color' ? 'bg-white' : 'bg-white'}`}>
                                {row.type === 'color' && v.colorCode && (
                                    <span className="w-2 h-2 rounded-full border border-gray-200" style={{ backgroundColor: v.colorCode }} />
                                )}
                                {v.value}
                                <button
                                    onClick={() => handleDeleteValue(row._id, v._id)}
                                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 ml-1 transition-opacity"
                                >
                                    <FiTrash2 size={10} />
                                </button>
                            </span>
                        </div>
                    ))}
                    <button
                        onClick={() => promptAddValue(row._id)}
                        className="px-2 py-1 bg-primary-50 text-primary-600 rounded-md text-[10px] font-bold hover:bg-primary-100 transition-colors"
                    >
                        + ADD
                    </button>
                </div>
            )
        },
        {
            key: "actions",
            label: "Actions",
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleDeleteAttr(row._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <FiTrash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    const navigate = useNavigate();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 pb-12"
        >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="lg:hidden">
                    <h1 className="text-3xl font-bold text-gray-900 mb-1 font-premium ">Attribute Management</h1>
                    <p className="text-sm text-gray-500 font-medium whitespace-nowrap">Manage product attributes and organize them into sets.</p>
                </div>
            </div>
 
            {/* Custom Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-200">
                <button
                    onClick={() => navigate('/admin/attributes/sets')}
                    className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'sets' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                >
                    <FiLayers /> Attribute Sets
                </button>
                <button
                    onClick={() => navigate('/admin/attributes/list')}
                    className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'attributes' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                >
                    <FiList /> Master Attributes
                </button>
            </div>

            {activeTab === 'sets' && (
                <div className="space-y-6">
                    {/* Add Attribute Set Button (Matches User Screenshot) */}
                    <div>
                        <button
                            onClick={() => setIsAddingSet(!isAddingSet)}
                            className="bg-[#2ecc71] hover:bg-[#27ae60] text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 shadow-sm transition-colors"
                        >
                            <span className="text-lg leading-none">+</span> Add Attribute Set
                        </button>
                    </div>

                    <AnimatePresence>
                        {isAddingSet && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm max-w-2xl overflow-hidden"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-gray-800">Create New Set</h3>
                                        <button onClick={() => setIsAddingSet(false)} className="text-gray-400 hover:text-gray-600"><FiX /></button>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-600 uppercase">Set Name</label>
                                        <input
                                            type="text"
                                            value={newSetName}
                                            onChange={(e) => setNewSetName(e.target.value)}
                                            placeholder="e.g. T-Shirt Set"
                                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-600 uppercase">Values (Comma Separated)</label>
                                        <textarea
                                            value={newSetValues}
                                            onChange={(e) => setNewSetValues(e.target.value)}
                                            placeholder="e.g. Red, Blue, Green, Yellow"
                                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all min-h-[100px] resize-y"
                                        />
                                    </div>
                                    <button
                                        onClick={handleCreateSet}
                                        className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition"
                                    >
                                        Save Set
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Cards Grid (Matches User Screenshot) */}
                    {isLoadingSets ? (
                        <div className="text-gray-500 text-sm py-4">Loading sets...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {attributeSets.map(set => (
                                <div key={set._id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow relative">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-[#1a2b4c] font-bold text-[17px]">{set.name}</h3>
                                        <div className="flex gap-3 text-[15px]">
                                            <button
                                                onClick={() => {
                                                    setEditingSet(set._id);
                                                    setEditSetForm({
                                                        name: set.name,
                                                        values: (set.values || []).join(", "),
                                                        isActive: set.isActive !== false
                                                    });
                                                }}
                                                className="text-blue-500 hover:text-blue-700 transition-colors"
                                            >
                                                <FiEdit strokeWidth={2.5} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSet(set._id)}
                                                className="text-red-500 hover:text-red-700 transition-colors"
                                            >
                                                <FiTrash2 strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {(set.attributes || []).map(attr => (
                                            <span key={attr._id} className="bg-[#f0f2f5] text-[#4b5563] text-xs px-3 py-1.5 rounded-md font-medium">
                                                {attr.name}
                                            </span>
                                        ))}
                                        {(set.attributes || []).length === 0 && (set.values || []).length === 0 && (
                                            <span className="text-xs text-gray-400 italic">No attributes/values assigned</span>
                                        )}
                                        {/* Display custom values separated by commas */}
                                        {(set.values || []).length > 0 && (
                                            <span className="bg-[#f0f2f5] text-[#4b5563] text-xs px-3 py-1.5 rounded-md font-medium">
                                                {set.values.join(", ")}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <span className={`text-[11px] px-2.5 py-1 rounded font-bold uppercase  ${set.isActive !== false ? 'bg-[#cbf4c9] text-[#1c7430]' : 'bg-red-100 text-red-700'}`}>
                                            {set.isActive !== false ? 'active' : 'inactive'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'attributes' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-3 space-y-6">
                        <div className="relative group">
                            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && loadAttributes()}
                                placeholder="Search existing attributes..."
                                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all font-medium"
                            />
                        </div>

                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white/50">
                                <h2 className="font-bold text-gray-800 flex items-center gap-2 uppercase  text-xs">
                                    <FiList className="text-primary-500" /> Active Master Attributes
                                </h2>
                                <div className="text-[10px] font-bold text-gray-400 uppercase er">Total {attributes.length} Configured</div>
                            </div>
                            <div className="p-2">
                                <DataTable
                                    data={attributes}
                                    columns={attributeColumns}
                                    pagination={true}
                                    itemsPerPage={10}
                                    isLoading={isLoadingAttrs}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {isAddingAttr ? (
                            <motion.div
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                className="bg-white rounded-3xl p-6 border-2 border-primary-100 shadow-xl shadow-primary-50 space-y-4"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-bold text-gray-800 uppercase text-xs ">Construct Axis</h3>
                                    <button onClick={() => setIsAddingAttr(false)} className="text-gray-400 hover:text-red-500"><FiX /></button>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase ">Internal Name</label>
                                    <input
                                        type="text"
                                        value={newAttr.name}
                                        onChange={(e) => setNewAttr({ ...newAttr, name: e.target.value })}
                                        placeholder="e.g. Waist Size"
                                        className="w-full p-3 bg-white rounded-xl border-transparent focus:bg-white focus:border-primary-500 outline-none text-sm font-bold transition-all"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase ">Category Type</label>
                                    <select
                                        value={newAttr.type}
                                        onChange={(e) => setNewAttr({ ...newAttr, type: e.target.value })}
                                        className="w-full p-3 bg-white rounded-xl border-transparent focus:bg-white focus:border-primary-500 outline-none text-sm font-bold transition-all appearance-none"
                                    >
                                        <option value="custom">Custom Text</option>
                                        <option value="size">Size Scaling</option>
                                        <option value="color">Visual Color</option>
                                        <option value="material">Material Composition</option>
                                    </select>
                                </div>

                                <button
                                    onClick={handleCreateAttr}
                                    className="w-full py-4 bg-primary-600 text-white rounded-2xl font-bold text-xs uppercase  hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all flex items-center justify-center gap-2"
                                >
                                    <FiCheck /> Deploy Attribute
                                </button>
                            </motion.div>
                        ) : (
                            <div>
                                <button
                                    onClick={() => setIsAddingAttr(true)}
                                    className="w-full flex justify-center items-center gap-2 px-6 py-4 bg-primary-600 text-white rounded-2xl hover:bg-primary-700 transition-all shadow-lg active:scale-95 text-sm font-bold uppercase "
                                >
                                    <FiPlus />
                                    New Attribute
                                </button>
                            </div>
                        )}
                        <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 mt-6">
                            <h4 className="font-bold text-amber-800 text-xs uppercase  mb-3 flex items-center gap-2">
                                <FiList /> Quick Documentation
                            </h4>
                            <div className="space-y-3">
                                <p className="text-xs text-amber-700/80 leading-relaxed">
                                    <span className="font-bold">Axis:</span> The variable name (e.g., "Color").
                                </p>
                                <p className="text-xs text-amber-700/80 leading-relaxed">
                                    <span className="font-bold">Values:</span> Specific options available (e.g., "Deep Maroon").
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Set Modal */}
            <AnimatePresence>
                {editingSet && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            <div className="p-6">
                                <h2 className="text-[22px] font-bold text-[#1a2b4c] mb-6">Edit Attribute Set</h2>

                                <div className="space-y-5">
                                    <input
                                        type="text"
                                        value={editSetForm.name}
                                        onChange={e => setEditSetForm({ ...editSetForm, name: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400"
                                        placeholder="Set Name"
                                    />

                                    <textarea
                                        value={editSetForm.values}
                                        onChange={e => setEditSetForm({ ...editSetForm, values: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg p-3 text-gray-800 min-h-[120px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 resize-y"
                                        placeholder="Values (comma separated)"
                                    />

                                    <div className="relative">
                                        <select
                                            value={editSetForm.isActive}
                                            onChange={e => setEditSetForm({ ...editSetForm, isActive: e.target.value === 'true' })}
                                            className="w-full border border-blue-500 rounded-lg p-3 text-gray-800 appearance-none bg-white focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer"
                                        >
                                            <option value="true">Active</option>
                                            <option value="false">Inactive</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                            <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-8">
                                    <button
                                        onClick={handleUpdateSet}
                                        className="flex-1 bg-[#0d6efd] hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => setEditingSet(null)}
                                        className="flex-1 bg-[#e9ecef] hover:bg-gray-300 text-[#495057] font-semibold py-3 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Attributes;
