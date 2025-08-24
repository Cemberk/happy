/**
 * Local relay server that runs on the desktop/lighthouse node
 * Replaces the cloud happy-server with local peer-to-peer messaging
 */
import { Platform } from 'react-native';
import { EventEmitter } from 'events';
import { ApiEncryption } from '@/sync/apiEncryption';
import { NebulaManager } from './NebulaManager';

export interface RelayMessage {
    type: string;
    data: any;
    from?: string;
    to?: string;
    timestamp: number;
}

export interface ConnectedPeer {
    id: string;
    nodeIP: string;
    platform: string;
    connectedAt: number;
    lastSeen: number;
}

export type MessageHandler = (message: RelayMessage, from: string) => void;

class LocalRelayImpl extends EventEmitter {
    private isServer = false;
    private isRunning = false;
    private peers = new Map<string, ConnectedPeer>();
    private messageHandlers = new Map<string, MessageHandler>();
    private serverPort = 3005; // Default port, matches existing happy-server
    private server: any = null; // HTTP/WebSocket server instance
    private clientSocket: any = null; // WebSocket client for non-server peers
    private serverIP = '10.42.0.1'; // Lighthouse IP in Nebula network
    private encryption: ApiEncryption | null = null;

    /**
     * Start the relay - either as server (desktop/lighthouse) or client (mobile)
     */
    async start(encryption: ApiEncryption): Promise<void> {
        this.encryption = encryption;
        
        // Determine if we should run as server or client
        const nebulaStatus = NebulaManager.getStatus();
        const isLighthouse = nebulaStatus.nodeIP === this.serverIP;
        
        if (isLighthouse && Platform.OS !== 'web') {
            await this.startAsServer();
        } else {
            await this.startAsClient();
        }
        
        this.isRunning = true;
        console.log(`Local relay started as ${this.isServer ? 'server' : 'client'}`);
    }

    /**
     * Stop the relay server/client
     */
    async stop(): Promise<void> {
        if (this.server) {
            // In real implementation: this.server.close()
            this.server = null;
        }
        
        if (this.clientSocket) {
            // In real implementation: this.clientSocket.close()
            this.clientSocket = null;
        }
        
        this.isRunning = false;
        this.peers.clear();
        console.log('Local relay stopped');
    }

    /**
     * Start as relay server (runs on desktop/lighthouse)
     */
    private async startAsServer(): Promise<void> {
        this.isServer = true;
        
        // In a real implementation, we would start an HTTP server with WebSocket support
        // For now, we'll simulate the server behavior
        console.log(`Starting relay server on ${this.serverIP}:${this.serverPort}`);
        
        // Simulate server startup
        this.server = {
            port: this.serverPort,
            address: this.serverIP,
            connections: new Map()
        };
        
        // Monitor for incoming peer connections
        this.startPeerMonitoring();
    }

    /**
     * Start as relay client (runs on mobile devices)
     */
    private async startAsClient(): Promise<void> {
        this.isServer = false;
        
        console.log(`Connecting to relay server at ${this.serverIP}:${this.serverPort}`);
        
        // In a real implementation, we would connect via WebSocket
        // For now, simulate the connection
        this.clientSocket = {
            url: `ws://${this.serverIP}:${this.serverPort}/v1/updates`,
            connected: true
        };
        
        // Register this client with the server
        await this.registerWithServer();
    }

    /**
     * Send message to specific peer or broadcast to all
     */
    async sendMessage(type: string, data: any, targetPeer?: string): Promise<void> {
        if (!this.isRunning) {
            throw new Error('Relay not running');
        }

        const message: RelayMessage = {
            type,
            data,
            to: targetPeer,
            from: this.getLocalPeerId(),
            timestamp: Date.now()
        };

        if (this.isServer) {
            // Server: route message to target peer(s)
            await this.routeMessage(message);
        } else {
            // Client: send to server for routing
            await this.sendToServer(message);
        }
    }

    /**
     * Register message handler for specific message type
     */
    onMessage(type: string, handler: MessageHandler): () => void {
        this.messageHandlers.set(type, handler);
        return () => this.messageHandlers.delete(type);
    }

    /**
     * Get list of connected peers
     */
    getPeers(): ConnectedPeer[] {
        return Array.from(this.peers.values());
    }

    /**
     * Check if relay is running
     */
    isReady(): boolean {
        return this.isRunning;
    }

    /**
     * Get status for debugging
     */
    getStatus() {
        return {
            isServer: this.isServer,
            isRunning: this.isRunning,
            peerCount: this.peers.size,
            serverIP: this.serverIP,
            serverPort: this.serverPort
        };
    }

    // Private methods
    
    private async routeMessage(message: RelayMessage): Promise<void> {
        if (!this.isServer) return;

        // Encrypt message content if needed
        if (this.encryption && message.data) {
            message.data = this.encryption.encryptRaw(message.data);
        }

        if (message.to) {
            // Send to specific peer
            const peer = this.peers.get(message.to);
            if (peer) {
                await this.sendToPeer(peer, message);
            } else {
                console.warn(`Peer ${message.to} not found`);
            }
        } else {
            // Broadcast to all connected peers
            for (const peer of this.peers.values()) {
                if (peer.id !== message.from) {
                    await this.sendToPeer(peer, message);
                }
            }
        }
    }

    private async sendToPeer(peer: ConnectedPeer, message: RelayMessage): Promise<void> {
        // In real implementation, send via WebSocket or HTTP request to peer
        console.log(`Sending message ${message.type} to peer ${peer.id} at ${peer.nodeIP}`);
        
        // Simulate network delay
        setTimeout(() => {
            this.emit('messageSent', { peer: peer.id, message });
        }, 10);
    }

    private async sendToServer(message: RelayMessage): Promise<void> {
        if (!this.clientSocket) {
            throw new Error('Not connected to server');
        }

        // In real implementation, send via WebSocket
        console.log(`Sending message ${message.type} to server`);
        
        // Simulate sending to server
        setTimeout(() => {
            this.emit('messageToServer', message);
        }, 5);
    }

    private async registerWithServer(): Promise<void> {
        if (this.isServer) return;

        const registrationMessage: RelayMessage = {
            type: 'peer-register',
            data: {
                peerId: this.getLocalPeerId(),
                platform: Platform.OS,
                nodeIP: NebulaManager.getStatus().nodeIP,
                capabilities: ['messaging', 'sync']
            },
            timestamp: Date.now()
        };

        await this.sendToServer(registrationMessage);
    }

    private startPeerMonitoring(): void {
        if (!this.isServer) return;

        // Monitor Nebula network for new peers
        NebulaManager.onStatusChange((status) => {
            // Update peer list based on Nebula status
            this.updatePeerList(status.peers);
        });

        // Periodic cleanup of stale peer connections
        setInterval(() => {
            this.cleanupStalePeers();
        }, 30000); // Every 30 seconds
    }

    private updatePeerList(nebulaPeers: string[]): void {
        const now = Date.now();

        // Add new peers
        for (const peerIP of nebulaPeers) {
            if (!this.peers.has(peerIP)) {
                const peer: ConnectedPeer = {
                    id: peerIP,
                    nodeIP: peerIP,
                    platform: 'unknown', // Will be updated when peer registers
                    connectedAt: now,
                    lastSeen: now
                };
                this.peers.set(peerIP, peer);
                this.emit('peerConnected', peer);
            } else {
                // Update last seen
                const peer = this.peers.get(peerIP)!;
                peer.lastSeen = now;
            }
        }

        // Remove peers that are no longer in Nebula network
        for (const [peerId, peer] of this.peers.entries()) {
            if (!nebulaPeers.includes(peer.nodeIP)) {
                this.peers.delete(peerId);
                this.emit('peerDisconnected', peer);
            }
        }
    }

    private cleanupStalePeers(): void {
        const now = Date.now();
        const staleTimeout = 60000; // 1 minute

        for (const [peerId, peer] of this.peers.entries()) {
            if (now - peer.lastSeen > staleTimeout) {
                this.peers.delete(peerId);
                this.emit('peerDisconnected', peer);
                console.log(`Removed stale peer: ${peerId}`);
            }
        }
    }

    private getLocalPeerId(): string {
        const status = NebulaManager.getStatus();
        return status.nodeIP || `${Platform.OS}-${Date.now()}`;
    }

    private handleIncomingMessage(message: RelayMessage, fromPeer: string): void {
        // Decrypt message if needed
        if (this.encryption && message.data) {
            try {
                message.data = this.encryption.decryptRaw(message.data);
            } catch (error) {
                console.error('Failed to decrypt message:', error);
                return;
            }
        }

        // Find and call message handler
        const handler = this.messageHandlers.get(message.type);
        if (handler) {
            handler(message, fromPeer);
        } else {
            console.warn(`No handler for message type: ${message.type}`);
        }

        // Emit general message event
        this.emit('message', message, fromPeer);
    }
}

export const LocalRelay = new LocalRelayImpl();