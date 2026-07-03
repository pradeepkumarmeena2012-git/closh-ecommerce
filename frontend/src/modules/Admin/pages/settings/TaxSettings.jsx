import { useState, useEffect } from "react";
import { FiSave, FiSettings, FiPlus, FiTrash2 } from "react-icons/fi";
import { motion } from "framer-motion";
import { useSettingsStore } from "../../../../shared/store/settingsStore";
import toast from "react-hot-toast";

const TaxSettings = () => {
  const { settings, updateSettings, initialize } = useSettingsStore();
  const [formData, setFormData] = useState({
    closhBusinessState: "Rajasthan",
    closhGstin: "",
    gstRules: []
  });

  useEffect(() => {
    initialize();
    if (settings && settings.tax) {
      setFormData(settings.tax);
    }
  }, []);

  useEffect(() => {
    if (settings && settings.tax) {
      setFormData(settings.tax);
    }
  }, [settings]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  const handleRuleChange = (index, field, value) => {
    const newRules = [...(formData.gstRules || [])];
    newRules[index] = { ...newRules[index], [field]: Number(value) };
    setFormData({ ...formData, gstRules: newRules });
  };

  const addRule = () => {
    setFormData({
      ...formData,
      gstRules: [...(formData.gstRules || []), { minPrice: 0, maxPrice: 999999, rate: 18 }]
    });
  };

  const removeRule = (index) => {
    const newRules = [...(formData.gstRules || [])];
    newRules.splice(index, 1);
    setFormData({ ...formData, gstRules: newRules });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await updateSettings("tax", formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-full overflow-x-hidden">
      <div className="lg:hidden">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
          Tax Settings
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Configure GST and Business State rules
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 max-w-full overflow-x-hidden p-3 sm:p-4 md:p-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Business Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Closh Business State (Origin) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="closhBusinessState"
                  value={formData.closhBusinessState || ""}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Madhya Pradesh"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used to determine if CGST+SGST or IGST should be applied.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Closh GSTIN (Optional)
                </label>
                <input
                  type="text"
                  name="closhGstin"
                  value={formData.closhGstin || ""}
                  onChange={handleChange}
                  placeholder="23XXXXXXXXXX1Z5"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-bold text-gray-800">Dynamic GST Rules</h3>
                <button type="button" onClick={addRule} className="text-sm text-primary-600 hover:text-primary-800 flex items-center gap-1 font-semibold">
                    <FiPlus /> Add Bracket
                </button>
            </div>
            
            <p className="text-sm text-gray-600">
                Define GST rates based on item selling price. GST will be inclusive.
            </p>

            <div className="space-y-4">
              {(formData.gstRules || []).map((rule, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row items-center gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Min Price (₹)</label>
                    <input
                      type="number"
                      value={rule.minPrice}
                      onChange={(e) => handleRuleChange(idx, "minPrice", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Max Price (₹)</label>
                    <input
                      type="number"
                      value={rule.maxPrice}
                      onChange={(e) => handleRuleChange(idx, "maxPrice", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">GST Rate (%)</label>
                    <input
                      type="number"
                      value={rule.rate}
                      onChange={(e) => handleRuleChange(idx, "rate", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div className="pt-5 sm:pt-6">
                    <button type="button" onClick={() => removeRule(idx)} className="text-red-500 hover:text-red-700 p-2 bg-red-50 rounded-md hover:bg-red-100 transition-colors">
                      <FiTrash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {(!formData.gstRules || formData.gstRules.length === 0) && (
                  <p className="text-center text-gray-500 py-4 text-sm">No GST rules defined.</p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 sm:pt-6 border-t border-gray-200">
            <button
              type="submit"
              className="flex items-center gap-2 px-4 sm:px-6 py-2 gradient-green text-white rounded-lg hover:shadow-glow-green transition-all font-semibold text-sm sm:text-base w-full sm:w-auto">
              <FiSave />
              Save Tax Settings
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default TaxSettings;
