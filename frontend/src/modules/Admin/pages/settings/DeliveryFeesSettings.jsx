import { useState, useEffect } from 'react';
import { FiSave, FiTruck, FiInfo } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useSettingsStore } from '../../../../shared/store/settingsStore';
import toast from 'react-hot-toast';

const DEFAULTS = {
  baseFee: 25,
  freeKms: 3,
  perKmFee: 10,
  perVendorStopFee: 6,
  perVendorDropoffFee: 6,
  maxAssignmentRadiusKm: 10,
  maxCartVendorDistanceKm: 10,
};

const FieldRow = ({ label, hint, name, value, onChange }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3 border-b border-gray-100 last:border-0">
    <div className="flex-1 min-w-0">
      <label htmlFor={name} className="block text-sm font-medium text-gray-800">
        {label}
      </label>
      {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
    </div>
    <div className="flex items-center gap-2 w-full sm:w-36 shrink-0">
      <span className="text-gray-400 text-sm font-semibold">₹</span>
      <input
        id={name}
        name={name}
        type="number"
        min={0}
        step={0.5}
        value={value}
        onChange={onChange}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
      />
    </div>
  </div>
);

const DeliveryFeesSettings = () => {
  const { settings, updateSettings, initialize } = useSettingsStore();
  const [fees, setFees] = useState({ ...DEFAULTS });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (settings?.delivery_fees) {
      setFees({ ...DEFAULTS, ...settings.delivery_fees });
    }
  }, [settings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFees((prev) => ({ ...prev, [name]: Number(value) }));
  };

  const handleSave = async () => {
    // Basic validation
    if (fees.baseFee < 0 || fees.freeKms < 0 || fees.perKmFee < 0 || fees.perVendorStopFee < 0 || fees.perVendorDropoffFee < 0 || fees.maxAssignmentRadiusKm < 1 || fees.maxCartVendorDistanceKm < 1) {
      toast.error('All fee values must be 0 or greater, and distances at least 1km');
      return;
    }
    setIsSaving(true);
    try {
      await updateSettings('delivery_fees', fees);
      // toast is shown by updateSettings
    } catch {
      // toast is shown by updateSettings
    } finally {
      setIsSaving(false);
    }
  };

  // Live preview calculation
  const previewSingle = (dist) => {
    const { baseFee, freeKms, perKmFee } = fees;
    if (!dist || dist <= freeKms) return baseFee;
    return Math.round(baseFee + (dist - freeKms) * perKmFee);
  };
  const previewMultiForward = (dist, stops) =>
    Math.max(0, (stops - 1) * fees.perVendorStopFee) + previewSingle(dist);
  const previewMultiReturn = (dist, drops) =>
    Math.max(0, (drops - 1) * fees.perVendorDropoffFee) + previewSingle(dist);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-2xl"
    >
      {/* Header */}
      <div>
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <FiTruck className="text-primary-600" />
          Delivery Boy Earning Fees
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Configure how delivery partners are compensated for each trip. Changes apply to all future order completions.
        </p>
      </div>

      {/* ─── DISTANCE LIMITS ─────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
          <p className="text-xs font-black text-amber-700 uppercase tracking-widest">
            🚧 Distance & Routing Limits
          </p>
          <p className="text-xs text-amber-500 mt-0.5">
            Controls max boundaries for multi-vendor orders and delivery assignment
          </p>
        </div>
        <div className="px-4">
          <FieldRow
            label="Max Delivery Assignment Radius (km)"
            hint="System will only assign delivery boys within this radius from the vendor"
            name="maxAssignmentRadiusKm"
            value={fees.maxAssignmentRadiusKm}
            onChange={handleChange}
          />
          <FieldRow
            label="Max Multi-Vendor Distance (km)"
            hint="Prevents users from adding a 2nd item to cart if its vendor is further than this distance from the 1st vendor"
            name="maxCartVendorDistanceKm"
            value={fees.maxCartVendorDistanceKm}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* ─── FORWARD DELIVERY ─────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100">
          <p className="text-xs font-black text-indigo-700 uppercase tracking-widest">
            📦 Forward Delivery — Base Distance Formula
          </p>
          <p className="text-xs text-indigo-500 mt-0.5">
            Applies to: Order accept → Vendor pickup → Customer delivery
          </p>
        </div>
        <div className="px-4">
          <FieldRow
            label="Base Fee (₹)"
            hint={`Flat fee paid for deliveries up to the free distance (0–${fees.freeKms} km)`}
            name="baseFee"
            value={fees.baseFee}
            onChange={handleChange}
          />
          <FieldRow
            label="Free Distance (km)"
            hint="Deliveries within this distance earn only the base fee"
            name="freeKms"
            value={fees.freeKms}
            onChange={handleChange}
          />
          <FieldRow
            label="Per-KM Fee (₹)"
            hint={`Earned per km beyond the free distance (after ${fees.freeKms} km)`}
            name="perKmFee"
            value={fees.perKmFee}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* ─── VENDOR STOP FEE ─────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-violet-50 border-b border-violet-100">
          <p className="text-xs font-black text-violet-700 uppercase tracking-widest">
            🏪 Multi-Vendor Pickup Stop Fee
          </p>
          <p className="text-xs text-violet-500 mt-0.5">
            Extra fee per vendor stop during forward delivery. 0 for single-vendor orders.
          </p>
        </div>
        <div className="px-4">
          <FieldRow
            label="Per Vendor Pickup Stop Fee (₹)"
            hint="Added once per vendor stop (multi-vendor orders only)"
            name="perVendorStopFee"
            value={fees.perVendorStopFee}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* ─── RETURN DELIVERY ─────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-rose-50 border-b border-rose-100">
          <p className="text-xs font-black text-rose-700 uppercase tracking-widest">
            🔄 Return Delivery — Vendor Dropoff Stop Fee
          </p>
          <p className="text-xs text-rose-500 mt-0.5">
            Applies to: Customer pickup → Vendor dropoff(s). Distance formula is shared with forward delivery.
          </p>
        </div>
        <div className="px-4">
          <FieldRow
            label="Per Vendor Dropoff Stop Fee (₹)"
            hint="Added once per vendor dropoff stop during return delivery (multi-vendor returns only)"
            name="perVendorDropoffFee"
            value={fees.perVendorDropoffFee}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* ─── LIVE PREVIEW ─────────────────────────────────────── */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <FiInfo className="text-gray-400" size={14} />
          <p className="text-xs font-black text-gray-600 uppercase tracking-widest">Live Earning Preview</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {[
            { label: 'Single-vendor, 2km', val: previewSingle(2), tag: 'forward' },
            { label: 'Single-vendor, 5km', val: previewSingle(5), tag: 'forward' },
            { label: '3 vendors, 2km last', val: previewMultiForward(2, 3), tag: 'multi-vendor' },
            { label: '3 vendors, 6km last', val: previewMultiForward(6, 3), tag: 'multi-vendor' },
            { label: 'Return 2km (1 vendor)', val: previewSingle(2), tag: 'return' },
            { label: 'Return 5km (2 vendors)', val: previewMultiReturn(5, 2), tag: 'return' },
          ].map(({ label, val, tag }) => (
            <div
              key={label}
              className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-3 py-2"
            >
              <span className="text-gray-600">{label}</span>
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                  tag === 'forward'
                    ? 'bg-indigo-50 text-indigo-600'
                    : tag === 'multi-vendor'
                    ? 'bg-violet-50 text-violet-600'
                    : 'bg-rose-50 text-rose-600'
                }`}>
                  {tag}
                </span>
                <span className="font-black text-gray-900">₹{val}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          id="save-delivery-fees-btn"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
        >
          <FiSave size={15} />
          {isSaving ? 'Saving…' : 'Save Delivery Fees'}
        </button>
      </div>
    </motion.div>
  );
};

export default DeliveryFeesSettings;
