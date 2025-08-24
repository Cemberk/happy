import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TokenStorage, AuthCredentials } from '@/auth/tokenStorage';
import { syncCreate } from '@/sync/sync';
import * as Updates from 'expo-updates';
import { clearPersistence } from '@/sync/persistence';
import { Platform } from 'react-native';
import { trackLogout } from '@/track';
import { NebulaAuth } from '@/nebula/NebulaAuth';
import { isNebulaMode } from '@/sync/serverConfig';

interface AuthContextType {
    isAuthenticated: boolean;
    credentials: AuthCredentials | null;
    login: (token: string, secret: string) => Promise<void>;
    logout: () => Promise<void>;
    // Nebula-specific methods
    setupAsLighthouse: () => Promise<{ qrData: string; credentials: AuthCredentials }>;
    joinNetwork: (qrData: string) => Promise<{ success: boolean; error?: string }>;
    generateAddDeviceQR: () => Promise<string>;
    getNebulaStatus: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, initialCredentials }: { children: ReactNode; initialCredentials: AuthCredentials | null }) {
    const [isAuthenticated, setIsAuthenticated] = useState(!!initialCredentials);
    const [credentials, setCredentials] = useState<AuthCredentials | null>(initialCredentials);

    const login = async (token: string, secret: string) => {
        const newCredentials: AuthCredentials = { token, secret };
        const success = await TokenStorage.setCredentials(newCredentials);
        if (success) {
            await syncCreate(newCredentials);
            setCredentials(newCredentials);
            setIsAuthenticated(true);
        } else {
            throw new Error('Failed to save credentials');
        }
    };

    const logout = async () => {
        trackLogout();
        clearPersistence();
        
        // Use Nebula auth logout if in Nebula mode
        if (isNebulaMode()) {
            await NebulaAuth.logout();
        } else {
            await TokenStorage.removeCredentials();
        }
        
        // Update React state to ensure UI consistency
        setCredentials(null);
        setIsAuthenticated(false);
        
        if (Platform.OS === 'web') {
            window.location.reload();
        } else {
            try {
                await Updates.reloadAsync();
            } catch (error) {
                // In dev mode, reloadAsync will throw ERR_UPDATES_DISABLED
                console.log('Reload failed (expected in dev mode):', error);
            }
        }
    };

    // Nebula-specific methods
    const setupAsLighthouse = async () => {
        const result = await NebulaAuth.setupAsLighthouse();
        setCredentials(result.credentials);
        setIsAuthenticated(true);
        await syncCreate(result.credentials);
        return result;
    };

    const joinNetwork = async (qrData: string) => {
        const result = await NebulaAuth.joinNetwork(qrData);
        if (result.success && result.credentials) {
            setCredentials(result.credentials);
            setIsAuthenticated(true);
            await syncCreate(result.credentials);
        }
        return result;
    };

    const generateAddDeviceQR = async () => {
        return await NebulaAuth.generateAddDeviceQR();
    };

    const getNebulaStatus = async () => {
        return await NebulaAuth.getAuthStatus();
    };

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                credentials,
                login,
                logout,
                setupAsLighthouse,
                joinNetwork,
                generateAddDeviceQR,
                getNebulaStatus,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}