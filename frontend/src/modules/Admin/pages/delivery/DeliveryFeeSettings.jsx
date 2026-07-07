import { useState, useEffect } from 'react';
import { FiSave, FiTruck, FiInfo, FiRefreshCw } from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import * as settingsService from '../../../../shared/services/settingsService';

// ─── Defaults ────────────────────────────────────────────────────────────────
const DEFAULTS = {
    baseFee:             25,
    freeKms:             3,
    perKmFee:            10,
    perVendorStopFee:    6,
    perVendorDropoffFee: 6,
};

// ─── Helper sub-components ────────────────────────────────────────────────────
const FieldRow = ({ label, hint, name, suffix = '₹', value, onChange }) => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-3.5 border-b border-gray-100 last:border-0">
        <div className="flex-1 min-w-0">
            <label htmlFor={name} className="block text-sm font-semibold text-gray-800">
                {label}
            </label>
            {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-40 shrink-0">
            {suffix === '₹' && <span className="text-gray-400 text-sm font-bold">₹</span>}
            <input
                id={name}
                name={name}
                type="number"
                min={0}
                step={suffix === 'km' ? 0.5 : 1}
                value={value}
                onChange={onChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition bg-gray-50"
            />
            {suffix === 'km' && <span className="text-gray-400 text-xs font-semibold shrink-0">km</span>}
        </div>
    </div>
);

const SectionCard = ({ color, emoji, title, subtitle, children }) => {
    const colors = {
        indigo: 'bg-indigo-50 border-indigo-100 text-indigo-700 text-indigo-500',
        violet: 'bg-violet-50 border-violet-100 text-violet-700 text-violet-500',
        rose:   'bg-rose-50 border-rose-100 text-rose-700 text-rose-500',
    };
    const [headerBg, headerBorder, titleColor, subColor] = colors[color].split(' ');

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className={`px-5 py-3.5 ${headerBg} border-b ${headerBorder}`}>
                <p className={`text-xs font-black uppercase tracking-widest ${titleColor}`}>
                    {emoji} {title}
                </p>
                <p className={`text-xs mt-0.5 ${subColor}`}>{subtitle}</p>
            </div>
            <div className="px-5">{children}</div>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const DeliveryFeeSettings = () => {
    const [fees, setFees] = useState({ ...DEFAULTS });
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // ── Load current config from backend ──────────────────────────────────────
    const loadConfig = async () => {
        setIsLoading(true);
        try {
            const res = await settingsService.getAllSettings();
            const allSettings = res?.data?.settings || res?.data || {};
            const deliveryFees = allSettings?.delivery_fees?.value ?? allSettings?.delivery_fees ?? null;
            if (deliveryFees && typeof deliveryFees === 'object') {
                setFees({ ...DEFAULTS, ...deliveryFees });
            }
        } catch (err) {
            console.error('[DeliveryFeeSettings] Load error:', err.message);
            toast.error('Failed to load current fee settings');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadConfig(); }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFees((prev) => ({ ...prev, [name]: Number(value) }));
    };

    const handleSave = async () => {
        if (Object.values(fees).some((v) => v < 0)) {
            toast.error('All values must be 0 or greater');
            return;
        }
        setIsSaving(true);
        try {
            await settingsService.updateAdminSetting('delivery_fees', fees);
            toast.success('Delivery fee settings saved!');
        } catch (err) {
            toast.error('Failed to save. Please try again.');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    // ── Live preview helpers ──────────────────────────────────────────────────
    const distanceFee = (km) => {
        return Math.round(km * fees.perKmFee);
    };
    const forwardEarning = (km, routingKm) =>
        distanceFee(km) + (routingKm > 0 ? routingKm * fees.perVendorStopFee : 0);
    const returnEarning  = (km, routingKm) =>
        distanceFee(km) + (routingKm > 0 ? routingKm * fees.perVendorDropoffFee : 0);

    const previews = [
        { label: 'Single vendor, 2 km',     val: forwardEarning(2, 0), tag: '📦 Forward', color: 'indigo' },
        { label: 'Single vendor, 5 km',     val: forwardEarning(5, 0), tag: '📦 Forward', color: 'indigo' },
        { label: '3 vendors, 4km route + 2km last', val: forwardEarning(2, 4), tag: '🏪 Multi-stop', color: 'violet' },
        { label: '3 vendors, 4km route + 6km last', val: forwardEarning(6, 4), tag: '🏪 Multi-stop', color: 'violet' },
        { label: 'Return 2 km (1 vendor)',   val: returnEarning(2, 0),  tag: '🔄 Return', color: 'rose' },
        { label: 'Return 5 km (2 vendors, 3km route)',  val: returnEarning(5, 3),  tag: '🔄 Return', color: 'rose' },
    ];

    const tagColors = {
        indigo: 'bg-indigo-50 text-indigo-700',
        violet: 'bg-violet-50 text-violet-700',
        rose:   'bg-rose-50 text-rose-600',
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-400 gap-3">
                <FiRefreshCw className="animate-spin" size={20} />
                <span className="text-sm">Loading fee settings…</span>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl space-y-6"
        >
            {/* Page Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                        <FiTruck className="text-indigo-600" size={20} />
                        Delivery Earning Fees
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        All values are dynamic — changes apply to every future delivery completion.
                    </p>
                </div>
                <button
                    onClick={loadConfig}
                    title="Reload from server"
                    className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition shrink-0"
                >
                    <FiRefreshCw size={16} />
                </button>
            </div>

            {/* ── SECTION 1: Standard Distance Fee ── */}
            <SectionCard
                color="indigo"
                emoji="📏"
                title="Standard Distance Fee"
                subtitle="Calculated as: Distance × Per KM Fee"
            >
                <FieldRow
                    label="Per KM Fee (₹)"
                    hint="Rate multiplied by the total distance."
                    name="perKmFee"
                    value={fees.perKmFee}
                    onChange={handleChange}
                />
            </SectionCard>

            {/* ── SECTION 2: Vendor pickup stop fee ── */}
            <SectionCard
                color="violet"
                emoji="🏪"
                title="Multi-Vendor Routing Distance Fee"
                subtitle="Extra fee per KM for distance covered travelling between vendors — only for multi-vendor orders (0 for single-vendor)"
            >
                <FieldRow
                    label="Per KM Vendor Routing Fee (₹)"
                    hint="Multiplied by the total distance between vendor stops (e.g. V1 -> V2 -> V3 distance)"
                    name="perVendorStopFee"
                    value={fees.perVendorStopFee}
                    onChange={handleChange}
                />
            </SectionCard>

            {/* ── SECTION 3: Return delivery ── */}
            <SectionCard
                color="rose"
                emoji="🔄"
                title="Return Delivery — Vendor Dropoff Distance Fee"
                subtitle="Applies to: Customer pickup → Vendor dropoffs. Base distance is Customer -> Last Vendor."
            >
                <FieldRow
                    label="Per KM Dropoff Routing Fee (₹)"
                    hint="Multiplied by the total distance between vendor dropoffs (multi-vendor returns only)"
                    name="perVendorDropoffFee"
                    value={fees.perVendorDropoffFee}
                    onChange={handleChange}
                />
            </SectionCard>

            {/* ── SECTION 4: Live Preview ── */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-1.5 mb-4">
                    <FiInfo className="text-gray-400" size={14} />
                    <p className="text-xs font-black text-gray-600 uppercase tracking-widest">
                        Live Earning Preview
                    </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {previews.map(({ label, val, tag, color }) => (
                        <div
                            key={label}
                            className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-3.5 py-2.5"
                        >
                            <span className="text-xs text-gray-600">{label}</span>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${tagColors[color]}`}>
                                    {tag}
                                </span>
                                <span className="text-sm font-black text-gray-900">₹{val}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Save Button ── */}
            <div className="flex justify-end pt-1">
                <button
                    id="save-delivery-fee-settings-btn"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
                >
                    <FiSave size={15} />
                    {isSaving ? 'Saving…' : 'Save Fee Settings'}
                </button>
            </div>
        </motion.div>
    );
};

export default DeliveryFeeSettings;
