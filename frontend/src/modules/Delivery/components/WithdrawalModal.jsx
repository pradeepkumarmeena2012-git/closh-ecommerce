import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCheckCircle, FiDollarSign, FiCreditCard, FiAlertCircle, FiSmartphone } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../../shared/utils/api';

const WithdrawalModal = ({ isOpen, onClose, balance, onWithdrawalRequested }) => {
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('upi'); // 'upi' or 'bank'
    const [upiId, setUpiId] = useState('');
    const [accountName, setAccountName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [bankName, setBankName] = useState('');
    const [ifscCode, setIfscCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [touchedFields, setTouchedFields] = useState({});

    // --- Validation helpers ---
    const validateUpiId = (value) => {
        if (!value.trim()) return 'UPI ID is required';
        // UPI format: alphanumeric/dots/hyphens @ alphanumeric provider
        const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
        if (!upiRegex.test(value.trim())) return 'Invalid UPI ID format (e.g. name@upi)';
        if (value.trim().length < 5) return 'UPI ID is too short';
        if (value.trim().length > 50) return 'UPI ID is too long';
        return '';
    };

    const validateAccountName = (value) => {
        if (!value.trim()) return 'Account holder name is required';
        if (value.trim().length < 3) return 'Name must be at least 3 characters';
        if (value.trim().length > 100) return 'Name is too long';
        const nameRegex = /^[a-zA-Z\s.]+$/;
        if (!nameRegex.test(value.trim())) return 'Name can only contain letters, spaces & dots';
        return '';
    };

    const validateAccountNumber = (value) => {
        if (!value.trim()) return 'Account number is required';
        const numRegex = /^[0-9]+$/;
        if (!numRegex.test(value.trim())) return 'Account number must contain only digits';
        if (value.trim().length < 9) return 'Account number must be at least 9 digits';
        if (value.trim().length > 18) return 'Account number cannot exceed 18 digits';
        return '';
    };

    const validateBankName = (value) => {
        if (!value.trim()) return 'Bank name is required';
        if (value.trim().length < 2) return 'Bank name is too short';
        const bankRegex = /^[a-zA-Z\s.&'-]+$/;
        if (!bankRegex.test(value.trim())) return 'Invalid bank name';
        return '';
    };

    const validateIfscCode = (value) => {
        if (!value.trim()) return 'IFSC code is required';
        // Indian IFSC: 4 letters + 0 + 6 alphanumeric
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        if (!ifscRegex.test(value.trim().toUpperCase())) return 'Invalid IFSC format (e.g. SBIN0001234)';
        return '';
    };

    const validateField = (fieldName, value) => {
        switch (fieldName) {
            case 'upiId': return validateUpiId(value);
            case 'accountName': return validateAccountName(value);
            case 'accountNumber': return validateAccountNumber(value);
            case 'bankName': return validateBankName(value);
            case 'ifscCode': return validateIfscCode(value);
            default: return '';
        }
    };

    const handleFieldBlur = (fieldName, value) => {
        setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
        const err = validateField(fieldName, value);
        setFieldErrors(prev => ({ ...prev, [fieldName]: err }));
    };

    const handleFieldChange = (fieldName, value, setter) => {
        setter(value);
        // If already touched, validate on change too for instant feedback
        if (touchedFields[fieldName]) {
            const err = validateField(fieldName, value);
            setFieldErrors(prev => ({ ...prev, [fieldName]: err }));
        }
    };

    const resetForm = () => {
        setAmount('');
        setPaymentMethod('upi');
        setUpiId('');
        setAccountName('');
        setAccountNumber('');
        setBankName('');
        setIfscCode('');
        setError(null);
        setSuccess(false);
        setFieldErrors({});
        setTouchedFields({});
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        
        if (!numAmount || numAmount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }
        if (numAmount > balance) {
            toast.error(`Insufficient balance. Available: ₹${balance}`);
            return;
        }

        // Validate all payment detail fields
        let hasErrors = false;
        const newErrors = {};
        const allTouched = {};

        if (paymentMethod === 'upi') {
            const upiErr = validateUpiId(upiId);
            if (upiErr) { newErrors.upiId = upiErr; hasErrors = true; }
            allTouched.upiId = true;
        } else {
            const nameErr = validateAccountName(accountName);
            const accErr = validateAccountNumber(accountNumber);
            const bankErr = validateBankName(bankName);
            const ifscErr = validateIfscCode(ifscCode);
            if (nameErr) { newErrors.accountName = nameErr; hasErrors = true; }
            if (accErr) { newErrors.accountNumber = accErr; hasErrors = true; }
            if (bankErr) { newErrors.bankName = bankErr; hasErrors = true; }
            if (ifscErr) { newErrors.ifscCode = ifscErr; hasErrors = true; }
            allTouched.accountName = true;
            allTouched.accountNumber = true;
            allTouched.bankName = true;
            allTouched.ifscCode = true;
        }

        setFieldErrors(prev => ({ ...prev, ...newErrors }));
        setTouchedFields(prev => ({ ...prev, ...allTouched }));

        if (hasErrors) {
            toast.error('Please fix the errors before submitting');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        const bankDetails = paymentMethod === 'upi'
            ? { upiId: upiId.trim() }
            : {
                accountName: accountName.trim(),
                accountNumber: accountNumber.trim(),
                bankName: bankName.trim(),
                ifscCode: ifscCode.trim().toUpperCase()
            };

        try {
            await api.post('/delivery/withdrawals', { amount: numAmount, bankDetails });
            setSuccess(true);
            if (onWithdrawalRequested) onWithdrawalRequested();
            toast.success('Withdrawal request submitted!');
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to submit withdrawal request.';
            setError(msg);
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4`}>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white rounded-3xl w-full max-w-sm overflow-hidden relative shadow-2xl max-h-[90vh] flex flex-col"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-primary-600 to-emerald-600 p-6 text-white shrink-0">
                        <button onClick={handleClose} className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors">
                            <FiX className="text-2xl" />
                        </button>
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                <FiDollarSign className="text-2xl" />
                            </div>
                            <h2 className="text-xl font-bold">Request Payout</h2>
                            <p className="text-white/80 text-sm">Available: ₹{balance}</p>
                        </div>
                    </div>

                    <div className="p-6 overflow-y-auto flex-1">
                        {!success ? (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Amount Input */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Withdrawal Amount (₹)</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</div>
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="Min. ₹1"
                                            className="w-full pl-10 pr-4 py-4 rounded-2xl border-2 border-gray-100 focus:border-primary-500 transition-all outline-none font-bold text-lg"
                                            required
                                            min="1"
                                            max={balance}
                                        />
                                    </div>
                                </div>

                                {/* Payment Method Selector */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Payment Method</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod('upi')}
                                            className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 font-bold text-sm transition-all ${
                                                paymentMethod === 'upi'
                                                    ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-lg shadow-primary-100'
                                                    : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                                            }`}
                                        >
                                            <FiSmartphone className="text-lg" />
                                            UPI
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod('bank')}
                                            className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 font-bold text-sm transition-all ${
                                                paymentMethod === 'bank'
                                                    ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-lg shadow-primary-100'
                                                    : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                                            }`}
                                        >
                                            <FiCreditCard className="text-lg" />
                                            Bank
                                        </button>
                                    </div>
                                </div>

                                {/* UPI Fields */}
                                <AnimatePresence mode="wait">
                                    {paymentMethod === 'upi' ? (
                                        <motion.div
                                            key="upi"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                            className="space-y-2"
                                        >
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">UPI ID <span className="text-red-400">*</span></label>
                                            <input
                                                type="text"
                                                value={upiId}
                                                onChange={(e) => handleFieldChange('upiId', e.target.value, setUpiId)}
                                                onBlur={() => handleFieldBlur('upiId', upiId)}
                                                placeholder="example@upi"
                                                className={`w-full px-4 py-3.5 rounded-2xl border-2 transition-all outline-none font-semibold text-sm ${touchedFields.upiId && fieldErrors.upiId ? 'border-red-300 bg-red-50/30 focus:border-red-400' : 'border-gray-100 focus:border-primary-500'}`}
                                            />
                                            {touchedFields.upiId && fieldErrors.upiId && (
                                                <p className="text-red-500 text-[11px] font-semibold mt-1 ml-1">{fieldErrors.upiId}</p>
                                            )}
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="bank"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                            className="space-y-3"
                                        >
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Account Holder Name <span className="text-red-400">*</span></label>
                                                <input
                                                    type="text"
                                                    value={accountName}
                                                    onChange={(e) => handleFieldChange('accountName', e.target.value, setAccountName)}
                                                    onBlur={() => handleFieldBlur('accountName', accountName)}
                                                    placeholder="Full name as on bank account"
                                                    className={`w-full px-4 py-3.5 rounded-2xl border-2 transition-all outline-none font-semibold text-sm ${touchedFields.accountName && fieldErrors.accountName ? 'border-red-300 bg-red-50/30 focus:border-red-400' : 'border-gray-100 focus:border-primary-500'}`}
                                                />
                                                {touchedFields.accountName && fieldErrors.accountName && (
                                                    <p className="text-red-500 text-[11px] font-semibold mt-1 ml-1">{fieldErrors.accountName}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Account Number <span className="text-red-400">*</span></label>
                                                <input
                                                    type="text"
                                                    value={accountNumber}
                                                    onChange={(e) => {
                                                        // Only allow digits
                                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                                        handleFieldChange('accountNumber', val, setAccountNumber);
                                                    }}
                                                    onBlur={() => handleFieldBlur('accountNumber', accountNumber)}
                                                    placeholder="Enter account number"
                                                    inputMode="numeric"
                                                    maxLength={18}
                                                    className={`w-full px-4 py-3.5 rounded-2xl border-2 transition-all outline-none font-semibold text-sm font-mono ${touchedFields.accountNumber && fieldErrors.accountNumber ? 'border-red-300 bg-red-50/30 focus:border-red-400' : 'border-gray-100 focus:border-primary-500'}`}
                                                />
                                                {touchedFields.accountNumber && fieldErrors.accountNumber && (
                                                    <p className="text-red-500 text-[11px] font-semibold mt-1 ml-1">{fieldErrors.accountNumber}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Bank Name <span className="text-red-400">*</span></label>
                                                <input
                                                    type="text"
                                                    value={bankName}
                                                    onChange={(e) => handleFieldChange('bankName', e.target.value, setBankName)}
                                                    onBlur={() => handleFieldBlur('bankName', bankName)}
                                                    placeholder="e.g. State Bank of India"
                                                    className={`w-full px-4 py-3.5 rounded-2xl border-2 transition-all outline-none font-semibold text-sm ${touchedFields.bankName && fieldErrors.bankName ? 'border-red-300 bg-red-50/30 focus:border-red-400' : 'border-gray-100 focus:border-primary-500'}`}
                                                />
                                                {touchedFields.bankName && fieldErrors.bankName && (
                                                    <p className="text-red-500 text-[11px] font-semibold mt-1 ml-1">{fieldErrors.bankName}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">IFSC Code <span className="text-red-400">*</span></label>
                                                <input
                                                    type="text"
                                                    value={ifscCode}
                                                    onChange={(e) => {
                                                        const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                                                        handleFieldChange('ifscCode', val, setIfscCode);
                                                    }}
                                                    onBlur={() => handleFieldBlur('ifscCode', ifscCode)}
                                                    placeholder="e.g. SBIN0001234"
                                                    maxLength={11}
                                                    className={`w-full px-4 py-3.5 rounded-2xl border-2 transition-all outline-none font-semibold text-sm font-mono uppercase ${touchedFields.ifscCode && fieldErrors.ifscCode ? 'border-red-300 bg-red-50/30 focus:border-red-400' : 'border-gray-100 focus:border-primary-500'}`}
                                                />
                                                {touchedFields.ifscCode && fieldErrors.ifscCode && (
                                                    <p className="text-red-500 text-[11px] font-semibold mt-1 ml-1">{fieldErrors.ifscCode}</p>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="bg-blue-50 p-4 rounded-2xl flex gap-3 text-sm text-blue-700">
                                    <FiAlertCircle className="text-xl flex-shrink-0" />
                                    <p>Withdrawals are settled within 24-48 hours. You can request once every 7 days.</p>
                                </div>

                                {error && <p className="text-red-500 text-sm text-center font-semibold">{error}</p>}

                                <button
                                    type="submit"
                                    disabled={isSubmitting || !amount || amount <= 0}
                                    className="w-full py-4 gradient-green text-white rounded-2xl font-bold text-lg shadow-lg shadow-green-200/50 hover:shadow-xl hover:shadow-green-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? 'Processing...' : 'Request Payout'}
                                </button>
                            </form>
                        ) : (
                            <div className="text-center py-4 space-y-4">
                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2 scale-110">
                                    <FiCheckCircle className="text-3xl" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">Request Received!</h3>
                                    <p className="text-gray-500 text-sm mt-1 px-4 text-center">Your request has been sent for admin approval. We'll update you soon.</p>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="w-full py-3 bg-gray-100 text-gray-800 rounded-2xl font-bold"
                                >
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default WithdrawalModal;
