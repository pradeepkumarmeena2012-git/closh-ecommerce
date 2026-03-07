import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: [
                process.env.CLIENT_URL,
                'http://localhost:3000',
                'http://localhost:5173'
            ].filter(Boolean),
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    io.on('connection', (socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);

        socket.on('join_room', (room) => {
            socket.join(room);
            console.log(`🏠 Client ${socket.id} joined room: ${room}`);
        });

        socket.on('disconnect', () => {
            console.log(`🔌 Client disconnected: ${socket.id}`);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

/**
 * Emit events to specific rooms
 * @param {string} room - room name (e.g. user_123, vendor_456, delivery_partners)
 * @param {string} event - event name
 * @param {object} data - payload
 */
export const emitEvent = (room, event, data) => {
    if (io) {
        io.to(room).emit(event, data);
    }
};
