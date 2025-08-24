import { MMKV } from 'react-native-mmkv';
import { NebulaManager } from '@/nebula/NebulaManager';

// Separate MMKV instance for server config that persists across logouts
const serverConfigStorage = new MMKV({ id: 'server-config' });

const SERVER_KEY = 'custom-server-url';
const NEBULA_MODE_KEY = 'nebula-mode';

export function getServerUrl(): string {
    // In Nebula mode, return the lighthouse IP instead of a cloud URL
    if (isNebulaMode()) {
        const nebulaStatus = NebulaManager.getStatus();
        if (nebulaStatus.nodeIP) {
            // If we're the lighthouse, use our own IP
            if (nebulaStatus.nodeIP === '10.42.0.1') {
                return 'http://localhost:3005'; // Local relay server
            }
            // Otherwise, connect to the lighthouse
            return 'http://10.42.0.1:3005';
        }
    }
    
    // Fallback to legacy cloud mode (for testing/transition)
    return serverConfigStorage.getString(SERVER_KEY) || 
           process.env.EXPO_PUBLIC_HAPPY_SERVER_URL || 
           'nebula://local'; // Indicate Nebula mode
}

export function setServerUrl(url: string | null): void {
    if (url && url.trim()) {
        // If setting a nebula:// URL, enable Nebula mode
        if (url.startsWith('nebula://')) {
            setNebulaMode(true);
        } else {
            setNebulaMode(false);
            serverConfigStorage.set(SERVER_KEY, url.trim());
        }
    } else {
        serverConfigStorage.delete(SERVER_KEY);
        // Default to Nebula mode
        setNebulaMode(true);
    }
}

export function isUsingCustomServer(): boolean {
    if (isNebulaMode()) {
        return false; // Nebula is the default now
    }
    const defaultUrl = process.env.EXPO_PUBLIC_HAPPY_SERVER_URL || 'nebula://local';
    return getServerUrl() !== defaultUrl;
}

/**
 * Enable or disable Nebula mode
 */
export function setNebulaMode(enabled: boolean): void {
    serverConfigStorage.set(NEBULA_MODE_KEY, enabled);
}

/**
 * Check if Nebula mode is enabled
 */
export function isNebulaMode(): boolean {
    // Default to true (Nebula is the new default)
    return serverConfigStorage.getBoolean(NEBULA_MODE_KEY) ?? true;
}

/**
 * Get the lighthouse IP for Nebula network
 */
export function getLighthouseIP(): string {
    const nebulaStatus = NebulaManager.getStatus();
    if (nebulaStatus.nodeIP === '10.42.0.1') {
        return 'localhost'; // We are the lighthouse
    }
    return '10.42.0.1'; // Default lighthouse IP
}

export function getServerInfo(): { hostname: string; port?: number; isCustom: boolean; isNebula: boolean } {
    const url = getServerUrl();
    const isCustom = isUsingCustomServer();
    const isNebula = isNebulaMode();
    
    if (isNebula) {
        return {
            hostname: getLighthouseIP(),
            port: 3005,
            isCustom: false,
            isNebula: true
        };
    }
    
    try {
        const parsed = new URL(url);
        const port = parsed.port ? parseInt(parsed.port) : undefined;
        return {
            hostname: parsed.hostname,
            port,
            isCustom,
            isNebula: false
        };
    } catch {
        // Fallback if URL parsing fails
        return {
            hostname: url,
            port: undefined,
            isCustom,
            isNebula: false
        };
    }
}

export function validateServerUrl(url: string): { valid: boolean; error?: string } {
    if (!url || !url.trim()) {
        return { valid: false, error: 'Server URL cannot be empty' };
    }
    
    // Allow nebula:// URLs
    if (url.startsWith('nebula://')) {
        return { valid: true };
    }
    
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return { valid: false, error: 'Server URL must use HTTP, HTTPS, or nebula:// protocol' };
        }
        return { valid: true };
    } catch {
        return { valid: false, error: 'Invalid URL format' };
    }
}

/**
 * Get Nebula network status for display
 */
export function getNebulaStatus() {
    if (!isNebulaMode()) {
        return { enabled: false };
    }
    
    const status = NebulaManager.getStatus();
    return {
        enabled: true,
        connected: status.status === 'connected',
        nodeIP: status.nodeIP,
        peers: status.peers,
        isLighthouse: status.nodeIP === '10.42.0.1'
    };
}