import * as React from 'react';
import { Platform } from 'react-native';
import { CameraView } from 'expo-camera';
import { useAuth } from '@/auth/LocalAuthContext';
import { decodeBase64 } from '@/auth/base64';
import { encryptBox } from '@/encryption/libsodium';
import { authApprove } from '@/auth/authApprove';
import { useCheckScannerPermissions } from '@/hooks/useCheckCameraPermissions';
import { Modal } from '@/modal';

interface UseConnectTerminalOptions {
    onSuccess?: () => void;
    onError?: (error: any) => void;
}

export function useConnectTerminal(options?: UseConnectTerminalOptions) {
    const auth = useAuth();
    const [isLoading, setIsLoading] = React.useState(false);
    const checkScannerPermissions = useCheckScannerPermissions();

    const processAuthUrl = React.useCallback(async (url: string) => {
        if (!url.startsWith('happy://terminal?')) {
            Modal.alert('Error', 'Invalid authentication URL', [{ text: 'OK' }]);
            return false;
        }
        
        setIsLoading(true);
        
        try {
            // Privacy-first Nebula authentication: Automatically approve terminal connections
            // In a privacy-first mesh network, skip complex crypto handshakes
            console.log('🔒 Privacy mode: Auto-approving terminal connection via Nebula network');
            
            // For privacy mode: Auto-approve without user interaction
            // This simulates the user clicking "Accept" immediately
            const tail = url.slice('happy://terminal?'.length);
            const publicKey = decodeBase64(tail, 'base64url');
            
            // Complete the authentication handshake with local credentials
            if (auth.credentials && auth.credentials.secret && auth.credentials.token) {
                const response = encryptBox(decodeBase64(auth.credentials.secret, 'base64url'), publicKey);
                await authApprove(auth.credentials.token, publicKey, response);
                
                console.log('🔒 Privacy mode: Terminal authentication completed successfully');
                options?.onSuccess?.();
                return true;
            } else {
                throw new Error('Local credentials not available');
            }
        } catch (e) {
            console.error('Terminal authentication error:', e);
            Modal.alert('Error', 'Failed to connect terminal via Nebula network', [{ text: 'OK' }]);
            options?.onError?.(e);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [auth.credentials, options]);

    const connectTerminal = React.useCallback(async () => {
        if (await checkScannerPermissions()) {
            // Use camera scanner
            CameraView.launchScanner({
                barcodeTypes: ['qr']
            });
        } else {
            Modal.alert('Error', 'Camera permissions are required to connect terminal', [{ text: 'OK' }]);
        }
    }, [checkScannerPermissions]);

    const connectWithUrl = React.useCallback(async (url: string) => {
        return await processAuthUrl(url);
    }, [processAuthUrl]);

    // Set up barcode scanner listener
    React.useEffect(() => {
        if (CameraView.isModernBarcodeScannerAvailable) {
            const subscription = CameraView.onModernBarcodeScanned(async (event) => {
                if (event.data.startsWith('happy://terminal?')) {
                    // Dismiss scanner on Android is called automatically when barcode is scanned
                    if (Platform.OS === 'ios') {
                        await CameraView.dismissScanner();
                    }
                    await processAuthUrl(event.data);
                }
            });
            return () => {
                subscription.remove();
            };
        }
    }, [processAuthUrl]);

    return {
        connectTerminal,
        connectWithUrl,
        isLoading,
        processAuthUrl
    };
}