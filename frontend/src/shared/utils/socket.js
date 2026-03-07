import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class SocketService {
    constructor() {
        this.socket = null;
        this.rooms = new Set();
    }

    connect() {
        if (this.socket) return;

        this.socket = io(SOCKET_URL, {
            withCredentials: true,
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
            console.log('🔌 Connected to Socket.io server');
            // Re-join all rooms on reconnection
            this.rooms.forEach(room => {
                this.socket.emit('join_room', room);
                console.log(`🏠 Re-joined room: ${room}`);
            });
        });

        this.socket.on('disconnect', () => {
            console.log('🔌 Disconnected from Socket.io server');
        });

        this.socket.on('connect_error', (error) => {
            console.error('🔌 Socket connection error:', error);
        });
    }

    joinRoom(room) {
        this.rooms.add(room);
        if (this.socket && this.socket.connected) {
            this.socket.emit('join_room', room);
            console.log(`🏠 Joined room: ${room}`);
        } else if (this.socket) {
            console.log(`🏠 Queuing join for room: ${room} (waiting for connection)`);
        }
    }

    leaveRoom(room) {
        this.rooms.delete(room);
        if (this.socket) {
            this.socket.emit('leave_room', room);
        }
    }

    on(event, callback) {
        if (!this.socket) this.connect();
        this.socket.on(event, callback);
    }

    off(event) {
        if (this.socket) {
            this.socket.off(event);
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.rooms.clear();
        }
    }
}

const socketService = new SocketService();
export default socketService;
