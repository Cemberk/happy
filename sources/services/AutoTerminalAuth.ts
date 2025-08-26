import { decodeBase64 } from '@/auth/base64';
import { encryptBox } from '@/encryption/libsodium';
import { authApprove } from '@/auth/authApprove';
import { getServerUrl } from '@/sync/serverConfig';

/**
 * Privacy-first automatic terminal authentication
 * Automatically approves terminal connections without user interaction
 * This simplifies the authentication flow for privacy-focused mesh networks
 */
export class AutoTerminalAuthService {
    private auth: any;
    private isRunning = false;
    private pollInterval: NodeJS.Timeout | null = null;

    constructor(authContext: any) {
        this.auth = authContext;
    }

    /**
     * Start the automatic authentication service
     */
    start() {
        if (this.isRunning || !this.auth?.credentials) return;
        
        console.log('🔒 Privacy mode: Starting automatic terminal authentication service');
        this.isRunning = true;
        
        // Check for pending auth requests immediately, then every 3 seconds
        this.checkPendingRequests();
        this.pollInterval = setInterval(() => {
            this.checkPendingRequests();
        }, 3000);
    }

    /**
     * Stop the service
     */
    stop() {
        if (!this.isRunning) return;
        
        console.log('🔒 Privacy mode: Stopping automatic terminal authentication service');
        this.isRunning = false;
        
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    /**
     * Check for pending authentication requests and auto-approve them
     */
    private async checkPendingRequests() {
        if (!this.auth?.credentials || !this.isRunning) return;

        try {
            // In privacy mode, we only need to run the auth service when there are active CLI requests
            // The authentication requests are now handled at the database level
            // This service is mainly for compatibility - actual auth is handled elsewhere
            
            // Reduced logging to avoid spam
            if (Math.random() < 0.1) { // Only log 10% of the time
                console.log('🔒 Privacy mode: Background auth service active');
            }
            
        } catch (error) {
            // Silently handle errors in background service
            if (Math.random() < 0.1) { // Only log errors occasionally
                console.log('🔒 Privacy mode: Auth service error:', error);
            }
        }
    }

    /**
     * Automatically approve a terminal authentication request
     * This is called when a terminal connection is detected
     */
    async autoApproveTerminalAuth(publicKey: Uint8Array): Promise<boolean> {
        if (!this.auth?.credentials) {
            console.log('🔒 Privacy mode: No credentials available for auto-approval');
            return false;
        }

        try {
            console.log('🔒 Privacy mode: Auto-approving terminal authentication request');
            
            const response = encryptBox(
                decodeBase64(this.auth.credentials.secret, 'base64url'), 
                publicKey
            );
            
            await authApprove(this.auth.credentials.token, publicKey, response);
            console.log('🔒 Privacy mode: Terminal authentication auto-approved successfully');
            return true;
            
        } catch (error) {
            console.error('🔒 Privacy mode: Failed to auto-approve terminal auth:', error);
            return false;
        }
    }
}