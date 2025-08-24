/**
 * Nebula-based socket implementation that replaces apiSocket.ts
 * Provides the same interface but uses peer-to-peer Nebula networking instead of cloud server
 */
import { NebulaManager } from './NebulaManager';
import { LocalRelay, RelayMessage } from './LocalRelay';
import { ApiEncryption } from '@/sync/apiEncryption';

//
// Types (same as apiSocket.ts for compatibility)
//

export interface SyncSocketConfig {
    endpoint: string; // Will be ignored in Nebula version
    token: string;
}

export interface SyncSocketState {
    isConnected: boolean;
    connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
    lastError: Error | null;
}

export type SyncSocketListener = (state: SyncSocketState) => void;

//
// Main Class
//

class NebulaSocket {
    // State
    private config: SyncSocketConfig | null = null;
    private encryption: ApiEncryption | null = null;
    private messageHandlers: Map<string, (data: any) => void> = new Map();
    private reconnectedListeners: Set<() => void> = new Set();
    private statusListeners: Set<(status: 'disconnected' | 'connecting' | 'connected' | 'error') => void> = new Set();
    private currentStatus: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
    private isInitialized = false;

    //
    // Initialization
    //

    initialize(config: SyncSocketConfig, encryption: ApiEncryption) {
        this.config = config;
        this.encryption = encryption;
        this.initializeNebula();
    }

    private async initializeNebula() {
        try {
            this.updateStatus('connecting');

            // Initialize Nebula network
            await NebulaManager.initialize();

            // Start local relay
            if (this.encryption) {
                await LocalRelay.start(this.encryption);
            }

            // Set up message routing
            this.setupMessageHandling();

            // Listen for Nebula status changes
            NebulaManager.onStatusChange((status) => {
                if (status.status === 'connected') {
                    this.updateStatus('connected');
                    if (this.isInitialized) {
                        // This is a reconnection
                        this.reconnectedListeners.forEach(listener => listener());
                    }
                    this.isInitialized = true;
                } else if (status.status === 'error') {
                    this.updateStatus('error');
                } else {
                    this.updateStatus('disconnected');
                }
            });

        } catch (error) {
            console.error('Failed to initialize Nebula socket:', error);
            this.updateStatus('error');
        }
    }

    //
    // Connection Management (compatible with apiSocket interface)
    //

    connect() {
        // In Nebula version, connection is managed by NebulaManager
        if (NebulaManager.getStatus().status === 'disconnected') {
            NebulaManager.initialize();
        }
    }

    disconnect() {
        LocalRelay.stop();
        NebulaManager.stop();
        this.updateStatus('disconnected');
    }

    //
    // Listener Management (same interface as apiSocket)
    //

    onReconnected = (listener: () => void) => {
        this.reconnectedListeners.add(listener);
        return () => this.reconnectedListeners.delete(listener);
    };

    onStatusChange = (listener: (status: 'disconnected' | 'connecting' | 'connected' | 'error') => void) => {
        this.statusListeners.add(listener);
        // Immediately notify with current status
        listener(this.currentStatus);
        return () => this.statusListeners.delete(listener);
    };

    //
    // Message Handling (same interface as apiSocket)
    //

    onMessage(event: string, handler: (data: any) => void) {
        this.messageHandlers.set(event, handler);
        return () => this.messageHandlers.delete(event);
    }

    offMessage(event: string, handler: (data: any) => void) {
        this.messageHandlers.delete(event);
    }

    /**
     * RPC call via Nebula network
     * listernerId is either sessionId or machineId
     */
    async rpc<R, A>(listernerId: string, method: string, params: A): Promise<R> {
        if (!this.encryption) {
            throw new Error('Encryption not initialized');
        }

        const rpcMessage = {
            method: `${listernerId}:${method}`,
            params: this.encryption.encryptRaw(params),
            id: `rpc-${Date.now()}-${Math.random()}`
        };

        // Send RPC via local relay and wait for response
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('RPC call timed out'));
            }, 30000); // 30 second timeout

            // Set up one-time response handler
            const responseHandler = (message: RelayMessage) => {
                if (message.type === 'rpc-response' && message.data.id === rpcMessage.id) {
                    clearTimeout(timeout);
                    LocalRelay.off('message', responseHandler);
                    
                    if (message.data.ok) {
                        const result = this.encryption!.decryptRaw(message.data.result);
                        resolve(result as R);
                    } else {
                        reject(new Error(message.data.error || 'RPC call failed'));
                    }
                }
            };

            LocalRelay.on('message', responseHandler);
            LocalRelay.sendMessage('rpc-call', rpcMessage);
        });
    }

    send(event: string, data: any) {
        LocalRelay.sendMessage(event, data);
        return true;
    }

    async emitWithAck<T = any>(event: string, data: any): Promise<T> {
        // For compatibility, convert to RPC-style call
        const ackId = `ack-${Date.now()}-${Math.random()}`;
        const message = { ...data, _ackId: ackId };

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('EmitWithAck timed out'));
            }, 15000); // 15 second timeout

            const ackHandler = (message: RelayMessage) => {
                if (message.type === `${event}-ack` && message.data._ackId === ackId) {
                    clearTimeout(timeout);
                    LocalRelay.off('message', ackHandler);
                    resolve(message.data.result);
                }
            };

            LocalRelay.on('message', ackHandler);
            LocalRelay.sendMessage(event, message);
        });
    }

    //
    // HTTP Requests (adapted for Nebula)
    //

    async request(path: string, options?: RequestInit): Promise<Response> {
        // In Nebula version, HTTP requests become peer-to-peer messages
        const requestData = {
            path,
            method: options?.method || 'GET',
            headers: options?.headers || {},
            body: options?.body,
            requestId: `req-${Date.now()}-${Math.random()}`
        };

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Request timed out'));
            }, 30000);

            const responseHandler = (message: RelayMessage) => {
                if (message.type === 'http-response' && message.data.requestId === requestData.requestId) {
                    clearTimeout(timeout);
                    LocalRelay.off('message', responseHandler);
                    
                    // Create mock Response object
                    const response = {
                        ok: message.data.status >= 200 && message.data.status < 300,
                        status: message.data.status,
                        statusText: message.data.statusText,
                        headers: message.data.headers,
                        json: async () => message.data.body,
                        text: async () => JSON.stringify(message.data.body)
                    } as Response;
                    
                    resolve(response);
                }
            };

            LocalRelay.on('message', responseHandler);
            LocalRelay.sendMessage('http-request', requestData);
        });
    }

    //
    // Token Management (same interface)
    //

    updateToken(newToken: string) {
        if (this.config && this.config.token !== newToken) {
            this.config.token = newToken;
            // In Nebula version, token updates don't require reconnection
            console.log('Token updated in Nebula socket');
        }
    }

    //
    // Private Methods
    //

    private updateStatus(status: 'disconnected' | 'connecting' | 'connected' | 'error') {
        if (this.currentStatus !== status) {
            this.currentStatus = status;
            this.statusListeners.forEach(listener => listener(status));
        }
    }

    private setupMessageHandling() {
        // Route messages from LocalRelay to registered handlers
        LocalRelay.on('message', (message: RelayMessage, fromPeer: string) => {
            const handler = this.messageHandlers.get(message.type);
            if (handler) {
                handler(message.data);
            }
        });

        // Handle peer connection events
        LocalRelay.on('peerConnected', (peer) => {
            console.log('Peer connected:', peer.id);
            // Notify handlers that might care about new peers
            const handler = this.messageHandlers.get('peer-connected');
            if (handler) {
                handler({ peerId: peer.id, peer });
            }
        });

        LocalRelay.on('peerDisconnected', (peer) => {
            console.log('Peer disconnected:', peer.id);
            const handler = this.messageHandlers.get('peer-disconnected');
            if (handler) {
                handler({ peerId: peer.id, peer });
            }
        });
    }

    //
    // Additional Nebula-specific methods
    //

    /**
     * Get Nebula network status
     */
    getNebulaStatus() {
        return NebulaManager.getStatus();
    }

    /**
     * Get connected peers in the mesh
     */
    getPeers() {
        return LocalRelay.getPeers();
    }

    /**
     * Check if we're acting as the lighthouse/server
     */
    isLighthouse() {
        return LocalRelay.getStatus().isServer;
    }

    /**
     * Generate QR code for other devices to join network
     * Only works if this device is the lighthouse
     */
    getJoinQRData(): string {
        const status = NebulaManager.getStatus();
        if (status.nodeIP !== '10.42.0.1') {
            throw new Error('Only lighthouse can generate join QR data');
        }
        // This would be implemented in NebulaManager
        return 'nebula-join-data';
    }

    /**
     * Join network using QR code data
     */
    async joinNetwork(qrData: string): Promise<void> {
        await NebulaManager.joinNetwork(qrData);
    }

    /**
     * Reset Nebula configuration (for testing)
     */
    async reset(): Promise<void> {
        await this.disconnect();
        await NebulaManager.reset();
        this.isInitialized = false;
    }
}

//
// Singleton Export (same as apiSocket)
//

export const nebulaSocket = new NebulaSocket();