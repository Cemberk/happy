/**
 * Nebula-based authentication system
 * Replaces cloud-server dependent authentication with peer-to-peer Nebula certificate exchange
 */
import { generateSecureRandom } from '@/encryption/hex';
import { authChallenge } from '@/auth/authChallenge';
import { TokenStorage, AuthCredentials } from '@/auth/tokenStorage';
import { NebulaManager } from './NebulaManager';
import { ApiEncryption } from '@/sync/apiEncryption';
import { Platform } from 'react-native';

export interface NebulaAuthQRData {
    version: '1.0';
    networkId: string;
    caCert: string;
    lighthouseIP: string;
    lighthousePort: number;
    authChallenge: string;
    authSignature: string;
    authPublicKey: string;
    timestamp: number;
}

export interface PairingResult {
    success: boolean;
    credentials?: AuthCredentials;
    nebulaConfig?: any;
    error?: string;
}

class NebulaAuthImpl {
    
    /**
     * Set up this device as the CA/lighthouse and generate QR code for pairing
     * This should be called on the primary device (usually desktop)
     */
    async setupAsLighthouse(): Promise<{ qrData: string; credentials: AuthCredentials }> {
        try {
            // Generate master secret for this network
            const networkSecret = generateSecureRandom(32);
            
            // Create auth credentials using the network secret
            const credentials: AuthCredentials = {
                token: `nebula-${Date.now()}`, // Local token, not server-based
                secret: networkSecret
            };

            // Generate authentication challenge
            const secretBytes = new Uint8Array(Buffer.from(networkSecret, 'hex'));
            const challenge = authChallenge(secretBytes);

            // Set up Nebula as CA/lighthouse
            const nodeId = Platform.OS === 'web' ? 'web-lighthouse' : 'desktop';
            await NebulaManager.setupAsCA(nodeId);

            // Get Nebula join data
            const nebulaStatus = NebulaManager.getStatus();
            
            // Create QR data that includes both Nebula and auth information
            const qrData: NebulaAuthQRData = {
                version: '1.0',
                networkId: `happy-${Date.now()}`,
                caCert: 'NEBULA_CA_CERT_PLACEHOLDER', // Would be real cert from NebulaManager
                lighthouseIP: nebulaStatus.nodeIP || '10.42.0.1',
                lighthousePort: 4242,
                authChallenge: Buffer.from(challenge.challenge).toString('hex'),
                authSignature: Buffer.from(challenge.signature).toString('hex'),
                authPublicKey: Buffer.from(challenge.publicKey).toString('hex'),
                timestamp: Date.now()
            };

            // Save credentials locally
            await TokenStorage.setCredentials(credentials);

            return {
                qrData: JSON.stringify(qrData),
                credentials
            };

        } catch (error) {
            console.error('Failed to setup as lighthouse:', error);
            throw error;
        }
    }

    /**
     * Join a Nebula network by scanning QR code from lighthouse device
     */
    async joinNetwork(qrCodeData: string): Promise<PairingResult> {
        try {
            // Parse QR code data
            const qrData: NebulaAuthQRData = JSON.parse(qrCodeData);
            
            if (qrData.version !== '1.0') {
                return { success: false, error: 'Unsupported QR code version' };
            }

            // Verify the QR code is not too old (prevent replay attacks)
            const age = Date.now() - qrData.timestamp;
            const maxAge = 5 * 60 * 1000; // 5 minutes
            if (age > maxAge) {
                return { success: false, error: 'QR code has expired' };
            }

            // Derive credentials from the auth challenge
            const credentials = await this.deriveCredentialsFromQR(qrData);
            if (!credentials) {
                return { success: false, error: 'Failed to derive credentials' };
            }

            // Join Nebula network
            const nodeId = `${Platform.OS}-${Date.now()}`;
            await NebulaManager.joinNetwork(JSON.stringify({
                caCert: qrData.caCert,
                lighthouses: [qrData.lighthouseIP],
                networkId: qrData.networkId
            }), nodeId);

            // Save credentials
            await TokenStorage.setCredentials(credentials);

            return {
                success: true,
                credentials,
                nebulaConfig: {
                    nodeIP: NebulaManager.getStatus().nodeIP,
                    lighthouseIP: qrData.lighthouseIP
                }
            };

        } catch (error) {
            console.error('Failed to join network:', error);
            return { success: false, error: error.message || 'Unknown error' };
        }
    }

    /**
     * Generate QR code for existing lighthouse (for adding additional devices)
     */
    async generateAddDeviceQR(): Promise<string> {
        // Check if we're the lighthouse
        const nebulaStatus = NebulaManager.getStatus();
        if (nebulaStatus.nodeIP !== '10.42.0.1') {
            throw new Error('Only lighthouse can generate device addition QR codes');
        }

        // Get existing credentials
        const credentials = await TokenStorage.getCredentials();
        if (!credentials) {
            throw new Error('No credentials found');
        }

        // Generate fresh challenge
        const secretBytes = new Uint8Array(Buffer.from(credentials.secret, 'hex'));
        const challenge = authChallenge(secretBytes);

        const qrData: NebulaAuthQRData = {
            version: '1.0',
            networkId: `happy-existing-${Date.now()}`,
            caCert: 'NEBULA_CA_CERT_PLACEHOLDER',
            lighthouseIP: nebulaStatus.nodeIP || '10.42.0.1',
            lighthousePort: 4242,
            authChallenge: Buffer.from(challenge.challenge).toString('hex'),
            authSignature: Buffer.from(challenge.signature).toString('hex'),
            authPublicKey: Buffer.from(challenge.publicKey).toString('hex'),
            timestamp: Date.now()
        };

        return JSON.stringify(qrData);
    }

    /**
     * Validate that current device is properly authenticated with Nebula network
     */
    async validateAuth(): Promise<boolean> {
        try {
            // Check if we have valid credentials
            const credentials = await TokenStorage.getCredentials();
            if (!credentials) {
                return false;
            }

            // Check if Nebula is connected
            const nebulaStatus = NebulaManager.getStatus();
            if (nebulaStatus.status !== 'connected') {
                return false;
            }

            // Try to create encryption instance (validates secret)
            const encryption = await ApiEncryption.create(credentials.secret);
            return !!encryption;

        } catch (error) {
            console.error('Auth validation failed:', error);
            return false;
        }
    }

    /**
     * Reset authentication and leave Nebula network
     */
    async logout(): Promise<void> {
        try {
            // Stop Nebula
            await NebulaManager.stop();

            // Clear stored credentials
            await TokenStorage.removeCredentials();

            // Reset Nebula configuration
            await NebulaManager.reset();

        } catch (error) {
            console.error('Failed to logout:', error);
            // Continue cleanup even if some steps fail
        }
    }

    /**
     * Get current authentication status
     */
    async getAuthStatus(): Promise<{
        isAuthenticated: boolean;
        hasCredentials: boolean;
        nebulaConnected: boolean;
        nodeIP?: string;
        isLighthouse?: boolean;
    }> {
        const credentials = await TokenStorage.getCredentials();
        const nebulaStatus = NebulaManager.getStatus();
        
        return {
            isAuthenticated: !!credentials && nebulaStatus.status === 'connected',
            hasCredentials: !!credentials,
            nebulaConnected: nebulaStatus.status === 'connected',
            nodeIP: nebulaStatus.nodeIP,
            isLighthouse: nebulaStatus.nodeIP === '10.42.0.1'
        };
    }

    /**
     * Manually trigger reconnection to Nebula network
     */
    async reconnect(): Promise<void> {
        const credentials = await TokenStorage.getCredentials();
        if (!credentials) {
            throw new Error('No credentials available for reconnection');
        }

        await NebulaManager.initialize();
    }

    // Private helper methods

    private async deriveCredentialsFromQR(qrData: NebulaAuthQRData): Promise<AuthCredentials | null> {
        try {
            // In a real implementation, we would verify the signature and derive the secret
            // For now, we'll use the challenge data to create compatible credentials
            
            const publicKey = Buffer.from(qrData.authPublicKey, 'hex');
            const challenge = Buffer.from(qrData.authChallenge, 'hex');
            const signature = Buffer.from(qrData.authSignature, 'hex');

            // Derive secret from challenge response (simplified)
            // In production, this would use proper cryptographic key derivation
            const derivedSecret = this.deriveSharedSecret(challenge, signature, publicKey);

            return {
                token: `nebula-client-${Date.now()}`,
                secret: derivedSecret
            };

        } catch (error) {
            console.error('Failed to derive credentials from QR:', error);
            return null;
        }
    }

    private deriveSharedSecret(challenge: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): string {
        // Simplified secret derivation - in production this would use proper ECDH or similar
        const combined = new Uint8Array(challenge.length + signature.length + publicKey.length);
        combined.set(challenge, 0);
        combined.set(signature, challenge.length);
        combined.set(publicKey, challenge.length + signature.length);
        
        // Create deterministic secret from combined data
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            hash = ((hash << 5) - hash + combined[i]) & 0xffffffff;
        }
        
        // Convert to hex string of appropriate length
        return Math.abs(hash).toString(16).padStart(8, '0').repeat(8).slice(0, 64);
    }

    /**
     * Create temporary connection for initial handshake (used during pairing)
     */
    private async createTemporaryConnection(lighthouseIP: string): Promise<void> {
        // In a real implementation, this would establish a temporary connection
        // to the lighthouse for the initial certificate exchange
        console.log(`Creating temporary connection to ${lighthouseIP} for pairing`);
    }
}

export const NebulaAuth = new NebulaAuthImpl();