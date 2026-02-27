import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import Admin from '../../../models/Admin.model.js';

// Get all employees
export const getAllEmployees = asyncHandler(async (req, res) => {
    // List all admins except the superadmin themselves (or all non-superadmin)
    const employees = await Admin.find({ role: { $ne: 'superadmin' } })
        .select('-password')
        .sort({ createdAt: -1 });

    res.status(200).json(new ApiResponse(200, employees, 'Employees fetched successfully.'));
});

// Create new employee
export const createEmployee = asyncHandler(async (req, res) => {
    const { name, email, password, role, permissions } = req.body;

    if (!name || !email || !password) {
        throw new ApiError(400, 'Name, email and password are required.');
    }

    const existing = await Admin.findOne({ email });
    if (existing) throw new ApiError(400, 'Email already exists.');

    const employee = await Admin.create({
        name,
        email,
        password,
        role: role || 'employee',
        permissions: permissions || [],
        addedBy: req.user.id
    });

    const employeeObj = employee.toObject();
    delete employeeObj.password;

    res.status(201).json(new ApiResponse(201, employeeObj, 'Employee created successfully.'));
});

// Update employee permissions/details
export const updateEmployee = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, role, permissions, isActive } = req.body;

    const employee = await Admin.findById(id);
    if (!employee) throw new ApiError(404, 'Employee not found.');

    // Safety check: Don't let superadmins be modified through this route easily
    if (employee.role === 'superadmin') {
        throw new ApiError(403, 'Superadmin profile cannot be modified via employee management.');
    }

    if (name) employee.name = name;
    if (role) employee.role = role;
    if (permissions) employee.permissions = permissions;
    if (isActive !== undefined) employee.isActive = isActive;

    await employee.save();

    const updated = employee.toObject();
    delete updated.password;

    res.status(200).json(new ApiResponse(200, updated, 'Employee updated successfully.'));
});

// Delete employee
export const deleteEmployee = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const employee = await Admin.findById(id);

    if (!employee) throw new ApiError(404, 'Employee not found.');
    if (employee.role === 'superadmin') {
        throw new ApiError(403, 'Superadmin cannot be deleted.');
    }

    await Admin.findByIdAndDelete(id);

    res.status(200).json(new ApiResponse(200, null, 'Employee deleted successfully.'));
});
