import React, { createContext, useContext, ReactNode, useState, useEffect, useRef } from 'react';
import { AutoTerminalAuthService } from '@/services/AutoTerminalAuth';
import { TokenStorage } from '@/auth/tokenStorage';

// Privacy-first local authentication context
// Creates local-only credentials for authentication flows while maintaining privacy
interface AuthCredentials {
    token: string;
    secret: string;
}

interface LocalAuthContextType {
    isAuthenticated: boolean;
    credentials: AuthCredentials | null;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    // Stub methods for compatibility
    setupAsLighthouse: () => Promise<{ qrData: string; credentials: AuthCredentials | null }>;
    joinNetwork: (qrData: string) => Promise<{ success: boolean; error?: string }>;
    generateAddDeviceQR: () => Promise<string>;
    getNebulaStatus: () => Promise<any>;
}

const LocalAuthContext = createContext<LocalAuthContextType | undefined>(undefined);

// Generate Nebula network credentials - no crypto needed
function generatePrivacyCredentials(): AuthCredentials {
    // Minimal secret for compatibility with existing system
    const secretBytes = new Uint8Array(32);
    const secret = btoa(String.fromCharCode(...secretBytes));
    
    // Simple Nebula token - authentication handled by Nebula mesh network
    const token = 'nebula-network-token';
    
    return { token, secret };
}

export function LocalAuthProvider({ children }: { children: ReactNode }) {
    // Privacy mode: Always authenticated locally
    const isAuthenticated = true;
    const [credentials, setCredentials] = useState<AuthCredentials | null>(null);
    const autoAuthService = useRef<AutoTerminalAuthService | null>(null);

    // Initialize local credentials and auto-auth service on mount
    useEffect(() => {
        async function initializeCredentials() {
            // Check if we already have stored privacy credentials
            let localCredentials = await TokenStorage.getCredentials();
            
            // Validate existing credentials - check if secret and token are properly formatted for Nebula
            const isValidCredentials = localCredentials && 
                localCredentials.secret && 
                localCredentials.token &&
                localCredentials.secret.length < 60 && // Reject the old 64-char hex format
                !localCredentials.secret.match(/^[0-9a-f]{64}$/i) && // Reject pure hex strings
                localCredentials.token === 'nebula-network-token' && // Nebula network token
                !localCredentials.token.startsWith('privacy-local-token-'); // Reject old token format
            
            if (!isValidCredentials) {
                // Clear old invalid credentials first
                await TokenStorage.removeCredentials();
                // Generate new privacy credentials if none exist or are invalid
                localCredentials = generatePrivacyCredentials();
                await TokenStorage.setCredentials(localCredentials);
                console.log('🔒 Privacy mode: Invalid credentials cleared, new ones generated and stored');
                console.log('🔒 New secret length:', localCredentials.secret.length);
            } else {
                console.log('🔒 Privacy mode: Using existing stored credentials');
            }
            
            setCredentials(localCredentials);

            // Initialize auto-authentication service for terminal connections
            const authContext = { credentials: localCredentials };
            autoAuthService.current = new AutoTerminalAuthService(authContext);
            autoAuthService.current.start();
        }
        
        initializeCredentials();

        // Cleanup on unmount
        return () => {
            if (autoAuthService.current) {
                autoAuthService.current.stop();
            }
        };
    }, []);

    const login = async () => {
        console.log('🔒 Privacy mode: Local authentication - no external login required');
    };

    const logout = async () => {
        console.log('🔒 Privacy mode: Local logout - no external services to disconnect');
    };

    // Nebula stub methods for compatibility - set up as lighthouse for privacy mode
    const setupAsLighthouse = async () => {
        console.log('🔒 Privacy mode: Setting up mock lighthouse configuration');
        return {
            qrData: 'privacy-mode-local-lighthouse',
            credentials
        };
    };

    const joinNetwork = async (qrData: string) => {
        console.log('🔒 Privacy mode: Network join disabled for local-only operation');
        return { success: false, error: 'Privacy mode: Local-only operation' };
    };

    const generateAddDeviceQR = async () => {
        return 'privacy-mode-local-only';
    };

    const getNebulaStatus = async () => {
        return { status: 'local', mode: 'privacy' };
    };

    const value: LocalAuthContextType = {
        isAuthenticated,
        credentials,
        login,
        logout,
        setupAsLighthouse,
        joinNetwork,
        generateAddDeviceQR,
        getNebulaStatus
    };

    return (
        <LocalAuthContext.Provider value={value}>
            {children}
        </LocalAuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(LocalAuthContext);
    if (!context) {
        throw new Error('useAuth must be used within a LocalAuthProvider');
    }
    return context;
}

// Export for compatibility
export const AuthProvider = LocalAuthProvider;