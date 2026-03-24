import SupportTicket from '../../../models/SupportTicket.model.js';
import TicketType from '../../../models/TicketType.model.js';
import { ApiError } from '../../../utils/ApiError.js';
import { ApiResponse } from '../../../utils/ApiResponse.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { createNotification } from '../../../services/notification.service.js';
import { emitEvent } from '../../../services/socket.service.js';

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * @desc    Get all support tickets with filtering and pagination
 * @route   GET /api/admin/support/tickets
 * @access  Private (Admin)
 */
export const getAllTickets = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search = '', status, priority, type } = req.query;
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.max(parseInt(limit, 10) || 10, 1);

    const filter = {};

    if (type === 'customer') {
        filter.userId = { $ne: null };
    } else if (type === 'vendor') {
        filter.vendorId = { $ne: null };
    }

    if (status && status !== 'all') {
        filter.status = status;
    }

    if (priority && priority !== 'all') {
        filter.priority = priority;
    }

    if (search) {
        filter.$or = [
            { subject: { $regex: search, $options: 'i' } },
            // If search is an ID
            ...(search.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: search }] : [])
        ];
    }

    const tickets = await SupportTicket.find(filter)
        .populate('userId', 'name email phone')
        .populate('vendorId', 'storeName email')
        .populate('ticketTypeId', 'name')
        .sort({ updatedAt: -1 })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber);

    const total = await SupportTicket.countDocuments(filter);

    // Normalize for frontend
    const normalizedTickets = tickets.map(ticket => ({
        ...ticket._doc,
        id: ticket._id,
        customer: ticket.userId ? {
            name: ticket.userId.name,
            email: ticket.userId.email,
            phone: ticket.userId.phone
        } : (ticket.vendorId ? {
            name: ticket.vendorId.storeName || 'Vendor',
            email: ticket.vendorId.email
        } : { name: 'Anonymous' }),
        category: ticket.ticketTypeId ? ticket.ticketTypeId.name : 'General',
        lastUpdate: ticket.updatedAt
    }));

    res.status(200).json(
        new ApiResponse(200, {
            tickets: normalizedTickets,
            pagination: {
                total,
                page: pageNumber,
                limit: limitNumber,
                pages: Math.ceil(total / limitNumber)
            }
        }, 'Support tickets fetched successfully')
    );
});

/**
 * @desc    Get ticket details with messages
 * @route   GET /api/admin/support/tickets/:id
 * @access  Private (Admin)
 */
export const getTicketById = asyncHandler(async (req, res) => {
    const ticket = await SupportTicket.findById(req.params.id)
        .populate('userId', 'name email phone')
        .populate('vendorId', 'storeName email')
        .populate('ticketTypeId', 'name');

    if (!ticket) {
        throw new ApiError(404, 'Ticket not found');
    }

    // Normalize
    const normalized = {
        ...ticket._doc,
        id: ticket._id,
        customer: ticket.userId ? {
            name: ticket.userId.name,
            email: ticket.userId.email,
            phone: ticket.userId.phone
        } : (ticket.vendorId ? {
            name: ticket.vendorId.storeName || 'Vendor',
            email: ticket.vendorId.email
        } : { name: 'Anonymous' }),
        category: ticket.ticketTypeId ? ticket.ticketTypeId.name : 'General'
    };

    // Mark as read by admin if they are viewing it
    ticket.isReadByAdmin = true;
    await ticket.save();

    res.status(200).json(
        new ApiResponse(200, normalized, 'Ticket details fetched successfully')
    );
});

/**
 * @desc    Update ticket status
 * @route   PATCH /api/admin/support/tickets/:id/status
 * @access  Private (Admin)
 */
export const updateTicketStatus = asyncHandler(async (req, res) => {
    const { status, priority } = req.body;

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
        throw new ApiError(404, 'Ticket not found');
    }

    if (status) ticket.status = status;
    if (priority) ticket.priority = priority;

    await ticket.save();

    // Re-fetch or populate to get full details for the response
    const updatedTicket = await SupportTicket.findById(ticket._id)
        .populate('userId', 'name email phone')
        .populate('vendorId', 'storeName email')
        .populate('ticketTypeId', 'name');

    // Normalize
    const normalized = {
        ...updatedTicket._doc,
        id: updatedTicket._id,
        customer: updatedTicket.userId ? {
            name: updatedTicket.userId.name,
            email: updatedTicket.userId.email,
            phone: updatedTicket.userId.phone
        } : (updatedTicket.vendorId ? {
            name: updatedTicket.vendorId.storeName || 'Vendor',
            email: updatedTicket.vendorId.email
        } : { name: 'Anonymous' }),
        category: updatedTicket.ticketTypeId ? updatedTicket.ticketTypeId.name : 'General'
    };

    // Emit real-time update
    emitEvent(`ticket_${ticket._id}`, 'ticket_status_updated', normalized);

    res.status(200).json(
        new ApiResponse(200, normalized, 'Ticket status updated successfully')
    );
});

/**
 * @desc    Add message to ticket
 * @route   POST /api/admin/support/tickets/:id/messages
 * @access  Private (Admin)
 */
export const addTicketMessage = asyncHandler(async (req, res) => {
    const { message } = req.body;
    const trimmedMessage = String(message || '').trim();
    if (!trimmedMessage) {
        throw new ApiError(400, 'Message is required');
    }

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
        throw new ApiError(404, 'Ticket not found');
    }

    const newMessageObj = {
        senderId: req.user._id,
        senderType: 'admin',
        message: trimmedMessage,
        createdAt: new Date()
    };

    ticket.messages.push(newMessageObj);

    // Automatically set to in_progress if an admin replies
    if (ticket.status === 'open') {
        ticket.status = 'in_progress';
    }

    ticket.isReadByAdmin = true;
    ticket.isReadByUser = false;
    ticket.lastMessageAt = new Date();

    await ticket.save();

    // Real-time emission to the ticket room
    emitEvent(`ticket_${ticket._id}`, 'new_support_message', newMessageObj);

    // Send notification to the vendor/user if applicable
    if (ticket.vendorId) {
        await createNotification({
            recipientId: ticket.vendorId,
            recipientType: 'vendor',
            title: 'Support Ticket Reply',
            message: `Admin responded to your ticket: ${ticket.subject}`,
            type: 'system',
            data: { ticketId: String(ticket._id), sound: 'support_reply' }
        });
    } else if (ticket.userId) {
        await createNotification({
            recipientId: ticket.userId,
            recipientType: 'user',
            title: 'Support Ticket Reply',
            message: `Admin responded to your request: ${ticket.subject}`,
            type: 'system',
            data: { ticketId: String(ticket._id), sound: 'support_reply' }
        });
    }

    res.status(200).json(
        new ApiResponse(200, ticket.messages[ticket.messages.length - 1], 'Message added successfully')
    );
});

/**
 * @desc    Get all ticket types
 * @route   GET /api/admin/support/ticket-types
 * @access  Private (Admin)
 */
export const getAllTicketTypes = asyncHandler(async (req, res) => {
    const { status } = req.query;
    const filter = {};

    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;

    const ticketTypes = await TicketType.find(filter).sort({ createdAt: -1 });

    const normalized = ticketTypes.map((type) => ({
        ...type._doc,
        id: type._id,
        status: type.isActive ? 'active' : 'inactive',
    }));

    res.status(200).json(new ApiResponse(200, normalized, 'Ticket types fetched successfully'));
});

/**
 * @desc    Create ticket type
 * @route   POST /api/admin/support/ticket-types
 * @access  Private (Admin)
 */
export const createTicketType = asyncHandler(async (req, res) => {
    const { name, description, status } = req.body;
    const trimmedName = String(name || '').trim();

    if (!trimmedName) throw new ApiError(400, 'Ticket type name is required');

    const existing = await TicketType.findOne({ name: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') });
    if (existing) throw new ApiError(409, 'Ticket type already exists');

    const ticketType = await TicketType.create({
        name: trimmedName,
        description: String(description || '').trim(),
        isActive: status ? status === 'active' : true,
    });

    res.status(201).json(
        new ApiResponse(
            201,
            { ...ticketType._doc, id: ticketType._id, status: ticketType.isActive ? 'active' : 'inactive' },
            'Ticket type created successfully'
        )
    );
});

/**
 * @desc    Update ticket type
 * @route   PUT /api/admin/support/ticket-types/:id
 * @access  Private (Admin)
 */
export const updateTicketType = asyncHandler(async (req, res) => {
    const { name, description, status } = req.body;
    const ticketType = await TicketType.findById(req.params.id);

    if (!ticketType) throw new ApiError(404, 'Ticket type not found');

    if (name !== undefined) {
        const trimmedName = String(name || '').trim();
        if (!trimmedName) throw new ApiError(400, 'Ticket type name is required');

        const existing = await TicketType.findOne({
            _id: { $ne: req.params.id },
            name: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i'),
        });
        if (existing) throw new ApiError(409, 'Ticket type already exists');

        ticketType.name = trimmedName;
    }

    if (description !== undefined) {
        ticketType.description = String(description || '').trim();
    }

    if (status !== undefined) {
        ticketType.isActive = String(status).toLowerCase() === 'active';
    }

    await ticketType.save();

    res.status(200).json(
        new ApiResponse(
            200,
            { ...ticketType._doc, id: ticketType._id, status: ticketType.isActive ? 'active' : 'inactive' },
            'Ticket type updated successfully'
        )
    );
});

/**
 * @desc    Delete ticket type
 * @route   DELETE /api/admin/support/ticket-types/:id
 * @access  Private (Admin)
 */
export const deleteTicketType = asyncHandler(async (req, res) => {
    const ticketType = await TicketType.findByIdAndDelete(req.params.id);
    if (!ticketType) throw new ApiError(404, 'Ticket type not found');

    res.status(200).json(new ApiResponse(200, null, 'Ticket type deleted successfully'));
});
