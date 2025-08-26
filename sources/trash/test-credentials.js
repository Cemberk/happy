// Test script to verify credential generation and storage
console.log('=== Happy App Credential Test ===');

// Check what's in localStorage
if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('auth_credentials');
    console.log('Stored credentials:', stored);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            console.log('Parsed credentials:', parsed);
            console.log('Token:', parsed.token);
            console.log('Secret length:', parsed.secret?.length);
        } catch (e) {
            console.log('Failed to parse stored credentials:', e);
        }
    }
} else {
    console.log('localStorage not available');
}

// Test credential generation
function generatePrivacyCredentials() {
    const secretBytes = new Uint8Array(32);
    const secret = btoa(String.fromCharCode(...secretBytes));
    const token = 'nebula-network-token';
    return { token, secret };
}

const testCreds = generatePrivacyCredentials();
console.log('Test credentials:', testCreds);
console.log('Test secret length:', testCreds.secret.length);

// Test validation logic
function isValidCredentials(localCredentials) {
    return localCredentials && 
        localCredentials.secret && 
        localCredentials.token &&
        localCredentials.secret.length < 60 && // Reject the old 64-char hex format
        !localCredentials.secret.match(/^[0-9a-f]{64}$/i) && // Reject pure hex strings
        localCredentials.token === 'nebula-network-token' && // Nebula network token
        !localCredentials.token.startsWith('privacy-local-token-'); // Reject old token format
}

if (typeof localStorage !== 'undefined' && localStorage.getItem('auth_credentials')) {
    const stored = JSON.parse(localStorage.getItem('auth_credentials'));
    console.log('Stored credentials are valid:', isValidCredentials(stored));
}
console.log('Test credentials are valid:', isValidCredentials(testCreds));