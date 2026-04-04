import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

// In production, force the API URL to our production domain if env is missing
const SOCKET_URL = import.meta.env.VITE_API_URL || 'https://api.closh.in';

class SocketService {
    constructor() {
        this.socket = null;
        this.rooms = new Set();
        this._queuedListeners = [];
    }

    connect() {
        if (this.socket?.connected) return;

        this.socket = io(SOCKET_URL, {
            withCredentials: true,
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 20,
            reconnectionDelay: 1000,
            transports: ['websocket', 'polling'],
        });

        // Attach any queued listeners
        if (this._queuedListeners.length > 0) {
            this._queuedListeners.forEach(({ event, callback }) => {
                this.socket.on(event, callback);
            });
            this._queuedListeners = [];
        }

        this.socket.on('connect', () => {
            console.log('🔌 [SOCKET] Connected:', this.socket.id);
            toast.success('System Connected (Live)', { icon: '⚡', id: 'socket-status' });
            
            // Re-join all general rooms
            this.rooms.forEach(room => this.socket.emit('join_room', room));
            
            // Critical: If we have a stored delivery ID, re-register it automatically on every connect
            const storedId = localStorage.getItem('delivery_boy_id');
            if (storedId) {
                 console.log(`🚴 [SOCKET] Auto-restoring registration for: ${storedId}`);
                 this.socket.emit('delivery_register', storedId);
            }
        });

        this.socket.on('disconnect', (reason) => {
            console.warn('🔌 [SOCKET] Disconnected:', reason);
            if (reason === 'io server disconnect') {
                this.socket.connect();
            }
        });

        this.socket.on('connect_error', (error) => {
            console.error('🔌 [SOCKET] Connection error:', error.message);
        });
    }

    deliveryRegister(deliveryBoyId) {
        if (!deliveryBoyId) return;
        localStorage.setItem('delivery_boy_id', deliveryBoyId);
        console.log(`🚴 [SOCKET] Registering: ${deliveryBoyId}`);
        if (this.socket?.connected) {
            this.socket.emit('delivery_register', deliveryBoyId);
        }
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
