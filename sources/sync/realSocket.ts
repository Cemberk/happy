/**
 * Real Socket.io implementation for connecting to the Happy server
 * This replaces the Nebula P2P implementation to enable actual WebSocket connections
 */
import { io, Socket } from 'socket.io-client';
import { ApiEncryption } from './apiEncryption';

export interface SyncSocketConfig {
    endpoint: string;
    token: string;
}

export interface SyncSocketState {
    isConnected: boolean;
    connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
    lastError: Error | null;
}

export type SyncSocketListener = (state: SyncSocketState) => void;

class RealSocket {
    private socket: Socket | null = null;
    private config: SyncSocketConfig | null = null;
    private encryption: ApiEncryption | null = null;
    private messageHandlers: Map<string, Set<(data: any) => void>> = new Map();
    private reconnectedListeners: Set<() => void> = new Set();
    private statusListeners: Set<(status: 'disconnected' | 'connecting' | 'connected' | 'error') => void> = new Set();
    private currentStatus: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';

    initialize(config: SyncSocketConfig, encryption: ApiEncryption) {
        console.log('🔧 RealSocket: Initializing with config:', { endpoint: config.endpoint, tokenPreview: config.token.substring(0, 20) + '...' });
        this.config = config;
        this.encryption = encryption;
        this.connect();
    }

    connect() {
        console.log('🔧 RealSocket: connect() called, current status:', this.currentStatus);
        
        if (this.socket?.connected) {
            console.log('🔧 RealSocket: Socket already connected, skipping');
            return;
        }

        if (!this.config) {
            console.error('RealSocket: Cannot connect without configuration');
            return;
        }

        this.updateStatus('connecting');
        console.log('🔧 RealSocket: Connecting to', this.config.endpoint, 'with token:', this.config.token.substring(0, 20) + '...');

        // Create Socket.io connection with authentication
        this.socket = io(this.config.endpoint, {
            path: '/v1/updates', // Match server configuration
            auth: {
                token: this.config.token
            },
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            transports: ['websocket', 'polling']
        });

        // Set up Socket.io event handlers
        this.socket.on('connect', () => {
            console.log('RealSocket: Connected successfully');
            this.updateStatus('connected');
        });

        this.socket.on('disconnect', (reason) => {
            console.log('RealSocket: Disconnected:', reason);
            this.updateStatus('disconnected');
        });

        this.socket.on('connect_error', (error) => {
            console.error('RealSocket: Connection error:', error.message);
            this.updateStatus('error');
        });

        this.socket.on('reconnect', () => {
            console.log('RealSocket: Reconnected');
            this.reconnectedListeners.forEach(listener => listener());
        });

        // Forward all messages to registered handlers
        this.socket.onAny((event, data) => {
            const handlers = this.messageHandlers.get(event);
            if (handlers) {
                handlers.forEach(handler => handler(data));
            }
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.updateStatus('disconnected');
    }

    onReconnected = (listener: () => void) => {
        this.reconnectedListeners.add(listener);
        return () => this.reconnectedListeners.delete(listener);
    };

    onStatusChange = (listener: (status: 'disconnected' | 'connecting' | 'connected' | 'error') => void) => {
        this.statusListeners.add(listener);
        listener(this.currentStatus);
        return () => this.statusListeners.delete(listener);
    };

    onMessage(event: string, handler: (data: any) => void) {
        if (!this.messageHandlers.has(event)) {
            this.messageHandlers.set(event, new Set());
        }
        this.messageHandlers.get(event)!.add(handler);
        
        // Also register with Socket.io
        if (this.socket) {
            this.socket.on(event, handler);
        }
        
        return () => {
            const handlers = this.messageHandlers.get(event);
            if (handlers) {
                handlers.delete(handler);
            }
            if (this.socket) {
                this.socket.off(event, handler);
            }
        };
    }

    offMessage(event: string, handler: (data: any) => void) {
        const handlers = this.messageHandlers.get(event);
        if (handlers) {
            handlers.delete(handler);
        }
        if (this.socket) {
            this.socket.off(event, handler);
        }
    }

    async rpc<R, A>(listernerId: string, method: string, params: A): Promise<R> {
        if (!this.socket) {
            throw new Error('Socket not connected');
        }

        const rpcMessage = {
            method: `${listernerId}:${method}`,
            params,
            id: `rpc-${Date.now()}-${Math.random()}`
        };

        console.log('[realSocket.rpc] Emitting RPC message:', rpcMessage);

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                console.error('[realSocket.rpc] RPC timeout for message:', rpcMessage);
                reject(new Error('RPC timeout'));
            }, 30000);

            this.socket!.emit('rpc-call', rpcMessage, (response: any) => {
                clearTimeout(timeout);
                console.log('[realSocket.rpc] Received RPC response:', response);
                if (response && response.error) {
                    reject(new Error(response.error));
                } else {
                    resolve(response ? response.result : undefined);
                }
            });
        });
    }

    send(event: string, data: any) {
        if (!this.socket) {
            console.warn('RealSocket: Cannot send, not connected');
            return;
        }
        this.socket.emit(event, data);
    }

    async emitWithAck<T = any>(event: string, data: any): Promise<T> {
        if (!this.socket) {
            throw new Error('Socket not connected');
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Emit timeout'));
            }, 10000);

            this.socket!.emit(event, data, (response: T) => {
                clearTimeout(timeout);
                resolve(response);
            });
        });
    }

    async request(path: string, options?: RequestInit): Promise<Response> {
        if (!this.config) {
            throw new Error('Socket not configured');
        }

        const url = `${this.config.endpoint}${path}`;
        const headers = {
            ...((options?.headers as any) || {}),
            'Authorization': `Bearer ${this.config.token}`
        };

        return fetch(url, {
            ...options,
            headers
        });
    }

    updateToken(newToken: string) {
        if (this.config && this.config.token !== newToken) {
            this.config.token = newToken;
            
            // Reconnect with new token
            if (this.socket) {
                this.socket.auth = { token: newToken };
                this.socket.disconnect();
                this.socket.connect();
            }
        }
    }

    private updateStatus(status: 'disconnected' | 'connecting' | 'connected' | 'error') {
        if (this.currentStatus !== status) {
            this.currentStatus = status;
            this.statusListeners.forEach(listener => listener(status));
        }
    }

    // Nebula compatibility methods (no-op)
    getNebulaStatus() {
        return { status: 'not-nebula', mode: 'websocket' };
    }

    getPeers() {
        return [];
    }

    isLighthouse() {
        return false;
    }
}

export const realSocket = new RealSocket();