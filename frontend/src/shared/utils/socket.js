import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class SocketService {
    constructor() {
        this.socket = null;
    }

    connect() {
        if (this.socket) return;

        this.socket = io(SOCKET_URL, {
            withCredentials: true,
            autoConnect: true,
            reconnection: true,
        });

        this.socket.on('connect', () => {
            console.log('🔌 Connected to Socket.io server');
        });

        this.socket.on('disconnect', () => {
            console.log('🔌 Disconnected from Socket.io server');
        });

        this.socket.on('connect_error', (error) => {
            console.error('🔌 Socket connection error:', error);
        });
    }

    joinRoom(room) {
        if (this.socket) {
            this.socket.emit('join_room', room);
            console.log(`🏠 Joined room: ${room}`);
        }
    }

    on(event, callback) {
        if (this.socket) {
            this.socket.on(event, callback);
        }
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
        }
    }
}

const socketService = new SocketService();
export default socketService;
