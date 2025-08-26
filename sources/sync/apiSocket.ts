import { realSocket } from './realSocket';
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

    // State - now delegates to realSocket
    private config: SyncSocketConfig | null = null;
    private encryption: ApiEncryption | null = null;

    //
    // Initialization
    //

    initialize(config: SyncSocketConfig, encryption: ApiEncryption) {
        this.config = config;
        this.encryption = encryption;
        realSocket.initialize(config, encryption);
    }

    //
    // Connection Management (delegated to realSocket)
    //

    connect() {
        realSocket.connect();
    }

    disconnect() {
        realSocket.disconnect();
    }

    //
    // Listener Management
    //

    onReconnected = (listener: () => void) => {
        return realSocket.onReconnected(listener);
    };

    onStatusChange = (listener: (status: 'disconnected' | 'connecting' | 'connected' | 'error') => void) => {
        return realSocket.onStatusChange(listener);
    };

    //
    // Message Handling
    //

    onMessage(event: string, handler: (data: any) => void) {
        return realSocket.onMessage(event, handler);
    }

    offMessage(event: string, handler: (data: any) => void) {
        realSocket.offMessage(event, handler);
    }

    /**
     * listernerId is either sessionId or machineId
     */
    async rpc<R, A>(listernerId: string, method: string, params: A): Promise<R> {
        return realSocket.rpc<R, A>(listernerId, method, params);
    }

    send(event: string, data: any) {
        return realSocket.send(event, data);
    }

    async emitWithAck<T = any>(event: string, data: any): Promise<T> {
        return realSocket.emitWithAck<T>(event, data);
    }

    //
    // HTTP Requests
    //

    async request(path: string, options?: RequestInit): Promise<Response> {
        return realSocket.request(path, options);
    }

    //
    // Token Management
    //

    updateToken(newToken: string) {
        if (this.config && this.config.token !== newToken) {
            this.config.token = newToken;
            realSocket.updateToken(newToken);
        }
    }

    //
    // Nebula-specific methods (optional, for debugging)
    //

    getNebulaStatus() {
        return realSocket.getNebulaStatus();
    }

    getPeers() {
        return realSocket.getPeers();
    }

    isLighthouse() {
        return realSocket.isLighthouse();
    }
}

//
// Singleton Export
//

export const apiSocket = new ApiSocket();