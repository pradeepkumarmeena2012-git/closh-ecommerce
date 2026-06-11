import CancellationReason from '../../../models/CancellationReason.model.js';

// Get all cancellation reasons
export const getReasons = async (req, res) => {
    try {
        const reasons = await CancellationReason.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, reasons });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create a new cancellation reason
export const createReason = async (req, res) => {
    try {
        const { reason } = req.body;
        if (!reason) {
            return res.status(400).json({ success: false, message: 'Reason is required' });
        }
        const newReason = await CancellationReason.create({ reason });
        res.status(201).json({ success: true, reason: newReason, message: 'Reason added successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update a cancellation reason
export const updateReason = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, isActive } = req.body;
        const updated = await CancellationReason.findByIdAndUpdate(id, { reason, isActive }, { new: true });
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Reason not found' });
        }
        res.status(200).json({ success: true, reason: updated, message: 'Reason updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete a cancellation reason
export const deleteReason = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await CancellationReason.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Reason not found' });
        }
        res.status(200).json({ success: true, message: 'Reason deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
