import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import Vendor from '../../../models/Vendor.model.js';

const toApiVendor = (vendorDoc) => {
    const vendor = typeof vendorDoc?.toObject === 'function'
        ? vendorDoc.toObject()
        : (vendorDoc || {});

    const normalizedCommissionRate = Number(vendor.commissionRate);
    return {
        ...vendor,
        commissionRate: Number.isFinite(normalizedCommissionRate)
            ? normalizedCommissionRate / 100
            : 0
    };
};

// GET /api/admin/vendors
export const getAllVendors = asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20, search } = req.query;
    const numericPage = Number(page) || 1;
    const numericLimit = Number(limit) || 20;
    const skip = (numericPage - 1) * numericLimit;
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }, { storeName: new RegExp(search, 'i') }];

    const vendors = await Vendor.find(filter)
        .select('-password -otp -otpExpiry -bankDetails')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(numericLimit);
    const total = await Vendor.countDocuments(filter);
    res.status(200).json(
        new ApiResponse(200, {
            vendors: vendors.map(toApiVendor),
            total,
            page: numericPage,
            pages: Math.ceil(total / numericLimit)
        }, 'Vendors fetched.')
    );
});

// GET /api/admin/vendors/:id
export const getVendorDetail = asyncHandler(async (req, res) => {
    const vendor = await Vendor.findById(req.params.id).select('-password -otp -otpExpiry');
    if (!vendor) throw new ApiError(404, 'Vendor not found.');
    res.status(200).json(new ApiResponse(200, toApiVendor(vendor), 'Vendor detail fetched.'));
});

// PATCH /api/admin/vendors/:id/status
export const updateVendorStatus = asyncHandler(async (req, res) => {
    const { status, reason } = req.body;
    const allowed = ['approved', 'suspended', 'rejected'];
    if (!allowed.includes(status)) throw new ApiError(400, `Status must be one of: ${allowed.join(', ')}`);

    const vendor = await Vendor.findByIdAndUpdate(req.params.id, { status, suspensionReason: reason || '' }, { new: true });
    if (!vendor) throw new ApiError(404, 'Vendor not found.');
    res.status(200).json(new ApiResponse(200, toApiVendor(vendor), `Vendor ${status} successfully.`));
});

// PATCH /api/admin/vendors/:id/commission
export const updateCommissionRate = asyncHandler(async (req, res) => {
    const { commissionRate } = req.body;
    const parsedRate = Number(commissionRate);
    if (Number.isNaN(parsedRate) || parsedRate < 0) {
        throw new ApiError(400, 'Commission rate must be a valid non-negative number.');
    }
    const dbCommissionRate = parsedRate <= 1 ? parsedRate * 100 : parsedRate;
    if (dbCommissionRate > 100) throw new ApiError(400, 'Commission rate must be between 0 and 100.');

    const vendor = await Vendor.findByIdAndUpdate(req.params.id, { commissionRate: dbCommissionRate }, { new: true });
    if (!vendor) throw new ApiError(404, 'Vendor not found.');
    res.status(200).json(new ApiResponse(200, toApiVendor(vendor), 'Commission rate updated.'));
});
