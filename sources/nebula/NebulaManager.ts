/**
 * Nebula VPN mesh network manager
 * Handles Nebula node initialization, certificate management, and network lifecycle
 */
import { Platform } from 'react-native';
import { MMKV } from 'react-native-mmkv';
import { generateSecureRandom } from '@/encryption/hex';

// Separate storage for Nebula config that persists across app sessions
const nebulaStorage = new MMKV({ id: 'nebula-config' });

export interface NebulaConfig {
    nodeId: string;
    nodeIP: string;
    caCert: string;
    nodeCert: string;
    nodeKey: string;
    lighthouses?: string[];
    isLighthouse?: boolean;
    port?: number;
}

export interface NebulaStatus {
    status: 'disconnected' | 'connecting' | 'connected' | 'error';
    nodeIP?: string;
    peers: string[];
    error?: string;
}

export type NebulaStatusListener = (status: NebulaStatus) => void;

class NebulaManagerImpl {
    private config: NebulaConfig | null = null;
    private status: NebulaStatus = { status: 'disconnected', peers: [] };
    private statusListeners: Set<NebulaStatusListener> = new Set();
    private process: any = null; // Will hold child process reference for desktop
    
    /**
     * Initialize Nebula with existing configuration or create new CA
     */
    async initialize(): Promise<void> {
        try {
            // Try to load existing config
            const savedConfig = this.loadConfig();
            if (savedConfig) {
                this.config = savedConfig;
                await this.startNebula();
            } else {
                // Check if we're in privacy mode (connecting to localhost)
                const serverUrl = process.env.EXPO_PUBLIC_HAPPY_SERVER_URL || 'http://localhost:3005';
                if (serverUrl.includes('localhost') || serverUrl.includes('127.0.0.1')) {
                    console.log('🔒 Privacy mode: Setting up local-only Nebula configuration');
                    await this.setupPrivacyModeConfig();
                } else {
                    // First run - need to create CA and node cert
                    throw new Error('No Nebula configuration found. Use setupAsCA() or joinNetwork()');
                }
            }
        } catch (error) {
            console.error('Failed to initialize Nebula:', error);
            this.updateStatus({ status: 'error', peers: [], error: error.message });
        }
    }

    /**
     * Set up this device as the Certificate Authority (lighthouse)
     * Should be called on the first device (usually desktop)
     */
    async setupAsCA(nodeId: string = 'desktop'): Promise<string> {
        try {
            this.updateStatus({ status: 'connecting', peers: [] });

            // Generate CA keypair
            const caCert = await this.generateCACertificate();
            const caKey = await this.generateCAKey();

            // Generate node certificate signed by CA
            const nodeIP = '10.42.0.1'; // First device gets .1
            const { nodeCert, nodeKey } = await this.generateNodeCertificate(nodeId, nodeIP, caCert, caKey);

            // Create configuration
            this.config = {
                nodeId,
                nodeIP,
                caCert,
                nodeCert,
                nodeKey,
                isLighthouse: true,
                port: 4242,
                lighthouses: []
            };

            // Save configuration
            this.saveConfig(this.config);

            // Start Nebula
            await this.startNebula();

            // Return QR data for other devices to join
            return this.generateJoinQRData();
        } catch (error) {
            console.error('Failed to setup as CA:', error);
            this.updateStatus({ status: 'error', peers: [], error: error.message });
            throw error;
        }
    }

    /**
     * Join existing Nebula network using QR code data
     */
    async joinNetwork(qrData: string, nodeId: string = Platform.OS): Promise<void> {
        try {
            this.updateStatus({ status: 'connecting', peers: [] });

            const joinData = this.parseJoinQRData(qrData);
            
            // Get next available IP (in real implementation, coordinate with CA)
            const nodeIP = await this.requestNodeIP(joinData.caCert);

            // Generate node certificate (would be signed by CA in real implementation)
            const { nodeCert, nodeKey } = await this.generateNodeCertificate(nodeId, nodeIP, joinData.caCert, joinData.caKey);

            this.config = {
                nodeId,
                nodeIP,
                caCert: joinData.caCert,
                nodeCert,
                nodeKey,
                isLighthouse: false,
                lighthouses: joinData.lighthouses
            };

            this.saveConfig(this.config);
            await this.startNebula();

        } catch (error) {
            console.error('Failed to join network:', error);
            this.updateStatus({ status: 'error', peers: [], error: error.message });
            throw error;
        }
    }

    /**
     * Start the Nebula process/service
     */
    private async startNebula(): Promise<void> {
        if (!this.config) {
            throw new Error('No Nebula configuration available');
        }

        if (Platform.OS === 'web') {
            // For web, we'll use a WebRTC fallback or direct connection
            await this.startWebNebula();
        } else if (Platform.OS === 'ios' || Platform.OS === 'android') {
            // For mobile, use VPN service
            await this.startMobileNebula();
        } else {
            // For desktop, spawn nebula binary
            await this.startDesktopNebula();
        }

        this.updateStatus({ 
            status: 'connected', 
            nodeIP: this.config.nodeIP,
            peers: [] // Will be populated by monitoring
        });
    }

    private async startDesktopNebula(): Promise<void> {
        // Write nebula config file
        const configPath = await this.writeNebulaConfigFile();
        
        // In a real implementation, we would:
        // const { spawn } = require('child_process');
        // this.process = spawn('nebula', ['-config', configPath]);
        
        console.log('Desktop Nebula started with config:', configPath);
    }

    private async startMobileNebula(): Promise<void> {
        // For mobile platforms, we need to integrate with VPN service
        // This would require platform-specific native modules
        console.log('Mobile Nebula started');
    }

    private async startWebNebula(): Promise<void> {
        // For web, implement WebRTC-based peer discovery as fallback
        console.log('Web Nebula started (WebRTC fallback)');
    }

    /**
     * Stop Nebula and disconnect from mesh
     */
    async stop(): Promise<void> {
        if (this.process) {
            this.process.kill();
            this.process = null;
        }
        this.updateStatus({ status: 'disconnected', peers: [] });
    }

    /**
     * Get current Nebula status
     */
    getStatus(): NebulaStatus {
        return this.status;
    }

    /**
     * Listen for status changes
     */
    onStatusChange(listener: NebulaStatusListener): () => void {
        this.statusListeners.add(listener);
        listener(this.status); // Immediately call with current status
        return () => this.statusListeners.delete(listener);
    }

    /**
     * Generate QR code data for other devices to join the network
     */
    private generateJoinQRData(): string {
        if (!this.config || !this.config.isLighthouse) {
            throw new Error('Only lighthouse nodes can generate join data');
        }

        const joinData = {
            version: '1.0',
            caCert: this.config.caCert,
            caKey: this.config.nodeKey, // In production, this should be derived securely
            lighthouses: [this.config.nodeIP],
            networkName: 'happy-mesh'
        };

        return JSON.stringify(joinData);
    }

    private parseJoinQRData(qrData: string): any {
        try {
            return JSON.parse(qrData);
        } catch {
            throw new Error('Invalid QR code data');
        }
    }

    // Certificate generation methods (simplified for demo)
    private async generateCACertificate(): Promise<string> {
        // In real implementation, use nebula-cert or crypto library
        return `-----BEGIN NEBULA CERTIFICATE-----\nCA_CERT_${generateSecureRandom(32)}\n-----END NEBULA CERTIFICATE-----`;
    }

    private async generateCAKey(): Promise<string> {
        return `-----BEGIN NEBULA CA KEY-----\nCA_KEY_${generateSecureRandom(32)}\n-----END NEBULA CA KEY-----`;
    }

    private async generateNodeCertificate(nodeId: string, nodeIP: string, caCert: string, caKey: string): Promise<{ nodeCert: string, nodeKey: string }> {
        const nodeCert = `-----BEGIN NEBULA CERTIFICATE-----\nNODE_CERT_${nodeId}_${generateSecureRandom(16)}\n-----END NEBULA CERTIFICATE-----`;
        const nodeKey = `-----BEGIN NEBULA PRIVATE KEY-----\nNODE_KEY_${nodeId}_${generateSecureRandom(16)}\n-----END NEBULA PRIVATE KEY-----`;
        return { nodeCert, nodeKey };
    }

    private async requestNodeIP(caCert: string): Promise<string> {
        // In real implementation, coordinate with CA to get unique IP
        // For now, generate based on device type
        const ipSuffix = Platform.OS === 'ios' ? '2' : Platform.OS === 'android' ? '3' : '4';
        return `10.42.0.${ipSuffix}`;
    }

    private async writeNebulaConfigFile(): Promise<string> {
        if (!this.config) throw new Error('No config available');

        const nebulaConfig = {
            pki: {
                ca: this.config.caCert,
                cert: this.config.nodeCert,
                key: this.config.nodeKey
            },
            static_host_map: this.config.lighthouses?.reduce((acc, lighthouse) => {
                acc[lighthouse] = [`${lighthouse}:4242`];
                return acc;
            }, {} as any) || {},
            lighthouse: {
                am_lighthouse: this.config.isLighthouse || false,
                hosts: this.config.lighthouses || []
            },
            listen: {
                host: '0.0.0.0',
                port: this.config.port || 0
            },
            punchy: {
                punch: true,
                respond: true
            },
            relay: {
                relays: this.config.lighthouses || [],
                am_relay: this.config.isLighthouse || false,
                use_relays: !this.config.isLighthouse
            },
            tun: {
                dev: 'nebula1',
                drop_local_broadcast: false,
                drop_multicast: false,
                tx_queue: 500,
                mtu: 1300
            },
            logging: {
                level: 'info',
                format: 'text'
            },
            firewall: {
                conntrack: {
                    tcp_timeout: '12m',
                    udp_timeout: '3m',
                    default_timeout: '10m',
                    max_connections: 100000
                },
                outbound: [
                    { port: 'any', proto: 'any', host: 'any' }
                ],
                inbound: [
                    { port: 'any', proto: 'any', host: 'any' }
                ]
            }
        };

        // In real implementation, write to file system
        const configPath = '/tmp/nebula.yml'; // or appropriate platform path
        console.log('Would write Nebula config to:', configPath);
        return configPath;
    }

    private updateStatus(newStatus: NebulaStatus): void {
        this.status = newStatus;
        this.statusListeners.forEach(listener => listener(newStatus));
    }

    private saveConfig(config: NebulaConfig): void {
        nebulaStorage.set('config', JSON.stringify(config));
    }

    private loadConfig(): NebulaConfig | null {
        const configStr = nebulaStorage.getString('config');
        if (!configStr) return null;
        
        try {
            return JSON.parse(configStr);
        } catch {
            return null;
        }
    }

    /**
     * Set up privacy mode configuration for local-only operation
     */
    private async setupPrivacyModeConfig(): Promise<void> {
        console.log('🔒 Privacy mode: Creating local-only Nebula configuration');
        
        // Create a minimal local-only configuration
        const privacyConfig = {
            networkName: 'privacy-local',
            isLighthouse: true,
            ip: '10.42.0.1',
            lighthouses: [],
            caCert: 'privacy-mode-mock-ca',
            nodeCert: 'privacy-mode-mock-cert',
            nodeKey: 'privacy-mode-mock-key',
            staticHostMap: {}
        };
        
        this.config = privacyConfig;
        
        // Save the privacy config
        nebulaStorage.set('nebulaConfig', JSON.stringify(privacyConfig));
        
        // Set up connected status immediately for privacy mode
        this.updateStatus({
            status: 'connected',
            peers: [],
            ip: '10.42.0.1'
        });
        
        console.log('🔒 Privacy mode: Local Nebula network configured');
    }

    /**
     * Clear all Nebula configuration (useful for testing/reset)
     */
    async reset(): Promise<void> {
        await this.stop();
        nebulaStorage.clearAll();
        this.config = null;
    }
}

export const NebulaManager = new NebulaManagerImpl();