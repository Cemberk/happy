import { nebulaSocket } from '@/nebula/NebulaSocket';
import { TokenStorage } from '@/auth/tokenStorage';
import { ApiEncryption } from './apiEncryption';

//
// Types
//

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

//
// Main Class
//

class ApiSocket {

    // State - now delegates to NebulaSocket
    private config: SyncSocketConfig | null = null;
    private encryption: ApiEncryption | null = null;

    //
    // Initialization
    //

    initialize(config: SyncSocketConfig, encryption: ApiEncryption) {
        this.config = config;
        this.encryption = encryption;
        nebulaSocket.initialize(config, encryption);
    }

    //
    // Connection Management (delegated to NebulaSocket)
    //

    connect() {
        nebulaSocket.connect();
    }

    disconnect() {
        nebulaSocket.disconnect();
    }

    //
    // Listener Management
    //

    onReconnected = (listener: () => void) => {
        return nebulaSocket.onReconnected(listener);
    };

    onStatusChange = (listener: (status: 'disconnected' | 'connecting' | 'connected' | 'error') => void) => {
        return nebulaSocket.onStatusChange(listener);
    };

    //
    // Message Handling
    //

    onMessage(event: string, handler: (data: any) => void) {
        return nebulaSocket.onMessage(event, handler);
    }

    offMessage(event: string, handler: (data: any) => void) {
        nebulaSocket.offMessage(event, handler);
    }

    /**
     * listernerId is either sessionId or machineId
     */
    async rpc<R, A>(listernerId: string, method: string, params: A): Promise<R> {
        return nebulaSocket.rpc<R, A>(listernerId, method, params);
    }

    send(event: string, data: any) {
        return nebulaSocket.send(event, data);
    }

    async emitWithAck<T = any>(event: string, data: any): Promise<T> {
        return nebulaSocket.emitWithAck<T>(event, data);
    }

    //
    // HTTP Requests
    //

    async request(path: string, options?: RequestInit): Promise<Response> {
        return nebulaSocket.request(path, options);
    }

    //
    // Token Management
    //

    updateToken(newToken: string) {
        if (this.config && this.config.token !== newToken) {
            this.config.token = newToken;
            nebulaSocket.updateToken(newToken);
        }
    }

    //
    // Nebula-specific methods (optional, for debugging)
    //

    getNebulaStatus() {
        return nebulaSocket.getNebulaStatus();
    }

    getPeers() {
        return nebulaSocket.getPeers();
    }

    isLighthouse() {
        return nebulaSocket.isLighthouse();
    }
}

//
// Singleton Export
//

export const apiSocket = new ApiSocket();