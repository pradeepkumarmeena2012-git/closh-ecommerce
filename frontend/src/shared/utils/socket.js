import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class SocketService {
    constructor() {
        this.socket = null;
        this.rooms = new Set();
        this._queuedListeners = [];
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

        // Attach any queued listeners from before connect was called
        if (this._queuedListeners.length > 0) {
            this._queuedListeners.forEach(({ event, callback }) => {
                this.socket.on(event, callback);
            });
            this._queuedListeners = [];
        }

        this.socket.on('connect', () => {
            console.log('🔌 [SOCKET] Connected to server:', this.socket.id);
            // Re-join all rooms on reconnection
            this.rooms.forEach(room => {
                console.log(`🏠 [SOCKET] Re-joining room: ${room}`);
                this.socket.emit('join_room', room);
            });
        });

        this.socket.on('disconnect', (reason) => {
            console.log('🔌 [SOCKET] Disconnected:', reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('🔌 [SOCKET] Connection error:', error.message);
        });
    }

    joinRoom(room) {
        if (!room) return;
        this.rooms.add(room);
        console.log(`🏠 [SOCKET] Joining room: ${room}`);
        if (this.socket && this.socket.connected) {
            this.socket.emit('join_room', room);
        }
    }

    leaveRoom(room) {
        if (!room) return;
        this.rooms.delete(room);
        console.log(`🏠 [SOCKET] Leaving room: ${room}`);
        if (this.socket) {
            this.socket.emit('leave_room', room);
        }
    }

    on(event, callback) {
        console.log(`👂 [SOCKET] Listening for: ${event}`);
        if (this.socket) {
            this.socket.on(event, callback);
        } else {
            console.log(`⏳ [SOCKET] Queuing listener for: ${event}`);
            this._queuedListeners.push({ event, callback });
        }
    }

    off(event) {
        if (this.socket) {
            this.socket.off(event);
        }
        this._queuedListeners = this._queuedListeners.filter(l => l.event !== event);
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.rooms.clear();
            this._queuedListeners = [];
        }
    }
}

const socketService = new SocketService();
export default socketService;
