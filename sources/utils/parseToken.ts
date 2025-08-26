import { decodeBase64 } from "@/auth/base64";
import { decodeUTF8, encodeUTF8 } from "@/encryption/text";

export function parseToken(token: string) {
    // Handle Nebula network token for privacy-first mode
    if (token === 'nebula-network-token') {
        return 'nebula-user'; // Single user privacy-first system
    }
    
    // Handle regular JWT tokens
    const parts = token.split('.');
    if (parts.length !== 3) {
        throw new Error('Invalid token format');
    }
    
    const [header, payload, signature] = parts;
    const sub = JSON.parse(decodeUTF8(decodeBase64(payload))).sub;
    if (typeof sub !== 'string') {
        throw new Error('Invalid token');
    }
    return sub;
}