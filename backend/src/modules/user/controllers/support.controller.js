import SupportTicket from '../../../models/SupportTicket.model.js';
import Admin from '../../../models/Admin.model.js';
import User from '../../../models/User.model.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { ApiResponse } from '../../../utils/ApiResponse.js';
import { ApiError } from '../../../utils/ApiError.js';
import { createNotification } from '../../../services/notification.service.js';
import { emitEvent } from '../../../services/socket.service.js';

/**
 * @desc    Get all user's support tickets
 * @route   GET /api/user/support/tickets
 * @access  Private (Customer)
 */
export const getUserTickets = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const tickets = await SupportTicket.find({ userId })
        .sort({ updatedAt: -1 });

    res.status(200).json(new ApiResponse(200, tickets, 'Tickets fetched successfully'));
});

/**
 * @desc    Get ticket by ID
 * @route   GET /api/user/support/tickets/:id
 * @access  Private (Customer)
 */
export const getUserTicketById = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    const ticket = await SupportTicket.findOne({ _id: id, userId });
    if (!ticket) {
        throw new ApiError(404, 'Ticket not found');
    }

    // Mark as read by user
    ticket.isReadByUser = true;
    await ticket.save();

    res.status(200).json(new ApiResponse(200, ticket, 'Ticket details fetched successfully'));
});

/**
 * @desc    Create a new support ticket (Start Chat)
 * @route   POST /api/user/support/tickets
 * @access  Private (Customer)
 */
export const createSupportTicket = asyncHandler(async (req, res) => {
    const { subject, message, ticketTypeId } = req.body;
    const userId = req.user.id;

    if (!subject || !message) {
        throw new ApiError(400, 'Subject and message are required');
    }

    // Fetch user to get their name for the automated reply
    const user = await User.findById(userId);
    const userName = user?.name || 'User';

    const ticket = await SupportTicket.create({
        userId,
        subject,
        ticketTypeId: ticketTypeId || null,
        status: 'open',
        priority: 'medium',
        isReadByAdmin: false,
        isReadByUser: true,
        lastMessageAt: new Date(),
        messages: [
            {
                senderId: userId,
                senderType: 'user',
                message,
                createdAt: new Date()
            },
            {
                senderId: null, // System/Admin message
                senderType: 'admin',
                message: `Hello ${userName}, how can we help you?`, // Updated to use fetched userName
                createdAt: new Date()
            }
        ]
    });

    ticket.isReadByAdmin = true;
    await ticket.save();

    // Notify admins
    const admins = await Admin.find({ isActive: true }).select('_id');
    await Promise.all(admins.map(admin =>
        createNotification({
            recipientId: admin._id,
            recipientType: 'admin',
            title: 'New Support Ticket',
            message: `User ${req.user.name} started a support request: ${subject}`,
            type: 'system',
            data: { ticketId: String(ticket._id) }
        })
    ));

    // Emit real-time for admins
    emitEvent('admin_support', 'new_ticket', {
        ...ticket._doc,
        id: ticket._id,
        customer: { name: req.user.name, email: req.user.email },
        type: 'customer'
    });

    res.status(201).json(new ApiResponse(201, ticket, 'Support ticket created successfully'));
});

/**
 * @desc    Add message to existing ticket
 * @route   POST /api/user/support/tickets/:id/messages
 * @access  Private (Customer)
 */
export const addUserTicketMessage = asyncHandler(async (req, res) => {
    const { message } = req.body;
    const { id } = req.params;
    const userId = req.user.id;

    const ticket = await SupportTicket.findOne({ _id: id, userId });
    if (!ticket) {
        throw new ApiError(404, 'Ticket not found');
    }

    const newMessageObj = {
        senderId: userId,
        senderType: 'user',
        message: String(message || '').trim(),
        createdAt: new Date()
    };

    if (!newMessageObj.message) {
        throw new ApiError(400, 'Message is required');
    }

    ticket.messages.push(newMessageObj);
    ticket.status = 'open'; // Re-open if solved/closed? Or just keep current
    ticket.isReadByAdmin = false;
    ticket.isReadByUser = true;
    ticket.lastMessageAt = new Date();

    await ticket.save();

    // Emit real-time message
    emitEvent(`ticket_${ticket._id}`, 'new_support_message', newMessageObj);

    res.status(200).json(new ApiResponse(200, newMessageObj, 'Message sent successfully'));
});
