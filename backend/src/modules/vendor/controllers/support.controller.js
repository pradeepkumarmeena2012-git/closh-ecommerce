import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import SupportTicket from '../../../models/SupportTicket.model.js';
import TicketType from '../../../models/TicketType.model.js';
import Admin from '../../../models/Admin.model.js';
import Vendor from '../../../models/Vendor.model.js';
import { createNotification } from '../../../services/notification.service.js';
import { emitEvent } from '../../../services/socket.service.js';

// POST /api/vendor/support/help-request
export const submitHelpRequest = asyncHandler(async (req, res) => {
    const { subject, message, categoryId, priority } = req.body;
    const vendorId = req.user.id;

    if (!subject || !message) {
        return res.status(400).json(new ApiResponse(400, null, 'Subject and message are required.'));
    }

    const vendor = await Vendor.findById(vendorId);
    const vendorName = vendor?.name || vendor?.storeName || 'Vendor';

    // Create a support ticket
    const ticket = await SupportTicket.create({
        vendorId,
        subject,
        ticketTypeId: categoryId || null,
        status: 'open',
        priority: priority || 'medium',
        isReadByAdmin: false,
        isReadByUser: true,
        lastMessageAt: new Date(),
        messages: [
            {
                senderId: vendorId,
                senderType: 'vendor',
                message,
                createdAt: new Date()
            },
            {
                senderId: null, // System/Admin message
                senderType: 'admin',
                message: `Hello ${vendorName}, how can we help you?`,
                createdAt: new Date()
            }
        ]
    });

    ticket.isReadByAdmin = true;
    await ticket.save();

    // Notify all active admins
    const admins = await Admin.find({ isActive: true }).select('_id');
    await Promise.all(
        admins.map((admin) =>
            createNotification({
                recipientId: admin._id,
                recipientType: 'admin',
                title: 'New Vendor Help Request',
                message: `Vendor Help Request: ${subject}`,
                type: 'system',
                data: {
                    ticketId: String(ticket._id),
                    vendorId: String(vendorId),
                },
            })
        )
    );

    // Emit real-time for admins
    emitEvent('admin_support', 'new_ticket', {
        ...ticket._doc,
        id: ticket._id,
        customer: { name: req.user.storeName || 'Vendor' },
        type: 'vendor'
    });

    res.status(201).json(new ApiResponse(201, ticket, 'Help request submitted successfully.'));
});

// GET /api/vendor/support/tickets
export const getVendorTickets = asyncHandler(async (req, res) => {
    const vendorId = req.user.id;
    const tickets = await SupportTicket.find({ vendorId })
        .populate('ticketTypeId', 'name')
        .sort({ updatedAt: -1 });
    res.status(200).json(new ApiResponse(200, tickets, 'Tickets fetched successfully.'));
});

// GET /api/vendor/support/tickets/:id
export const getVendorTicketById = asyncHandler(async (req, res) => {
    const vendorId = req.user.id;
    const ticketId = req.params.id;

    const ticket = await SupportTicket.findOne({ _id: ticketId, vendorId })
        .populate('ticketTypeId', 'name');
    if (!ticket) {
        return res.status(404).json(new ApiResponse(404, null, 'Ticket not found.'));
    }

    // Mark as read by vendor
    ticket.isReadByUser = true;
    await ticket.save();

    res.status(200).json(new ApiResponse(200, ticket, 'Ticket fetched successfully.'));
});

// POST /api/vendor/support/tickets/:id/messages
export const addVendorTicketMessage = asyncHandler(async (req, res) => {
    const { message } = req.body;
    const vendorId = req.user.id;
    const ticketId = req.params.id;

    if (!message) {
        return res.status(400).json(new ApiResponse(400, null, 'Message is required.'));
    }

    const ticket = await SupportTicket.findOne({ _id: ticketId, vendorId });
    if (!ticket) {
        return res.status(404).json(new ApiResponse(404, null, 'Ticket not found.'));
    }

    const newMessageObj = {
        senderId: vendorId,
        senderType: 'vendor',
        message,
        createdAt: new Date()
    };

    ticket.messages.push(newMessageObj);
    ticket.status = 'open'; // reopen if it was closed or something
    ticket.isReadByAdmin = false;
    ticket.isReadByUser = true;
    ticket.lastMessageAt = new Date();

    await ticket.save();

    // Real-time emission to the ticket room
    emitEvent(`ticket_${ticket._id}`, 'new_support_message', newMessageObj);

    res.status(200).json(new ApiResponse(200, newMessageObj, 'Message added successfully.'));
});

// GET /api/vendor/support/ticket-types
export const getTicketTypes = asyncHandler(async (req, res) => {
    const ticketTypes = await TicketType.find({ isActive: true }).sort({ name: 1 });
    const normalized = ticketTypes.map(t => ({
        ...t._doc,
        id: t._id
    }));
    res.status(200).json(new ApiResponse(200, normalized, 'Ticket types fetched successfully.'));
});
